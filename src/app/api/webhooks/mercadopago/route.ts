import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * POST /api/webhooks/mercadopago — recebe notificações do Mercado Pago
 *
 * Trata 2 tipos de evento:
 * 1. subscription_preapproval — assinatura recorrente (modalidade mensal_cartao)
 *    → atualiza status (active/past_due/cancelled) + setup_paid_at + period
 * 2. payment — PIX único (modalidades mensal_pix / semestral_pix / anual_pix)
 *    → identifica subscription via external_reference, atualiza pago_ate
 */
export async function POST(req: NextRequest) {
  const body = await req.json()

  console.log('[MP Webhook] Recebido:', JSON.stringify(body))

  const { type, data } = body

  if (type === 'subscription_preapproval') {
    await handleSubscriptionUpdate(data.id)
  } else if (type === 'payment') {
    await handlePayment(data.id)
  }

  return NextResponse.json({ ok: true })
}

// ── Handler 1: PREAPPROVAL (assinatura recorrente cartão) ────────────────────
async function handleSubscriptionUpdate(mpSubscriptionId: string) {
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) return

  const res = await fetch(`https://api.mercadopago.com/preapproval/${mpSubscriptionId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    console.error('[MP Webhook] Erro ao buscar preapproval:', await res.text())
    return
  }

  const sub = await res.json()
  const admin = getAdminClient()
  const businessId = sub.external_reference

  if (!businessId) {
    console.error('[MP Webhook] external_reference vazio para preapproval:', mpSubscriptionId)
    return
  }

  let status: string | null = null
  const updateData: Record<string, unknown> = {
    mp_subscription_id: mpSubscriptionId,
    mp_payer_id: sub.payer_id?.toString() || null,
  }

  switch (sub.status) {
    case 'authorized':
    case 'active': {
      status = 'active'

      const { data: existing } = await admin
        .from('subscriptions')
        .select('setup_paid_at')
        .eq('business_id', businessId)
        .single()

      if (!existing?.setup_paid_at) {
        const now = new Date()
        const refundDeadline = new Date(now)
        refundDeadline.setDate(refundDeadline.getDate() + 7)
        const periodEnd = new Date(now)
        periodEnd.setMonth(periodEnd.getMonth() + 1)

        updateData.setup_paid_at = now.toISOString()
        updateData.refund_deadline_at = refundDeadline.toISOString()
        updateData.current_period_start = now.toISOString()
        updateData.current_period_end = periodEnd.toISOString()
        updateData.pago_ate = periodEnd.toISOString()
      }

      updateData.grace_ends_at = null
      updateData.public_blocked_at = null
      updateData.cancelled_at = null
      updateData.data_delete_at = null
      break
    }

    case 'paused': {
      status = 'past_due'
      const graceEnd = new Date()
      graceEnd.setDate(graceEnd.getDate() + 5)
      updateData.grace_ends_at = graceEnd.toISOString()

      const publicBlock = new Date(graceEnd)
      publicBlock.setDate(publicBlock.getDate() + 7)
      updateData.public_blocked_at = publicBlock.toISOString()
      break
    }

    case 'pending':
      console.log('[MP Webhook] preapproval pending — mantendo pending_payment local')
      break

    case 'cancelled': {
      status = 'cancelled'
      const now = new Date()
      updateData.cancelled_at = now.toISOString()
      const deleteAt = new Date(now)
      deleteAt.setDate(deleteAt.getDate() + 90)
      updateData.data_delete_at = deleteAt.toISOString()
      break
    }

    default:
      console.log('[MP Webhook] Status preapproval não mapeado:', sub.status)
      return
  }

  if (status) {
    updateData.status = status
  }

  const { error } = await admin
    .from('subscriptions')
    .update(updateData)
    .eq('business_id', businessId)

  if (error) {
    console.error('[MP Webhook] Erro ao atualizar subscription (preapproval):', error)
  } else {
    console.log(`[MP Webhook] Subscription ${businessId} atualizada (preapproval): ${status}`)
  }
}

// ── Handler 2: PAYMENT (PIX único — mensal/semestral/anual) ─────────────────
async function handlePayment(paymentId: string) {
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) return

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    console.error('[MP Webhook] Erro ao buscar payment:', await res.text())
    return
  }

  const payment = await res.json()
  const admin = getAdminClient()

  // Só interessa pagamento APROVADO
  if (payment.status !== 'approved') {
    console.log('[MP Webhook] payment não aprovado:', payment.status)
    return
  }

  // Caminho A: payment vem de PREAPPROVAL (cobrança recorrente cartão).
  // Identifica via metadata.preapproval_id e atualiza pago_ate += 1 mês.
  const preapprovalId = payment.metadata?.preapproval_id
  if (preapprovalId) {
    const { data: sub } = await admin
      .from('subscriptions')
      .select('id, status, business_id, current_period_end')
      .eq('mp_subscription_id', preapprovalId)
      .single()

    if (sub) {
      const periodStart = new Date()
      const periodEnd = new Date(periodStart)
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      await admin
        .from('subscriptions')
        .update({
          status: 'active',
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          pago_ate: periodEnd.toISOString(),
          grace_ends_at: null,
          public_blocked_at: null,
        })
        .eq('id', sub.id)

      console.log(`[MP Webhook] Recurring payment confirmado pra ${sub.business_id} — pago_ate=${periodEnd.toISOString()}`)
    }
    return
  }

  // Caminho B: payment vem de PREFERENCE (PIX único).
  // external_reference tem formato: "business_id|modalidade|coberturaMeses"
  const externalRef = payment.external_reference as string | undefined
  if (!externalRef || !externalRef.includes('|')) {
    console.log('[MP Webhook] payment sem external_reference parseável:', externalRef)
    return
  }

  const [businessId, modalidade, coberturaStr] = externalRef.split('|')
  const coberturaMeses = parseInt(coberturaStr, 10)

  if (!businessId || !modalidade || isNaN(coberturaMeses)) {
    console.error('[MP Webhook] external_reference malformado:', externalRef)
    return
  }

  const { data: sub } = await admin
    .from('subscriptions')
    .select('id, pago_ate, setup_paid_at, status')
    .eq('business_id', businessId)
    .single()

  if (!sub) {
    console.error('[MP Webhook] subscription não encontrada pra business:', businessId)
    return
  }

  // Calcula novo pago_ate:
  // - Se sub.pago_ate é futuro (renovação antes do vencimento), soma a partir de pago_ate
  // - Se sub.pago_ate é passado ou null (primeira ativação), soma a partir de hoje
  const now = new Date()
  const baseDate = sub.pago_ate && new Date(sub.pago_ate) > now
    ? new Date(sub.pago_ate)
    : now

  const novoPagoAte = new Date(baseDate)
  novoPagoAte.setMonth(novoPagoAte.getMonth() + coberturaMeses)

  // Update completo
  const updatePayload: Record<string, unknown> = {
    status: 'active',
    pago_ate: novoPagoAte.toISOString(),
    mp_payment_id_atual: paymentId,
    pix_link_atual: null, // PIX foi pago, link expira
    grace_ends_at: null,
    public_blocked_at: null,
  }

  // Primeira ativação (sub nunca pagou) → seta setup_paid_at + refund_deadline
  if (!sub.setup_paid_at) {
    updatePayload.setup_paid_at = now.toISOString()
    const refundDeadline = new Date(now)
    refundDeadline.setDate(refundDeadline.getDate() + 7)
    updatePayload.refund_deadline_at = refundDeadline.toISOString()
    updatePayload.current_period_start = now.toISOString()
    updatePayload.current_period_end = novoPagoAte.toISOString()
  }

  await admin
    .from('subscriptions')
    .update(updatePayload)
    .eq('id', sub.id)

  console.log(`[MP Webhook] PIX confirmado pra ${businessId} (${modalidade}, ${coberturaMeses}m) — pago_ate=${novoPagoAte.toISOString()}`)
}
