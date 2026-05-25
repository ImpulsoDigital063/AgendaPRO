import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * POST /api/admin/invoices/[id]/courtesy
 *
 * Marca a comanda como CORTESIA (bonificação · sem cobrança).
 * Cobre 100% do total · não fraciona com outros métodos.
 *
 * Body opcional: { notes?: string }
 *
 * Cascata:
 *  1. Cria invoice_payment com method='courtesy' amount=total (marca de bonificação)
 *  2. Marca invoice como 'closed' + closed_at
 *  3. appointments vinculados: status='completed' + paid_at + payment_method='courtesy'
 *  4. sales vinculadas: status='paid' + paid_at + payment_method='courtesy'
 *
 * IMPORTANTE: agregadores de receita JÁ filtram payment_method='courtesy' pra
 * NÃO contar como faturamento real. Validar em todas as 8 telas que somam receita
 * (vide [[entidade-financeira-nova-varrer-agregadores]]).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: ownerBusiness } = await supabase
    .from('businesses').select('id').eq('owner_id', user.id).maybeSingle()
  let businessId = ownerBusiness?.id ?? null
  if (!businessId) {
    const { data: prof } = await supabase
      .from('professionals').select('business_id')
      .eq('auth_user_id', user.id).eq('active', true).eq('is_receptionist', true).maybeSingle()
    businessId = prof?.business_id ?? null
  }
  if (!businessId) return NextResponse.json({ error: 'no_business' }, { status: 403 })

  const { id: invoiceId } = await params
  const body = await request.json().catch(() => null)
  const notes = typeof body?.notes === 'string' ? body.notes.trim() : null

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: invoice } = await admin
    .from('invoices')
    .select('id, business_id, status, total, notes')
    .eq('id', invoiceId)
    .maybeSingle()
  if (!invoice) return NextResponse.json({ error: 'invoice_not_found' }, { status: 404 })
  if (invoice.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (invoice.status !== 'open') {
    return NextResponse.json({ error: 'invoice_not_open', current: invoice.status }, { status: 400 })
  }

  // Bloqueia se comanda já tem pagamento(s) registrado(s) · operador precisa
  // cancelar/reabrir antes pra não criar payment duplicado (caso #819)
  const { data: existingPayments } = await admin
    .from('invoice_payments')
    .select('id, payment_method')
    .eq('invoice_id', invoiceId)
    .limit(1)
  if ((existingPayments ?? []).length > 0) {
    return NextResponse.json({
      error: 'invoice_already_has_payment',
      detail: 'Essa comanda já tem pagamento registrado. Cancele a comanda e crie uma nova pra marcar como cortesia.',
    }, { status: 400 })
  }

  const nowIso = new Date().toISOString()
  const total = Number(invoice.total ?? 0)

  // 1. invoice_payment cortesia (marcador · não conta receita)
  const { error: payErr } = await admin
    .from('invoice_payments')
    .insert({
      invoice_id: invoiceId,
      payment_method: 'courtesy',
      amount: total,
      paid_at: nowIso,
    })
  if (payErr) return NextResponse.json({ error: `courtesy_creation_failed: ${payErr.message}` }, { status: 500 })

  // 2. Propaga pra appointments + sales
  const { data: items } = await admin
    .from('invoice_items')
    .select('id, item_type, reference_id')
    .eq('invoice_id', invoiceId)

  const apptIds = (items ?? []).filter((i) => i.item_type === 'appointment' && i.reference_id).map((i) => i.reference_id as string)
  const saleIds = (items ?? []).filter((i) => i.item_type === 'product' && i.reference_id).map((i) => i.reference_id as string)

  if (apptIds.length > 0) {
    await admin
      .from('appointments')
      .update({ status: 'completed', paid_at: nowIso, payment_method: 'courtesy' })
      .in('id', apptIds)
  }
  if (saleIds.length > 0) {
    await admin
      .from('sales')
      .update({ status: 'paid', paid_at: nowIso, payment_method: 'courtesy' })
      .in('id', saleIds)
  }

  // 3. Fecha invoice com nota de cortesia
  const newNotes = notes
    ? `${invoice.notes ? invoice.notes + '\n' : ''}CORTESIA: ${notes}`
    : (invoice.notes ?? null)
  await admin
    .from('invoices')
    .update({ status: 'closed', closed_at: nowIso, notes: newNotes })
    .eq('id', invoiceId)

  // 4. Read-after-write
  const { data: verify } = await admin
    .from('invoices').select('status').eq('id', invoiceId).maybeSingle()
  if (verify?.status !== 'closed') {
    return NextResponse.json({ error: 'persistence_check_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status: 'closed', courtesy: true })
}
