import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * POST /api/admin/invoices/[id]/pay
 *
 * Recebe pagamento de comanda em status='open'.
 * Body: {
 *   method: 'cash'|'pix'|'card'|'courtesy'|'points',
 *   device_id?, card_brand?, card_type?, installments?, fee_percent?
 * }
 *
 * Cascata:
 *  1. Cria invoice_payment com valor = invoice.total
 *  2. Marca invoice status='closed' + closed_at
 *  3. Atualiza appointments vinculados: status='completed', paid_at, payment_method
 *  4. Atualiza sales vinculadas: status='paid', paid_at, payment_method
 *  5. Read-after-write
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
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  // 2 modos:
  //  A) Single: { method, device_id?, card_brand?, card_type?, installments?, fee_percent? }
  //  B) Split:  { payments: [{ method, amount, device_id?, card_brand?, card_type?, installments?, fee_percent? }, ...] }
  type PaymentIn = {
    method: 'cash' | 'pix' | 'card' | 'courtesy' | 'points' | 'credit'
    amount?: number
    device_id?: string | null
    card_brand?: string | null
    card_type?: string | null
    installments?: number | null
    fee_percent?: number | null
  }
  const ALLOWED = ['cash', 'pix', 'card', 'courtesy', 'points', 'credit']
  let payments: PaymentIn[] = []
  if (Array.isArray(body.payments) && body.payments.length > 0) {
    payments = body.payments
  } else if (typeof body.method === 'string') {
    payments = [{
      method: body.method,
      device_id: body.device_id ?? null,
      card_brand: body.card_brand ?? null,
      card_type: body.card_type ?? null,
      installments: body.installments ?? 1,
      fee_percent: body.fee_percent ?? 0,
    }]
  }
  if (payments.length === 0 || payments.some((p) => !ALLOWED.includes(p.method))) {
    return NextResponse.json({ error: 'invalid_payments' }, { status: 400 })
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: invoice } = await admin
    .from('invoices')
    .select('id, business_id, status, total, customer_id')
    .eq('id', invoiceId)
    .maybeSingle()
  if (!invoice) return NextResponse.json({ error: 'invoice_not_found' }, { status: 404 })
  if (invoice.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (invoice.status !== 'open') {
    return NextResponse.json({ error: 'invoice_not_open', current: invoice.status }, { status: 400 })
  }

  const nowIso = new Date().toISOString()
  const total = Number(invoice.total ?? 0)

  // Se single, amount = total. Se split, amount vem em cada · valida soma.
  const normalized = payments.map((p) => ({ ...p, amount: payments.length === 1 ? total : Number(p.amount ?? 0) }))
  const sumAmounts = normalized.reduce((s, p) => s + (p.amount ?? 0), 0)
  if (Math.abs(sumAmounts - total) > 0.01) {
    return NextResponse.json({
      error: 'amounts_dont_sum_total',
      detail: `Soma dos pagamentos (${sumAmounts.toFixed(2)}) não fecha com o total da comanda (${total.toFixed(2)})`,
    }, { status: 400 })
  }

  // 1a. CRÉDITO · valida saldo + abate customer_credits FIFO antes de criar invoice_payment
  const creditTotal = normalized.filter((p) => p.method === 'credit').reduce((s, p) => s + (p.amount ?? 0), 0)
  if (creditTotal > 0) {
    if (!invoice.customer_id) {
      return NextResponse.json({ error: 'no_customer_for_credit', detail: 'Comanda sem cliente · crédito exige cliente vinculado' }, { status: 400 })
    }
    const { data: credits } = await admin
      .from('customer_credits')
      .select('id, amount')
      .eq('customer_id', invoice.customer_id)
      .is('used_in_invoice_id', null)
      .order('date', { ascending: true }) // FIFO · mais antigos primeiro
    const available = (credits ?? []).reduce((s, c) => s + Number(c.amount ?? 0), 0)
    if (available < creditTotal - 0.01) {
      return NextResponse.json({
        error: 'insufficient_credit',
        detail: `Cliente tem só R$ ${available.toFixed(2)} de crédito · pediu R$ ${creditTotal.toFixed(2)}`,
      }, { status: 400 })
    }
    // Abate · marca os créditos como usados até cobrir o valor
    let remaining = creditTotal
    const creditIdsToUse: string[] = []
    for (const c of (credits ?? [])) {
      if (remaining <= 0.01) break
      const amt = Number(c.amount ?? 0)
      if (amt <= 0) continue
      creditIdsToUse.push(c.id as string)
      remaining -= amt
    }
    // V1 simples: marca todos os créditos consumidos como used_in_invoice_id=invoiceId
    // (não faz split parcial de 1 crédito · se cliente quiser usar só parte, V2)
    if (creditIdsToUse.length > 0) {
      const { error: usedErr } = await admin
        .from('customer_credits')
        .update({ used_in_invoice_id: invoiceId })
        .in('id', creditIdsToUse)
      if (usedErr) return NextResponse.json({ error: `credit_abate_failed: ${usedErr.message}` }, { status: 500 })
    }
  }

  // 1b. invoice_payments · 1 row por pagamento
  //
  // Idempotência (caso #819): uma comanda pode ter sido REABERTA depois de um
  // pagamento anterior (action 'reopen' mantém os payments antigos). Cada
  // fechamento aqui é uma quitação COMPLETA (single=total OU split somando o
  // total), então limpamos os pagamentos antigos antes de registrar os novos.
  // Sem isso, reabrir+pagar de novo empilhava pagamentos duplicados (ex: comanda
  // de R$195 com R$754 registrado). Studio Mood/Izanara 09/06.
  await admin.from('invoice_payments').delete().eq('invoice_id', invoiceId)

  const rows = normalized.map((p) => ({
    invoice_id: invoiceId,
    payment_method: p.method,
    amount: p.amount,
    device_id: p.device_id ?? null,
    card_brand: p.card_brand ?? null,
    card_type: p.card_type ?? null,
    installments: p.installments ?? 1,
    fee_percent: p.fee_percent ?? 0,
    paid_at: nowIso,
  }))
  const { error: payErr } = await admin.from('invoice_payments').insert(rows)
  if (payErr) return NextResponse.json({ error: `payment_creation_failed: ${payErr.message}` }, { status: 500 })

  // Pra appointments/sales, usa o método do MAIOR pagamento REAL (cash/pix/card/courtesy/points).
  // 'credit' não está no CHECK constraint do schema · se a comanda foi 100% crédito,
  // propaga null (paid_at preenchido mas method null) · breakdown completo fica em invoice_payments.
  const realMethods = normalized.filter((p) => p.method !== 'credit')
  const propagatedMethod = realMethods.length > 0
    ? [...realMethods].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))[0].method
    : null

  // 2. Pega items pra propagar pagamento
  const { data: items } = await admin
    .from('invoice_items')
    .select('id, item_type, reference_id')
    .eq('invoice_id', invoiceId)

  const apptIds = (items ?? []).filter((i) => i.item_type === 'appointment' && i.reference_id).map((i) => i.reference_id as string)
  const saleIds = (items ?? []).filter((i) => i.item_type === 'product' && i.reference_id).map((i) => i.reference_id as string)

  // 3. Atualiza appointments → completed + paid_at
  if (apptIds.length > 0) {
    const { error } = await admin
      .from('appointments')
      .update({ status: 'completed', paid_at: nowIso, payment_method: propagatedMethod })
      .in('id', apptIds)
    if (error) return NextResponse.json({ error: `appointments_update_failed: ${error.message}` }, { status: 500 })
  }

  // 4. Atualiza sales → paid
  if (saleIds.length > 0) {
    const { error } = await admin
      .from('sales')
      .update({ status: 'paid', paid_at: nowIso, payment_method: propagatedMethod })
      .in('id', saleIds)
    if (error) return NextResponse.json({ error: `sales_update_failed: ${error.message}` }, { status: 500 })
  }

  // 5. Fecha invoice
  const { error: invErr } = await admin
    .from('invoices')
    .update({ status: 'closed', closed_at: nowIso })
    .eq('id', invoiceId)
  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

  // 6. Read-after-write
  const { data: confirm } = await admin
    .from('invoices')
    .select('status, total')
    .eq('id', invoiceId)
    .maybeSingle()
  if (confirm?.status !== 'closed') {
    return NextResponse.json({ error: 'persistence_check_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status: 'closed', total })
}
