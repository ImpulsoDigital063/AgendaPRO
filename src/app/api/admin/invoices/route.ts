import { resolveBusinessIdOperacao } from '@/lib/api-business-access'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// POST /api/admin/invoices
// Cria comanda fechando atendimentos + vendas de produto avulsas.
//
// Body: {
//   customerId?: string,
//   appointmentIds?: string[],
//   productSales?: [{ product_id, quantity, unit_price, professional_id?, product_name? }],
//   notes?: string,
//   payment?: {
//     method: 'cash'|'pix'|'card'|'courtesy'|'points',
//     device_id?, card_brand?, card_type?, installments?, fee_percent?
//   }
// }
//
// Tem que ter ao menos 1 item (appointment ou productSale). Se payment vier,
// fecha a comanda como paga · senão fica 'open'.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: ownerBusiness } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  // v98k · dono, recepção OU profissional (esta só com a flag de equipe ligada)
  const businessId = ownerBusiness?.id ?? (await resolveBusinessIdOperacao(supabase))
  if (!businessId) return NextResponse.json({ error: 'no_business' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  const appointmentIds: string[] = Array.isArray(body.appointmentIds) ? body.appointmentIds.filter((x: unknown) => typeof x === 'string') : []
  type ProductSaleIn = { product_id: string; quantity: number; unit_price: number; professional_id?: string | null; product_name?: string | null }
  const productSales: ProductSaleIn[] = Array.isArray(body.productSales)
    ? body.productSales.filter((p: ProductSaleIn) =>
        typeof p?.product_id === 'string'
        && Number(p?.quantity) > 0
        && Number(p?.unit_price) >= 0,
      )
    : []

  // Serviços EXTRA adicionados no faturamento (cliente fez serviço a mais na
  // hora · Olímpio 06/06). Replica a cascata proven do /[id]/items modo
  // serviço: cria appointment completed no horário ATUAL (sem overlap com o
  // corte original) + invoice_item. Comissão flui (appointment pago).
  type ExtraServiceIn = { service_id: string; quantity?: number; unit_price?: number; professional_id?: string | null }
  const extraServices: ExtraServiceIn[] = Array.isArray(body.extraServices)
    ? body.extraServices.filter((s: ExtraServiceIn) => typeof s?.service_id === 'string' && Number(s?.unit_price ?? 0) >= 0)
    : []

  if (appointmentIds.length === 0 && productSales.length === 0 && extraServices.length === 0) {
    return NextResponse.json({ error: 'no_items' }, { status: 400 })
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // 1. Atendimentos · valida pertencimento e estado
  let appts: { id: string; business_id: string; client_name: string | null; service_name: string | null; total_price: number | null; invoice_item_id: string | null; status: string; professional_id: string | null; customer_id: string | null }[] = []
  if (appointmentIds.length > 0) {
    const { data, error } = await admin
      .from('appointments')
      .select('id, business_id, client_name, service_name, total_price, invoice_item_id, status, professional_id, customer_id')
      .in('id', appointmentIds)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) return NextResponse.json({ error: 'no_appointments' }, { status: 404 })

    const invalid = data.find((a) => a.business_id !== businessId || a.status === 'cancelled')
    if (invalid) {
      return NextResponse.json(
        { error: 'invalid_appointment', appointment_id: invalid.id, reason: invalid.business_id !== businessId ? 'wrong_business' : 'cancelled' },
        { status: 400 },
      )
    }
    // Bloqueia faturar appointment que já está pago (invoice fechada)
    appts = data
  }

  // 2. Valida produtos · todos do mesmo business + busca nome/commission snapshot
  let prodMap: Record<string, { id: string; business_id: string; name: string; track_stock: boolean | null; quantity: number | null; commission_type: string | null; commission_value: number | null }> = {}
  if (productSales.length > 0) {
    const ids = Array.from(new Set(productSales.map((p) => p.product_id)))
    const { data: prods, error: pErr } = await admin
      .from('products')
      .select('id, business_id, name, track_stock, quantity, commission_type, commission_value')
      .in('id', ids)
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
    if (!prods || prods.length !== ids.length) {
      return NextResponse.json({ error: 'product_not_found' }, { status: 404 })
    }
    const wrong = prods.find((p) => p.business_id !== businessId)
    if (wrong) return NextResponse.json({ error: 'product_wrong_business', product_id: wrong.id }, { status: 403 })

    // Valida estoque pra produtos com track_stock
    for (const s of productSales) {
      const p = prods.find((x) => x.id === s.product_id)!
      if (p.track_stock && Number(p.quantity ?? 0) < s.quantity) {
        return NextResponse.json({ error: 'insufficient_stock', product_id: p.id, available: p.quantity, requested: s.quantity }, { status: 400 })
      }
    }
    prodMap = Object.fromEntries(prods.map((p) => [p.id, p]))
  }

  // 2b. Valida serviços extra · todos do mesmo business + snapshot nome/duração
  let svcMap: Record<string, { id: string; business_id: string; name: string; price: number | null; duration_minutes: number | null }> = {}
  if (extraServices.length > 0) {
    const sids = Array.from(new Set(extraServices.map((s) => s.service_id)))
    const { data: svcs, error: svcErr } = await admin
      .from('services')
      .select('id, business_id, name, price, duration_minutes')
      .in('id', sids)
    if (svcErr) return NextResponse.json({ error: svcErr.message }, { status: 500 })
    if (!svcs || svcs.length !== sids.length) return NextResponse.json({ error: 'service_not_found' }, { status: 404 })
    const wrongSvc = svcs.find((s) => s.business_id !== businessId)
    if (wrongSvc) return NextResponse.json({ error: 'service_wrong_business', service_id: wrongSvc.id }, { status: 403 })
    svcMap = Object.fromEntries(svcs.map((s) => [s.id, s]))
  }

  // 3. Totais
  const subtotalAppts = appts.reduce((s, a) => s + Number(a.total_price ?? 0), 0)
  const subtotalProds = productSales.reduce((s, p) => s + p.quantity * p.unit_price, 0)
  const subtotalExtraSvcs = extraServices.reduce((s, e) => s + Math.max(1, Number(e.quantity ?? 1)) * Number(e.unit_price ?? svcMap[e.service_id]?.price ?? 0), 0)
  const subtotal = subtotalAppts + subtotalProds + subtotalExtraSvcs
  const total = subtotal
  const customerId = body.customerId ?? appts[0]?.customer_id ?? null

  // Validar pagamento (se vier)
  type PaymentIn = { method: 'cash'|'pix'|'card'|'courtesy'|'points'; device_id?: string|null; card_brand?: string|null; card_type?: string|null; installments?: number|null; fee_percent?: number|null }
  const payment: PaymentIn | null = body.payment && ['cash','pix','card','courtesy','points'].includes(body.payment.method)
    ? body.payment
    : null
  const willClose = payment !== null

  const nowIso = new Date().toISOString()

  // 4. UPSERT da invoice:
  //    a) Se appointment já tem invoice_item_id (trigger v70 auto-criou),
  //       reusa a invoice existente · faz UPDATE no estado dela.
  //    b) Senão (cenário legado: dados antes do trigger), cria nova invoice.
  const apptWithExistingItem = appts.find((a) => a.invoice_item_id)
  let invoice: { id: string; invoice_number: number } | null = null
  let insertedApptItems: { id: string; reference_id: string }[] = []
  let isExistingInvoice = false

  if (apptWithExistingItem) {
    // Caminho A · reusa invoice da auto-criação
    const { data: existingItem } = await admin
      .from('invoice_items')
      .select('id, invoice_id, invoice:invoices(id, invoice_number, status, business_id)')
      .eq('id', apptWithExistingItem.invoice_item_id!)
      .maybeSingle()
    const inv = existingItem?.invoice as { id: string; invoice_number: number; status: string; business_id: string } | { id: string; invoice_number: number; status: string; business_id: string }[] | null
    const invObj = Array.isArray(inv) ? inv[0] : inv
    if (!invObj || invObj.business_id !== businessId) {
      return NextResponse.json({ error: 'invoice_not_accessible' }, { status: 403 })
    }
    if (invObj.status === 'cancelled') {
      return NextResponse.json({ error: 'invoice_cancelled', detail: 'Comanda foi cancelada · crie novo atendimento.' }, { status: 400 })
    }
    if (invObj.status === 'closed') {
      return NextResponse.json({ error: 'invoice_already_paid', detail: 'Esse atendimento já foi pago.' }, { status: 400 })
    }
    invoice = { id: invObj.id, invoice_number: invObj.invoice_number }
    isExistingInvoice = true
    // appointments já estão linkados aos invoice_items (trigger fez)
    // só precisamos saber os invoice_item_ids deles
    const allApptInvoiceItemIds = appts.map((a) => a.invoice_item_id).filter(Boolean) as string[]
    if (allApptInvoiceItemIds.length > 0) {
      const { data: linkedItems } = await admin
        .from('invoice_items')
        .select('id, reference_id')
        .in('id', allApptInvoiceItemIds)
      insertedApptItems = (linkedItems ?? []) as { id: string; reference_id: string }[]
    }
  } else {
    // Caminho B · cria nova invoice (legado · sem trigger)
    const { data: nextNumData, error: nextNumErr } = await admin.rpc('next_invoice_number', { p_business_id: businessId })
    if (nextNumErr) return NextResponse.json({ error: nextNumErr.message }, { status: 500 })
    const invoiceNumber = nextNumData as number
    const { data: created, error: invErr } = await admin
      .from('invoices')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        invoice_number: invoiceNumber,
        status: 'open', // será fechada no fim se willClose
        subtotal,
        discount: 0,
        total,
        notes: body.notes ?? null,
      })
      .select('id, invoice_number')
      .single()
    if (invErr || !created) return NextResponse.json({ error: invErr?.message ?? 'invoice_creation_failed' }, { status: 500 })
    invoice = created

    // Cria invoice_items pra appointments
    const apptItems = appts.map((a) => ({
      invoice_id: invoice!.id,
      item_type: 'appointment' as const,
      reference_id: a.id,
      description: a.service_name ?? 'Atendimento',
      professional_id: a.professional_id,
      quantity: 1,
      unit_price: Number(a.total_price ?? 0),
      discount: 0,
      total: Number(a.total_price ?? 0),
    }))
    if (apptItems.length > 0) {
      const { data, error } = await admin.from('invoice_items').insert(apptItems).select('id, reference_id')
      if (error || !data) {
        await admin.from('invoices').delete().eq('id', invoice.id)
        return NextResponse.json({ error: error?.message ?? 'items_creation_failed' }, { status: 500 })
      }
      insertedApptItems = data as { id: string; reference_id: string }[]
    }
  }

  if (!invoice) return NextResponse.json({ error: 'invoice_creation_failed' }, { status: 500 })

  // helper: rollback parcial (só apaga invoice se foi criada agora)
  const rollback = async () => {
    if (!isExistingInvoice && invoice) await admin.from('invoices').delete().eq('id', invoice.id)
  }

  // 7. Pra cada productSale: cria sales + sale_items (trigger baixa estoque) + invoice_item
  for (const ps of productSales) {
    const p = prodMap[ps.product_id]
    const productName = ps.product_name ?? p.name
    const lineTotal = ps.quantity * ps.unit_price

    // sales row (type=product_sale, vinculada à comanda)
    const { data: saleRow, error: sErr } = await admin
      .from('sales')
      .insert({
        business_id: businessId,
        type: 'product_sale',
        customer_id: customerId,
        client_name: appts[0]?.client_name ?? 'Cliente',
        professional_id: ps.professional_id ?? null,
        sale_date: nowIso.slice(0, 10),
        total: lineTotal,
        discount: 0,
        status: willClose ? 'paid' : 'pending',
        paid_at: willClose ? nowIso : null,
        payment_method: willClose ? payment!.method : null,
        invoice_id: invoice.id,
        appointment_id: appts[0]?.id ?? null,
        created_by: user.id,
      })
      .select('id')
      .single()
    if (sErr || !saleRow) { await rollback(); return NextResponse.json({ error: sErr?.message ?? 'sale_creation_failed' }, { status: 500 }) }

    // sale_items (dispara trigger v66 → baixa estoque)
    const { error: siErr } = await admin
      .from('sale_items')
      .insert({
        sale_id: saleRow.id,
        product_id: ps.product_id,
        product_name: productName,
        quantity: ps.quantity,
        unit_price: ps.unit_price,
        discount: 0,
        commission_type: p.commission_type,
        commission_value: p.commission_value,
      })
    if (siErr) { await rollback(); return NextResponse.json({ error: siErr.message }, { status: 500 }) }

    // invoice_item (item_type=product, reference_id=sale.id)
    const { error: iiErr } = await admin
      .from('invoice_items')
      .insert({
        invoice_id: invoice.id,
        item_type: 'product',
        reference_id: saleRow.id,
        description: productName,
        professional_id: ps.professional_id ?? null,
        quantity: ps.quantity,
        unit_price: ps.unit_price,
        discount: 0,
        total: lineTotal,
      })
    if (iiErr) { await rollback(); return NextResponse.json({ error: iiErr.message }, { status: 500 }) }
  }

  // 7b. Serviços EXTRA · cria appointment completed (horário ATUAL, sem overlap)
  // + invoice_item type appointment. Pago se a comanda fechar (entra na comissão).
  for (const es of extraServices) {
    const svc = svcMap[es.service_id]
    const qty = Math.max(1, Number(es.quantity ?? 1))
    const unitPrice = Number(es.unit_price ?? svc.price ?? 0)
    const lineTotal = qty * unitPrice
    const now = new Date()
    const sH = String(now.getHours()).padStart(2, '0')
    const sM = String(now.getMinutes()).padStart(2, '0')
    const dur = Number(svc.duration_minutes ?? 30)
    const end = new Date(now.getTime() + dur * 60000)
    const eH = String(end.getHours()).padStart(2, '0')
    const eM = String(end.getMinutes()).padStart(2, '0')
    const svcProfId = es.professional_id ?? appts[0]?.professional_id ?? null

    const { data: exAppt, error: exErr } = await admin
      .from('appointments')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        client_name: appts[0]?.client_name ?? 'Cliente',
        client_phone: '', // NOT NULL
        professional_id: svcProfId,
        service_id: svc.id,
        service_name: svc.name,
        appointment_date: nowIso.slice(0, 10),
        start_time: `${sH}:${sM}:00`,
        end_time: `${eH}:${eM}:00`,
        status: 'completed',
        total_price: lineTotal,
        paid_at: willClose ? nowIso : null,
        payment_method: willClose ? payment!.method : null,
      })
      .select('id')
      .single()
    if (exErr || !exAppt) { await rollback(); return NextResponse.json({ error: `extra_service_failed: ${exErr?.message}` }, { status: 500 }) }

    const { data: exItem, error: exItemErr } = await admin
      .from('invoice_items')
      .insert({
        invoice_id: invoice.id,
        item_type: 'appointment',
        reference_id: exAppt.id,
        description: svc.name,
        professional_id: svcProfId,
        quantity: qty,
        unit_price: unitPrice,
        discount: 0,
        total: lineTotal,
      })
      .select('id')
      .single()
    if (exItemErr || !exItem) { await rollback(); return NextResponse.json({ error: `extra_service_item_failed: ${exItemErr?.message}` }, { status: 500 }) }
    await admin.from('appointments').update({ invoice_item_id: exItem.id }).eq('id', exAppt.id)
  }

  // 8. Atualiza appointments (status=completed + paid_at se fechou)
  // No caminho A (invoice existente), invoice_item_id já está setado.
  // No caminho B (legado), precisamos setar agora.
  if (insertedApptItems.length > 0) {
    await Promise.all(insertedApptItems.map((item) =>
      admin
        .from('appointments')
        .update({
          ...(isExistingInvoice ? {} : { invoice_item_id: item.id }),
          status: willClose ? 'completed' : 'confirmed',
          paid_at: willClose ? nowIso : null,
          payment_method: willClose ? payment!.method : null,
        })
        .eq('id', item.reference_id),
    ))
  }

  // 9. Total autoritativo = soma de TODOS os invoice_items da comanda.
  // BUG do combo (corrigido aqui): no Caminho A a comanda JÁ existia com o
  // produto do combo dentro (serviço + material = R$290). O `total` derivado do
  // request cobre só os itens NOVOS que o modal manda (o serviço, R$195); o
  // produto do combo não vem no productSales porque já está na comanda. Pagar
  // por esse `total` cobrava a comanda curta (R$195 num combo de R$290) e a
  // etapa 9b logo abaixo "consertava" o invoices.total pra 290 — mascarando o
  // furo. O valor pago tem que bater com a comanda inteira, então lemos os itens
  // ANTES de inserir o pagamento e reusamos a mesma leitura na recalc (9b).
  const { data: allItems } = await admin
    .from('invoice_items')
    .select('total, discount')
    .eq('invoice_id', invoice.id)
  const itemsSubtotal = (allItems ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0)
  const itemsDiscount = (allItems ?? []).reduce((s, r) => s + Number(r.discount ?? 0), 0)
  // Fallback defensivo: se a leitura vier vazia (não deveria), cai no total do request.
  const payableTotal = (allItems && allItems.length > 0) ? itemsSubtotal : total

  // invoice_payments (se pagou) · amount = comanda inteira, nunca só os itens do request
  if (payment) {
    const { error: payErr } = await admin
      .from('invoice_payments')
      .insert({
        invoice_id: invoice.id,
        payment_method: payment.method,
        amount: payableTotal,
        device_id: payment.device_id ?? null,
        card_brand: payment.card_brand ?? null,
        card_type: payment.card_type ?? null,
        installments: payment.installments ?? 1,
        fee_percent: payment.fee_percent ?? 0,
        paid_at: nowIso,
      })
    if (payErr) { await rollback(); return NextResponse.json({ error: payErr.message }, { status: 500 }) }
  }

  // 9b. Recalcula subtotal/total da invoice (reusa allItems lido acima)
  if (isExistingInvoice || productSales.length > 0 || extraServices.length > 0) {
    await admin
      .from('invoices')
      .update({
        subtotal: itemsSubtotal + itemsDiscount,
        discount: itemsDiscount,
        total: itemsSubtotal,
        status: willClose ? 'closed' : 'open',
        closed_at: willClose ? nowIso : null,
        customer_id: customerId,
        notes: body.notes ?? null,
      })
      .eq('id', invoice.id)
  } else if (willClose) {
    // Caminho B sem productSales · só fechar
    await admin
      .from('invoices')
      .update({ status: 'closed', closed_at: nowIso })
      .eq('id', invoice.id)
  }

  // 10. Read-after-write: confere invoice criada
  const { data: confirm } = await admin
    .from('invoices')
    .select('id, invoice_number, status, total')
    .eq('id', invoice.id)
    .maybeSingle()

  if (!confirm) {
    return NextResponse.json({ error: 'persistence_check_failed' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    invoice: {
      id: confirm.id,
      invoice_number: confirm.invoice_number,
      status: confirm.status,
      total: confirm.total,
      items_count: insertedApptItems.length + productSales.length + extraServices.length,
    },
  })
}

// GET /api/admin/invoices · lista comandas do business (filtros: status, search, limit)
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: ownerBusiness } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  // v98k · mesma regra da criação (dono, recepção ou profissional com flag)
  const businessId = ownerBusiness?.id ?? (await resolveBusinessIdOperacao(supabase))
  if (!businessId) return NextResponse.json({ error: 'no_business' }, { status: 403 })

  const url = new URL(request.url)
  const status = url.searchParams.get('status') // open | closed | cancelled | null=all
  const search = url.searchParams.get('search')?.trim() ?? ''
  const limitRaw = Number(url.searchParams.get('limit') ?? 200)
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 500 ? limitRaw : 200

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  let q = admin
    .from('invoices')
    .select(`
      id,
      invoice_number,
      status,
      subtotal,
      discount,
      total,
      created_at,
      closed_at,
      customer:customers(id, name, phone),
      items_count:invoice_items(count)
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status && ['open', 'closed', 'cancelled'].includes(status)) {
    q = q.eq('status', status)
  }

  if (search) {
    const asNum = Number(search)
    if (Number.isFinite(asNum)) {
      q = q.eq('invoice_number', asNum)
    } else {
      // search por nome de cliente · nested filter
      q = q.ilike('customer.name', `%${search}%`)
    }
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invoices: data ?? [] })
}
