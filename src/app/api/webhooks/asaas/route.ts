import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// =====================================================================
// POST /api/webhooks/asaas
//
// Webhook do Asaas. Configurar no painel:
//   URL:   https://www.agendapro.net.br/api/webhooks/asaas
//   Token: definir uma string secreta — colocar em ASAAS_WEBHOOK_TOKEN
//
// Asaas autentica via header `asaas-access-token` (não HMAC).
// Validamos comparando com ASAAS_WEBHOOK_TOKEN.
//
// Eventos relevantes pra nosso fluxo:
//   - PAYMENT_CONFIRMED — cobrança aprovada (cartão) ou PIX recebido
//   - PAYMENT_RECEIVED  — dinheiro caiu na conta Asaas (D+1 ou D+30)
//   - PAYMENT_REFUNDED  — refund processado
//   - PAYMENT_OVERDUE   — passou do vencimento sem pagar
//   - SUBSCRIPTION_CANCELLED — assinatura cancelada
//
// Pra liberar acesso do cliente, usamos PAYMENT_CONFIRMED (não esperar
// o dinheiro cair — Asaas garante o repasse).
// =====================================================================

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type AsaasWebhookPayment = {
  id: string
  customer: string
  subscription?: string
  billingType: string
  value: number
  netValue?: number
  status: string
  dueDate: string
  paymentDate?: string
  clientPaymentDate?: string
  externalReference?: string
}

type AsaasWebhookBody = {
  event: string
  payment?: AsaasWebhookPayment
  subscription?: {
    id: string
    status: string
    externalReference?: string
  }
}

export async function POST(req: NextRequest) {
  // ── 1. Validação do token ───────────────────────────────────────
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN
  const receivedToken = req.headers.get('asaas-access-token')

  if (!expectedToken) {
    console.warn(
      '[Asaas Webhook] ASAAS_WEBHOOK_TOKEN não configurada — pulando validação. CONFIGURAR EM PRODUÇÃO.'
    )
  } else if (receivedToken !== expectedToken) {
    console.error('[Asaas Webhook] Token inválido')
    return NextResponse.json({ error: 'invalid token' }, { status: 401 })
  }

  // ── 2. Parse do body ────────────────────────────────────────────
  let body: AsaasWebhookBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const event = body.event
  console.log(`[Asaas Webhook] Recebido: ${event}`)

  const admin = getAdminClient()

  // ── 3. Roteamento por evento ────────────────────────────────────
  try {
    if (
      event === 'PAYMENT_CONFIRMED' ||
      event === 'PAYMENT_RECEIVED' ||
      event === 'PAYMENT_RECEIVED_IN_CASH'
    ) {
      await handlePaymentConfirmed(admin, body.payment)
    } else if (event === 'PAYMENT_REFUNDED') {
      await handlePaymentRefunded(admin, body.payment)
    } else if (event === 'PAYMENT_OVERDUE') {
      await handlePaymentOverdue(admin, body.payment)
    } else if (
      event === 'PAYMENT_DELETED' ||
      event === 'SUBSCRIPTION_DELETED'
    ) {
      // Asaas avisa quando subscription/payment é deletada — nada urgente
      console.log(`[Asaas Webhook] ${event} ignorado`)
    } else {
      console.log(`[Asaas Webhook] Evento não tratado: ${event}`)
    }
  } catch (err) {
    console.error('[Asaas Webhook] Erro processando evento', event, err)
    return NextResponse.json({ error: 'processing error' }, { status: 500 })
  }

  // Sempre responder 200 pra Asaas não retentar (já tratamos internamente)
  return NextResponse.json({ ok: true })
}

// ─────────────────────────────────────────────────────────────────
// HANDLERS POR EVENTO
// ─────────────────────────────────────────────────────────────────

type AdminClient = ReturnType<typeof getAdminClient>

async function handlePaymentConfirmed(
  admin: AdminClient,
  payment: AsaasWebhookPayment | undefined
) {
  if (!payment) {
    console.error('[Asaas Webhook] payment ausente em PAYMENT_CONFIRMED')
    return
  }

  // Caminho A: payment vem de SUBSCRIPTION (cartão recorrente)
  if (payment.subscription) {
    await handleRecurringPayment(admin, payment)
    return
  }

  // Caminho B: payment avulso (PIX)
  // externalReference deve ser "business_id|modalidade|coberturaMeses"
  const externalRef = payment.externalReference
  if (!externalRef || !externalRef.includes('|')) {
    console.log(
      '[Asaas Webhook] payment avulso sem externalReference parseável:',
      externalRef
    )
    return
  }

  const [businessId, modalidade, coberturaStr] = externalRef.split('|')
  const coberturaMeses = parseInt(coberturaStr, 10)

  if (!businessId || !modalidade || isNaN(coberturaMeses)) {
    console.error('[Asaas Webhook] externalReference malformado:', externalRef)
    return
  }

  const { data: sub } = await admin
    .from('subscriptions')
    .select('id, pago_ate, setup_paid_at, status')
    .eq('business_id', businessId)
    .single()

  if (!sub) {
    console.error(
      '[Asaas Webhook] subscription não encontrada pra business:',
      businessId
    )
    return
  }

  const now = new Date()
  const baseDate =
    sub.pago_ate && new Date(sub.pago_ate) > now ? new Date(sub.pago_ate) : now
  const novoPagoAte = new Date(baseDate)
  novoPagoAte.setMonth(novoPagoAte.getMonth() + coberturaMeses)

  const updatePayload: Record<string, unknown> = {
    status: 'active',
    pago_ate: novoPagoAte.toISOString(),
    asaas_payment_id_atual: payment.id,
    pix_link_atual: null,
    grace_ends_at: null,
    public_blocked_at: null,
    provider: 'asaas',
  }

  // Primeira ativação
  if (!sub.setup_paid_at) {
    updatePayload.setup_paid_at = now.toISOString()
    const refundDeadline = new Date(now)
    refundDeadline.setDate(refundDeadline.getDate() + 7)
    updatePayload.refund_deadline_at = refundDeadline.toISOString()
    updatePayload.current_period_start = now.toISOString()
    updatePayload.current_period_end = novoPagoAte.toISOString()
  }

  await admin.from('subscriptions').update(updatePayload).eq('id', sub.id)

  console.log(
    `[Asaas Webhook] PIX confirmado pra ${businessId} (${modalidade}, ${coberturaMeses}m) — pago_ate=${novoPagoAte.toISOString()}`
  )
}

async function handleRecurringPayment(
  admin: AdminClient,
  payment: AsaasWebhookPayment
) {
  if (!payment.subscription) return

  const { data: sub } = await admin
    .from('subscriptions')
    .select('id, status, business_id, current_period_end, setup_paid_at, pago_ate')
    .eq('asaas_subscription_id', payment.subscription)
    .single()

  if (!sub) {
    console.error(
      '[Asaas Webhook] subscription Asaas não vinculada no DB:',
      payment.subscription
    )
    return
  }

  const now = new Date()
  const baseDate =
    sub.pago_ate && new Date(sub.pago_ate) > now ? new Date(sub.pago_ate) : now
  const periodEnd = new Date(baseDate)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  const updatePayload: Record<string, unknown> = {
    status: 'active',
    asaas_payment_id_atual: payment.id,
    pago_ate: periodEnd.toISOString(),
    grace_ends_at: null,
    public_blocked_at: null,
    provider: 'asaas',
  }

  if (!sub.setup_paid_at) {
    updatePayload.setup_paid_at = now.toISOString()
    const refundDeadline = new Date(now)
    refundDeadline.setDate(refundDeadline.getDate() + 7)
    updatePayload.refund_deadline_at = refundDeadline.toISOString()
    updatePayload.current_period_start = now.toISOString()
    updatePayload.current_period_end = periodEnd.toISOString()
  }

  await admin.from('subscriptions').update(updatePayload).eq('id', sub.id)

  console.log(
    `[Asaas Webhook] Cartão recorrente confirmado pra ${sub.business_id} — pago_ate=${periodEnd.toISOString()}`
  )
}

async function handlePaymentRefunded(
  admin: AdminClient,
  payment: AsaasWebhookPayment | undefined
) {
  if (!payment?.id) return

  // Encontra subscription pelo payment id
  const { data: sub } = await admin
    .from('subscriptions')
    .select('id, business_id')
    .or(
      `asaas_payment_id_atual.eq.${payment.id},asaas_subscription_id.eq.${payment.subscription ?? '__nope__'}`
    )
    .limit(1)
    .single()

  if (!sub) {
    console.log(
      '[Asaas Webhook] PAYMENT_REFUNDED sem subscription DB encontrada:',
      payment.id
    )
    return
  }

  await admin
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', sub.id)

  console.log(
    `[Asaas Webhook] Refund processado pra ${sub.business_id}, status → cancelled`
  )
}

async function handlePaymentOverdue(
  admin: AdminClient,
  payment: AsaasWebhookPayment | undefined
) {
  if (!payment) return

  // Tenta pelo subscription primeiro (cartão), depois externalReference (PIX)
  const subId = payment.subscription
  let subscription: { id: string; business_id: string } | null = null

  if (subId) {
    const { data } = await admin
      .from('subscriptions')
      .select('id, business_id')
      .eq('asaas_subscription_id', subId)
      .single()
    subscription = data ?? null
  }

  if (!subscription && payment.externalReference?.includes('|')) {
    const businessId = payment.externalReference.split('|')[0]
    const { data } = await admin
      .from('subscriptions')
      .select('id, business_id')
      .eq('business_id', businessId)
      .single()
    subscription = data ?? null
  }

  if (!subscription) {
    console.log('[Asaas Webhook] OVERDUE sem subscription DB:', payment.id)
    return
  }

  // Período de graça: 3 dias após overdue antes de bloquear público
  const graceEnds = new Date()
  graceEnds.setDate(graceEnds.getDate() + 3)

  await admin
    .from('subscriptions')
    .update({
      status: 'past_due',
      grace_ends_at: graceEnds.toISOString(),
    })
    .eq('id', subscription.id)

  console.log(
    `[Asaas Webhook] OVERDUE pra ${subscription.business_id} → past_due, graça até ${graceEnds.toISOString()}`
  )
}
