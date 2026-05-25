import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * POST /api/admin/invoices/[id]/redeem-reward
 * Body: { reward_id: string }
 *
 * Resgata uma recompensa de fidelidade DENTRO de uma comanda:
 *   1. Valida invoice open + tem customer vinculado + business loyalty_enabled
 *   2. Valida reward ativa do mesmo business
 *   3. Valida customer.total_points >= reward.points_required
 *   4. Cria invoice_item (type='credit', reference_id=reward.id, unit_price negativo)
 *      O valor descontado é o menor entre subtotal atual e o item de maior valor
 *      (padrão Salão99: "Corte grátis" zera só o serviço, não a comanda toda).
 *   5. Decrementa customer.total_points
 *   6. Loga points_transactions(reason=redemption, delta=-cost)
 *   7. Recalcula subtotal/total da invoice
 *   8. Read-after-write: retorna saldo novo do customer pra UI atualizar
 *
 * λ.prova-na-fonte: o SELECT final no customer confirma que o saldo foi
 * de fato decrementado · sem isso, falha silenciosa do UPDATE passaria batido.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Resolve businessId — dono OU recepcionista ativa
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
  const reward_id = typeof body?.reward_id === 'string' ? body.reward_id : ''
  if (!reward_id) return NextResponse.json({ error: 'reward_id obrigatório' }, { status: 400 })

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // 1. Valida invoice + business loyalty_enabled
  const [{ data: invoice }, { data: business }] = await Promise.all([
    admin
      .from('invoices')
      .select('id, business_id, status, customer_id, subtotal')
      .eq('id', invoiceId)
      .maybeSingle(),
    admin
      .from('businesses')
      .select('id, loyalty_enabled')
      .eq('id', businessId)
      .maybeSingle(),
  ])
  if (!invoice) return NextResponse.json({ error: 'invoice_not_found' }, { status: 404 })
  if (invoice.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (invoice.status !== 'open') {
    return NextResponse.json({ error: 'invoice_not_open', detail: 'Só comandas abertas aceitam resgate.' }, { status: 400 })
  }
  if (!invoice.customer_id) {
    return NextResponse.json({ error: 'no_customer', detail: 'Comanda precisa de cliente vinculado.' }, { status: 400 })
  }
  if (!business?.loyalty_enabled) {
    return NextResponse.json({ error: 'loyalty_disabled', detail: 'Programa de fidelidade está desativado.' }, { status: 400 })
  }

  // 2. Reward ativa do mesmo business
  const { data: reward } = await admin
    .from('rewards')
    .select('id, business_id, name, points_required, active')
    .eq('id', reward_id)
    .maybeSingle()
  if (!reward || reward.business_id !== businessId) {
    return NextResponse.json({ error: 'reward_not_found' }, { status: 404 })
  }
  if (!reward.active) {
    return NextResponse.json({ error: 'reward_inactive' }, { status: 400 })
  }

  // 3. Saldo do cliente
  const { data: customer } = await admin
    .from('customers')
    .select('id, total_points')
    .eq('id', invoice.customer_id)
    .maybeSingle()
  if (!customer) return NextResponse.json({ error: 'customer_not_found' }, { status: 404 })
  const current = Number(customer.total_points ?? 0)
  const cost = Number(reward.points_required)
  if (current < cost) {
    return NextResponse.json(
      { error: 'insufficient_points', detail: `Saldo ${current} pts · custa ${cost} pts` },
      { status: 400 },
    )
  }

  // 4. Calcula valor do desconto · item mais caro OU subtotal atual (menor)
  const { data: items } = await admin
    .from('invoice_items')
    .select('total, item_type')
    .eq('invoice_id', invoiceId)
  const positives = (items ?? []).filter((i) => Number(i.total ?? 0) > 0)
  if (positives.length === 0) {
    return NextResponse.json({ error: 'empty_invoice', detail: 'Comanda sem itens cobráveis pra aplicar recompensa.' }, { status: 400 })
  }
  const maxItem = positives.reduce((a, b) => (Number(a.total) > Number(b.total) ? a : b))
  const subtotalAtual = Number(invoice.subtotal ?? 0)
  const discountValue = Math.min(Number(maxItem.total), subtotalAtual)
  if (!(discountValue > 0)) {
    return NextResponse.json({ error: 'no_discount_value' }, { status: 400 })
  }

  // 5. Cria invoice_item negativo (recompensa)
  const { error: iiErr } = await admin
    .from('invoice_items')
    .insert({
      invoice_id: invoiceId,
      item_type: 'credit',
      reference_id: reward.id,
      description: `Recompensa: ${reward.name} (−${cost} pts)`,
      quantity: 1,
      unit_price: -discountValue,
      discount: 0,
      total: -discountValue,
    })
  if (iiErr) {
    return NextResponse.json({ error: `invoice_item_creation_failed: ${iiErr.message}` }, { status: 500 })
  }

  // 6. Decrementa pontos
  const next = current - cost
  const { error: updErr } = await admin
    .from('customers')
    .update({ total_points: next })
    .eq('id', customer.id)
  if (updErr) {
    return NextResponse.json({ error: `customer_update_failed: ${updErr.message}` }, { status: 500 })
  }

  // 7. Loga transação
  await admin.from('points_transactions').insert({
    customer_id: customer.id,
    business_id: businessId,
    points: -cost,
    reason: 'redemption',
  })

  // 8. Recalcula subtotal/total da invoice
  const { data: allItems } = await admin
    .from('invoice_items')
    .select('total, discount')
    .eq('invoice_id', invoiceId)
  const newSubtotal = (allItems ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0)
  const itemsDiscount = (allItems ?? []).reduce((s, r) => s + Number(r.discount ?? 0), 0)
  await admin
    .from('invoices')
    .update({ subtotal: newSubtotal + itemsDiscount, discount: itemsDiscount, total: newSubtotal })
    .eq('id', invoiceId)

  // 9. Read-after-write: confirma saldo decrementou (prova na fonte)
  const { data: verify } = await admin
    .from('customers')
    .select('total_points')
    .eq('id', customer.id)
    .maybeSingle()
  const savedPoints = Number(verify?.total_points ?? -1)
  if (savedPoints !== next) {
    return NextResponse.json(
      { error: 'verify_failed', detail: `Esperava ${next} pts, banco tem ${savedPoints}` },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    redeemed: { reward_id: reward.id, name: reward.name, cost },
    new_total_points: savedPoints,
    new_invoice_total: newSubtotal,
    discount_applied: discountValue,
  })
}
