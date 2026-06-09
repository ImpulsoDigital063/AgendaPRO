import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * POST /api/admin/invoices/[id]/items
 *
 * Adiciona um ITEM a uma comanda EXISTENTE (status=open). Aceita 2 modos:
 *
 * MODO PRODUTO:
 *   Body: { product_id, quantity, unit_price, professional_id? }
 *   Cascata:
 *    1. Cria sales (type=product_sale, invoice_id, status=pending)
 *    2. Cria sale_items (trigger v66 baixa estoque)
 *    3. Cria invoice_item (item_type=product, reference_id=sale.id)
 *
 * MODO SERVIÇO EXTRA:
 *   Body: { service_id, quantity?=1, unit_price?, professional_id?, customer_id? }
 *   Cascata:
 *    1. Cria appointment STATUS=completed (start_time=now) · trigger v71 NÃO dispara
 *    2. Cria invoice_item (item_type=appointment, reference_id=appointment.id)
 *    3. Atualiza appointment.invoice_item_id pro novo invoice_item
 *
 * Em ambos os modos recalcula subtotal/total da invoice no final.
 * Bloqueia se comanda está closed/cancelled.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Resolve businessId
  const { data: ownerBusiness } = await supabase
    .from('businesses').select('id').eq('owner_id', user.id).maybeSingle()
  let businessId = ownerBusiness?.id ?? null
  if (!businessId) {
    const { data: prof } = await supabase
      .from('professionals')
      .select('business_id')
      .eq('auth_user_id', user.id)
      .eq('active', true)
      .eq('is_receptionist', true)
      .maybeSingle()
    businessId = prof?.business_id ?? null
  }
  if (!businessId) return NextResponse.json({ error: 'no_business' }, { status: 403 })

  const { id: invoiceId } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  const product_id: string | null = typeof body.product_id === 'string' && body.product_id ? body.product_id : null
  const service_id: string | null = typeof body.service_id === 'string' && body.service_id ? body.service_id : null
  const quantity = Number(body.quantity ?? 1)
  const unit_price_raw = body.unit_price
  const professional_id: string | null = typeof body.professional_id === 'string' && body.professional_id ? body.professional_id : null

  if (!product_id && !service_id) {
    return NextResponse.json({ error: 'product_id OU service_id obrigatório' }, { status: 400 })
  }
  if (product_id && service_id) {
    return NextResponse.json({ error: 'product_id E service_id não podem vir juntos' }, { status: 400 })
  }
  if (!(quantity > 0)) {
    return NextResponse.json({ error: 'quantity > 0 obrigatório' }, { status: 400 })
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Valida invoice
  const { data: invoice } = await admin
    .from('invoices')
    .select('id, business_id, status, customer_id')
    .eq('id', invoiceId)
    .maybeSingle()
  if (!invoice) return NextResponse.json({ error: 'invoice_not_found' }, { status: 404 })
  if (invoice.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (invoice.status !== 'open') {
    return NextResponse.json({ error: 'invoice_not_open', detail: 'Só comandas abertas aceitam novos itens.' }, { status: 400 })
  }

  const nowIso = new Date().toISOString()
  let lineTotal = 0
  let unit_price = 0

  if (product_id) {
    // ─── MODO PRODUTO ──────────────────────────────────────────────
    unit_price = Number(unit_price_raw ?? 0)
    if (!(unit_price >= 0)) {
      return NextResponse.json({ error: 'unit_price >= 0 obrigatório' }, { status: 400 })
    }

    const { data: product } = await admin
      .from('products')
      .select('id, business_id, name, track_stock, quantity, commission_type, commission_value')
      .eq('id', product_id)
      .maybeSingle()
    if (!product || product.business_id !== businessId) {
      return NextResponse.json({ error: 'product_not_found' }, { status: 404 })
    }
    if (product.track_stock && Number(product.quantity ?? 0) < quantity) {
      return NextResponse.json({ error: 'insufficient_stock', available: product.quantity, requested: quantity }, { status: 400 })
    }

    lineTotal = quantity * unit_price

    // Nome do cliente pra denormalizar na venda (é o que a lista de Vendas mostra
    // na coluna CLIENTE). Antes cravava 'Comanda aberta' — virava placeholder
    // confuso numa comanda já paga (Eduardo 09/06). Resolve o cliente da comanda;
    // se for avulso (sem customer_id), pega o nome do atendimento da própria comanda.
    let clientName = 'Cliente'
    if (invoice.customer_id) {
      const { data: cust } = await admin
        .from('customers').select('name').eq('id', invoice.customer_id).maybeSingle()
      if (cust?.name) clientName = cust.name
    } else {
      const { data: apptItem } = await admin
        .from('invoice_items').select('reference_id')
        .eq('invoice_id', invoiceId).eq('item_type', 'appointment').limit(1).maybeSingle()
      if (apptItem?.reference_id) {
        const { data: appt } = await admin
          .from('appointments').select('client_name').eq('id', apptItem.reference_id).maybeSingle()
        if (appt?.client_name) clientName = appt.client_name
      }
    }

    const { data: sale, error: saleErr } = await admin
      .from('sales')
      .insert({
        business_id: businessId,
        type: 'product_sale',
        customer_id: invoice.customer_id,
        client_name: clientName,
        professional_id,
        sale_date: nowIso.slice(0, 10),
        total: lineTotal,
        discount: 0,
        status: 'pending',
        invoice_id: invoiceId,
        created_by: user.id,
      })
      .select('id')
      .single()
    if (saleErr || !sale) return NextResponse.json({ error: `sale_creation_failed: ${saleErr?.message}` }, { status: 500 })

    const { error: siErr } = await admin
      .from('sale_items')
      .insert({
        sale_id: sale.id,
        product_id,
        product_name: product.name,
        quantity,
        unit_price,
        discount: 0,
        commission_type: product.commission_type,
        commission_value: product.commission_value,
      })
    if (siErr) {
      await admin.from('sales').delete().eq('id', sale.id)
      return NextResponse.json({ error: `sale_item_creation_failed: ${siErr.message}` }, { status: 500 })
    }

    const { error: iiErr } = await admin
      .from('invoice_items')
      .insert({
        invoice_id: invoiceId,
        item_type: 'product',
        reference_id: sale.id,
        description: product.name,
        professional_id,
        quantity,
        unit_price,
        discount: 0,
        total: lineTotal,
      })
    if (iiErr) {
      await admin.from('sales').delete().eq('id', sale.id)
      return NextResponse.json({ error: `invoice_item_creation_failed: ${iiErr.message}` }, { status: 500 })
    }
  } else {
    // ─── MODO SERVIÇO EXTRA ────────────────────────────────────────
    const { data: service } = await admin
      .from('services')
      .select('id, business_id, name, price, duration_minutes')
      .eq('id', service_id!)
      .maybeSingle()
    if (!service || service.business_id !== businessId) {
      return NextResponse.json({ error: 'service_not_found' }, { status: 404 })
    }

    unit_price = Number(unit_price_raw ?? service.price ?? 0)
    if (!(unit_price >= 0)) {
      return NextResponse.json({ error: 'unit_price >= 0 obrigatório' }, { status: 400 })
    }
    lineTotal = quantity * unit_price

    // Cria appointment com status=completed (já aconteceu · trigger v71 não dispara)
    const now = new Date()
    const startHH = String(now.getHours()).padStart(2, '0')
    const startMM = String(now.getMinutes()).padStart(2, '0')
    const start_time = `${startHH}:${startMM}:00`
    const duration = Number(service.duration_minutes ?? 30)
    const end = new Date(now.getTime() + duration * 60000)
    const endHH = String(end.getHours()).padStart(2, '0')
    const endMM = String(end.getMinutes()).padStart(2, '0')
    const end_time = `${endHH}:${endMM}:00`

    // Customer_name + phone: busca do customer (client_phone é NOT NULL no schema)
    let clientName = 'Cliente'
    let clientPhone = ''
    if (invoice.customer_id) {
      const { data: cust } = await admin
        .from('customers').select('name, phone').eq('id', invoice.customer_id).maybeSingle()
      if (cust?.name) clientName = cust.name
      if (cust?.phone) clientPhone = cust.phone
    }

    const { data: appt, error: apptErr } = await admin
      .from('appointments')
      .insert({
        business_id: businessId,
        customer_id: invoice.customer_id,
        client_name: clientName,
        client_phone: clientPhone, // NOT NULL · string vazia se sem telefone
        professional_id,
        service_id: service.id,
        service_name: service.name,
        appointment_date: nowIso.slice(0, 10),
        start_time,
        end_time,
        status: 'completed', // já aconteceu · trigger v71 NÃO cria nova invoice
        total_price: lineTotal,
      })
      .select('id')
      .single()
    if (apptErr || !appt) return NextResponse.json({ error: `appointment_creation_failed: ${apptErr?.message}` }, { status: 500 })

    // Cria invoice_item apontando pro novo appointment
    const { data: newItem, error: iiErr } = await admin
      .from('invoice_items')
      .insert({
        invoice_id: invoiceId,
        item_type: 'appointment',
        reference_id: appt.id,
        description: service.name,
        professional_id,
        quantity,
        unit_price,
        discount: 0,
        total: lineTotal,
      })
      .select('id')
      .single()
    if (iiErr || !newItem) {
      await admin.from('appointments').delete().eq('id', appt.id)
      return NextResponse.json({ error: `invoice_item_creation_failed: ${iiErr?.message}` }, { status: 500 })
    }

    // Linka bilateralmente
    await admin.from('appointments').update({ invoice_item_id: newItem.id }).eq('id', appt.id)
  }

  // 4. Recalcular invoice (considera manual_discount geral pra não sobrescrever)
  const [{ data: allItems }, { data: invForRecalc }] = await Promise.all([
    admin.from('invoice_items').select('total, discount').eq('invoice_id', invoiceId),
    admin.from('invoices').select('manual_discount').eq('id', invoiceId).maybeSingle(),
  ])
  const itemsTotal = (allItems ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0)
  const itemsDiscount = (allItems ?? []).reduce((s, r) => s + Number(r.discount ?? 0), 0)
  let manualDiscount = Number(invForRecalc?.manual_discount ?? 0)
  if (manualDiscount > itemsTotal) manualDiscount = itemsTotal
  const total = Math.max(0, itemsTotal - manualDiscount)
  await admin
    .from('invoices')
    .update({
      subtotal: itemsTotal + itemsDiscount,
      discount: itemsDiscount + manualDiscount,
      manual_discount: manualDiscount,
      total,
    })
    .eq('id', invoiceId)

  return NextResponse.json({ ok: true, new_total: total })
}
