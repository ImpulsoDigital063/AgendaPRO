import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

async function getBusinessId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: owner } = await supabase.from('businesses').select('id').eq('owner_id', user.id).maybeSingle()
  if (owner) return owner.id
  const { data: prof } = await supabase
    .from('professionals')
    .select('business_id')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .eq('is_receptionist', true)
    .maybeSingle()
  return prof?.business_id ?? null
}

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

/**
 * POST /api/admin/packages/sell
 * Body: {
 *   package_id: string
 *   customer_id: string
 *   professional_id?: string | null
 *   invoice_id?: string | null  // se vier · adiciona como item da comanda existente
 *                                  // se não vier · cria uma comanda nova só pro pacote
 *   notes?: string | null
 * }
 *
 * Efeitos:
 *  - Cria customer_package (snapshot nome + preço)
 *  - Cria customer_package_balances (1 row por package_item · saldo inicial = quantity)
 *  - Cria/reusa invoice
 *  - Cria invoice_item type='package' (unit_price = package.price)
 *  - Atualiza customer_package.invoice_item_id
 *  - Calcula expires_at se validity_kind != 'none'
 *  - Recalcula totais da invoice
 *
 * Read-after-write: confirma customer_package criado + balances.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'no_business' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  const packageId = typeof body.package_id === 'string' ? body.package_id : null
  const customerId = typeof body.customer_id === 'string' ? body.customer_id : null
  const professionalId = typeof body.professional_id === 'string' ? body.professional_id : null
  const invoiceIdIn = typeof body.invoice_id === 'string' ? body.invoice_id : null
  const notes = typeof body.notes === 'string' ? body.notes.trim() : null

  if (!packageId) return NextResponse.json({ error: 'package_id_required' }, { status: 400 })
  if (!customerId) return NextResponse.json({ error: 'customer_id_required' }, { status: 400 })

  const admin = getAdmin()

  // 1. Carrega pacote + itens + valida ownership
  const { data: pkg } = await admin
    .from('packages')
    .select(`
      id, business_id, name, price, validity_kind, validity_value, active,
      package_items (id, service_id, product_id, quantity, unit_price, services(id, name, price), products(id, name, price))
    `)
    .eq('id', packageId)
    .maybeSingle()
  if (!pkg) return NextResponse.json({ error: 'package_not_found' }, { status: 404 })
  if (pkg.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (!pkg.active) return NextResponse.json({ error: 'package_inactive' }, { status: 400 })
  const items = pkg.package_items ?? []
  if (items.length === 0) return NextResponse.json({ error: 'package_empty' }, { status: 400 })

  // 2. Valida cliente
  const { data: customer } = await admin
    .from('customers')
    .select('id, business_id, name')
    .eq('id', customerId)
    .maybeSingle()
  if (!customer || customer.business_id !== businessId) {
    return NextResponse.json({ error: 'customer_not_found' }, { status: 404 })
  }

  // 3. Calcula expires_at
  let expiresAt: string | null = null
  if (pkg.validity_kind !== 'none' && pkg.validity_value) {
    const d = new Date()
    if (pkg.validity_kind === 'days') d.setDate(d.getDate() + pkg.validity_value)
    else if (pkg.validity_kind === 'weeks') d.setDate(d.getDate() + pkg.validity_value * 7)
    else if (pkg.validity_kind === 'months') d.setMonth(d.getMonth() + pkg.validity_value)
    else if (pkg.validity_kind === 'years') d.setFullYear(d.getFullYear() + pkg.validity_value)
    expiresAt = d.toISOString()
  }

  // 4. Cria customer_package (sem invoice_item_id ainda · setamos depois)
  const { data: cp, error: cpErr } = await admin
    .from('customer_packages')
    .insert({
      business_id: businessId,
      customer_id: customerId,
      package_id: pkg.id,
      package_name: pkg.name,
      price_paid: Number(pkg.price),
      expires_at: expiresAt,
      status: 'active',
      notes,
    })
    .select()
    .single()
  if (cpErr || !cp) return NextResponse.json({ error: cpErr?.message ?? 'cp_failed' }, { status: 500 })

  // 5. Cria balances · SÓ pros itens de SERVIÇO (viram saldo de sessão).
  //    Produtos não têm saldo: são entregues na hora (baixa de estoque no passo 5b).
  const serviceItems = items.filter((it) => it.service_id)
  const productItems = items.filter((it) => it.product_id)

  if (serviceItems.length > 0) {
    const balancesToInsert = serviceItems.map((it) => {
      const svc = Array.isArray(it.services) ? it.services[0] : it.services
      return {
        customer_package_id: cp.id,
        service_id: it.service_id,
        service_name: svc?.name ?? 'Serviço',
        sessions_total: Number(it.quantity ?? 0),
        sessions_used: 0,
        unit_price_snapshot: Number(it.unit_price ?? svc?.price ?? 0),
      }
    })
    const { error: balErr } = await admin.from('customer_package_balances').insert(balancesToInsert)
    if (balErr) {
      await admin.from('customer_packages').delete().eq('id', cp.id) // rollback
      return NextResponse.json({ error: `balances_failed: ${balErr.message}` }, { status: 500 })
    }
  }

  // 5b. Produtos do combo → entrega na venda · baixa estoque via stock_movement (exit).
  //     NÃO vira venda separada: a receita já é o preço do pacote (não duplica).
  //     O trigger v63 (trg_apply_stock_movement) abate products.quantity sozinho.
  let stockWarning: string | null = null
  if (productItems.length > 0) {
    const movements = productItems.map((it) => ({
      business_id: businessId,
      product_id: it.product_id,
      type: 'exit',
      quantity: -Math.abs(Number(it.quantity ?? 0)), // delta negativo = saída
      reason: `Pacote: ${pkg.name}`,
      created_by: user.id,
    }))
    const { error: mvErr } = await admin.from('stock_movements').insert(movements)
    if (mvErr) {
      // Produto já foi entregue fisicamente · não desfaz a venda por falha de estoque.
      // Sinaliza pro dono ajustar manualmente.
      stockWarning = mvErr.message
    }
  }

  // 6. Resolve invoice (existente OU cria nova só pro pacote)
  let invoiceId = invoiceIdIn
  if (invoiceId) {
    // Valida invoice existente
    const { data: inv } = await admin
      .from('invoices')
      .select('id, business_id, status, customer_id')
      .eq('id', invoiceId)
      .maybeSingle()
    if (!inv || inv.business_id !== businessId) {
      return NextResponse.json({ error: 'invoice_not_found' }, { status: 404 })
    }
    if (inv.status !== 'open') {
      return NextResponse.json({ error: 'invoice_not_open' }, { status: 400 })
    }
  } else {
    // Cria nova comanda
    const { data: invNumber } = await admin.rpc('next_invoice_number', { p_business_id: businessId })
    const { data: inv, error: invErr } = await admin
      .from('invoices')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        invoice_number: invNumber,
        status: 'open',
        subtotal: 0,
        discount: 0,
        total: 0,
        notes: `Venda de pacote: ${pkg.name}`,
      })
      .select('id')
      .single()
    if (invErr || !inv) {
      await admin.from('customer_packages').delete().eq('id', cp.id)
      return NextResponse.json({ error: `invoice_create_failed: ${invErr?.message}` }, { status: 500 })
    }
    invoiceId = inv.id
  }

  // 7. Cria invoice_item type='package'
  const totalSessions = serviceItems.reduce((s, it) => s + Number(it.quantity ?? 0), 0)
  const totalProdUnits = productItems.reduce((s, it) => s + Number(it.quantity ?? 0), 0)
  const parts: string[] = []
  if (totalSessions > 0) parts.push(`${totalSessions} ${totalSessions === 1 ? 'sessão' : 'sessões'}`)
  if (totalProdUnits > 0) parts.push(`${totalProdUnits} ${totalProdUnits === 1 ? 'produto' : 'produtos'}`)
  const description = `Pacote: ${pkg.name}${parts.length ? ` (${parts.join(' + ')})` : ''}`

  const { data: invItem, error: iiErr } = await admin
    .from('invoice_items')
    .insert({
      invoice_id: invoiceId,
      item_type: 'package',
      reference_id: cp.id,
      description,
      professional_id: professionalId,
      quantity: 1,
      unit_price: Number(pkg.price),
      discount: 0,
      total: Number(pkg.price),
    })
    .select('id')
    .single()
  if (iiErr || !invItem) {
    await admin.from('customer_packages').delete().eq('id', cp.id)
    return NextResponse.json({ error: `invoice_item_failed: ${iiErr?.message}` }, { status: 500 })
  }

  // 8. Linka customer_package -> invoice_item
  await admin.from('customer_packages').update({ invoice_item_id: invItem.id }).eq('id', cp.id)

  // 9. Recalcula totais da invoice (considera manual_discount se já tiver)
  const [{ data: allItems }, { data: invRow }] = await Promise.all([
    admin.from('invoice_items').select('total, discount').eq('invoice_id', invoiceId),
    admin.from('invoices').select('manual_discount').eq('id', invoiceId).maybeSingle(),
  ])
  const itemsTotal = (allItems ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0)
  const itemsDiscount = (allItems ?? []).reduce((s, r) => s + Number(r.discount ?? 0), 0)
  let manualDiscount = Number(invRow?.manual_discount ?? 0)
  if (manualDiscount > itemsTotal) manualDiscount = itemsTotal
  await admin
    .from('invoices')
    .update({
      subtotal: itemsTotal + itemsDiscount,
      discount: itemsDiscount + manualDiscount,
      manual_discount: manualDiscount,
      total: Math.max(0, itemsTotal - manualDiscount),
    })
    .eq('id', invoiceId)

  // 10. Read-after-write · confirma
  const { data: verify } = await admin
    .from('customer_packages')
    .select('id, status, invoice_item_id')
    .eq('id', cp.id)
    .maybeSingle()
  if (!verify || verify.status !== 'active' || verify.invoice_item_id !== invItem.id) {
    return NextResponse.json({ error: 'verify_failed' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    customer_package_id: cp.id,
    invoice_id: invoiceId,
    invoice_item_id: invItem.id,
    expires_at: expiresAt,
    ...(stockWarning ? { stock_warning: stockWarning } : {}),
  })
}
