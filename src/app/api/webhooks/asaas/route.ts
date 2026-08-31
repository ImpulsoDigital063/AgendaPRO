import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendPaymentConfirmed, sendRefundProcessed } from '@/lib/email'
import { sendAlert } from '@/lib/alert'
import { ativarPacote, trocarPacoteNoCiclo } from '@/lib/mensagens/franquia'

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

  /* ── COBRANÇA SÓ DOS AVISOS ──────────────────────────────────
     Formato próprio: avisos-avulso|business|pacote|unidades|dias
     É a primeira compra (proporcional aos dias que faltam pro vencimento
     do plano) e o upgrade no meio do ciclo. Não mexe em `pago_ate` nem em
     nada da assinatura — é outro produto, e tratar aqui como mensalidade
     daria acesso de graça a quem só comprou mensagem.

     `dias === 0` é o upgrade: troca o tamanho do balde e NÃO reinicia o
     ciclo. Qualquer outro valor é ativação nova, que soma o saldo. */
  if (externalRef.startsWith('avisos-avulso|')) {
    const [, bid, pacoteId, unidadesStr, diasStr] = externalRef.split('|')
    const unidades = parseInt(unidadesStr, 10)
    const dias = parseInt(diasStr, 10)
    if (!bid || !pacoteId || isNaN(unidades)) {
      console.error('[Asaas Webhook] avisos-avulso malformado:', externalRef)
      return
    }
    const r =
      dias === 0
        ? await trocarPacoteNoCiclo(admin, bid, pacoteId)
        : await ativarPacote(admin, bid, pacoteId, { unidades, dias })
    console.log(
      r.ok
        ? `[Asaas Webhook] avisos ${pacoteId} ativado pra ${bid} (${unidades}un/${dias}d)`
        : `[Asaas Webhook] FALHA ao ativar avisos de ${bid}: ${r.erro}`
    )
    return
  }

  /* 4º campo (opcional): "avisos:<pacoteId>". Presente quando esta
     cobrança também renova o pacote de mensagens — o cron e o pix-atual
     somam o valor e marcam aqui. Cobranças antigas não têm o campo e
     seguem funcionando igual. */
  const [businessId, modalidade, coberturaStr, avisosRef] = externalRef.split('|')
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
  // Primeira ativação? (antes do update — o setup_paid_at ainda reflete o estado
  // pré-pagamento). Usado pra destacar "cliente novo" no alerta Telegram.
  const isFirstPayment = !sub.setup_paid_at
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
  if (isFirstPayment) {
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

  /* RENOVA O PACOTE DE AVISOS.
     ─────────────────────────────────────────────────────────────
     É AQUI que a franquia recarrega, e não quando ela clica em
     "contratar": o pacote é pré-pago, então escolher não é pagar. Sem esta
     chamada o dinheiro entra e nenhuma mensagem sai.

     `ativarPacote` SOMA o saldo que sobrou do ciclo anterior — ela pagou
     por aquelas mensagens e elas continuam dela.

     Envolvido em try porque o pagamento da MENSALIDADE já foi gravado
     acima: se a recarga falhar, o acesso dela não pode cair junto. O erro
     vai pro log e o saldo é corrigido na mão. */
  if (avisosRef?.startsWith('avisos:')) {
    const pacoteId = avisosRef.slice('avisos:'.length)
    try {
      const r = await ativarPacote(admin, businessId, pacoteId)
      console.log(
        r.ok
          ? `[Asaas Webhook] avisos ${pacoteId} recarregado pra ${businessId} — ${r.unidades} unidades`
          : `[Asaas Webhook] FALHA ao recarregar avisos de ${businessId}: ${r.erro}`
      )
    } catch (e) {
      console.error('[Asaas Webhook] erro ao recarregar avisos:', e)
    }
  }

  // Email branded "Pagamento recebido" — substitui o do Asaas (que mostraria
  // "64.585.949 EDUARDO BARROS CHAVES" no header).
  void notifyPaymentConfirmed(admin, sub.id, payment.value, isFirstPayment).catch((err) =>
    console.error('[Asaas Webhook] sendPaymentConfirmed falhou:', err)
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
  const isFirstPayment = !sub.setup_paid_at
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

  if (isFirstPayment) {
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

  void notifyPaymentConfirmed(admin, sub.id, payment.value, isFirstPayment).catch((err) =>
    console.error('[Asaas Webhook] sendPaymentConfirmed (cartao) falhou:', err)
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

  // Email branded "Reembolso processado" — substitui o do Asaas.
  void notifyRefundProcessed(admin, sub.id, payment).catch((err) =>
    console.error('[Asaas Webhook] sendRefundProcessed falhou:', err)
  )
}

async function handlePaymentOverdue(
  admin: AdminClient,
  payment: AsaasWebhookPayment | undefined
) {
  if (!payment) return

  // Tenta pelo subscription primeiro (cartão), depois externalReference (PIX)
  const subId = payment.subscription
  let subscription: {
    id: string
    business_id: string
    grace_ends_at: string | null
  } | null = null

  if (subId) {
    const { data } = await admin
      .from('subscriptions')
      .select('id, business_id, grace_ends_at')
      .eq('asaas_subscription_id', subId)
      .single()
    subscription = data ?? null
  }

  if (!subscription && payment.externalReference?.includes('|')) {
    const businessId = payment.externalReference.split('|')[0]
    const { data } = await admin
      .from('subscriptions')
      .select('id, business_id, grace_ends_at')
      .eq('business_id', businessId)
      .single()
    subscription = data ?? null
  }

  if (!subscription) {
    console.log('[Asaas Webhook] OVERDUE sem subscription DB:', payment.id)
    return
  }

  // Período de graça: 3 dias após overdue antes de bloquear público.
  //
  // A carência é concedida UMA VEZ por ciclo de inadimplência. O Asaas REENVIA
  // PAYMENT_OVERDUE enquanto a cobrança segue vencida, e antes cada reenvio
  // reescrevia grace_ends_at = hoje+3 — o bloqueio era empurrado pra frente
  // indefinidamente e o pagante inadimplente nunca perdia acesso. Só pegava
  // quem paga de verdade: cortesia/trial não gera webhook do Asaas, então a
  // carência deles vencia normal. Visto em prod 31/08/2026, com a carência de
  // um pagante andando sozinha de 01/09 pra 03/09.
  //
  // Não reabrir a carência de quem já foi bloqueado também é proposital: grace
  // vencida no mesmo ciclo continua vencida. Quem paga tem grace_ends_at zerado
  // nos handlers de CONFIRMED/RECEIVED, e aí o próximo vencimento ganha 3 dias
  // novos — que é o único caminho pra uma carência nova.
  const update: { status: string; grace_ends_at?: string } = { status: 'past_due' }

  if (!subscription.grace_ends_at) {
    const graceEnds = new Date()
    graceEnds.setDate(graceEnds.getDate() + 3)
    update.grace_ends_at = graceEnds.toISOString()
  }

  await admin.from('subscriptions').update(update).eq('id', subscription.id)

  console.log(
    update.grace_ends_at
      ? `[Asaas Webhook] OVERDUE pra ${subscription.business_id} → past_due, graça até ${update.grace_ends_at}`
      : `[Asaas Webhook] OVERDUE reenviado pra ${subscription.business_id} → graça mantida em ${subscription.grace_ends_at}`
  )
}

// ─────────────────────────────────────────────────────────────────
// EMAIL HELPERS — disparados em fire-and-forget (void + catch) pra
// nao quebrar webhook se Resend falhar. Webhook sempre devolve 200.
// ─────────────────────────────────────────────────────────────────

async function notifyPaymentConfirmed(
  admin: AdminClient,
  subscriptionId: string,
  paymentValue: number | undefined,
  isFirstPayment = false
) {
  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan, plan_modalidade, price_cents, refund_deadline_at, business_id, businesses!inner(name, owner_id)')
    .eq('id', subscriptionId)
    .single()

  if (!sub) return
  const business = (sub.businesses as unknown) as { name: string; owner_id: string }

  // Alerta operacional (Telegram) — Eduardo quer saber quando cai pagamento,
  // com destaque pra CLIENTE NOVO (1ª ativação) vs renovação.
  //
  // AWAIT obrigatório, não `void` (28/07/2026): mesmo motivo do /api/cadastro.
  // Aqui ainda havia trabalho awaited depois, então o alerta costumava dar
  // tempo de sair — mas era corrida, não garantia. Alerta de dinheiro entrando
  // não pode depender de sorte.
  {
    const valorTg = (paymentValue ?? sub.price_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const planoTg = sub.plan === 'equipe' ? 'Equipe' : 'Solo'
    await sendAlert(
      isFirstPayment
        ? `🎉 <b>NOVO CLIENTE pagou!</b>\n<b>${business.name}</b> — ${valorTg} (${planoTg})`
        : `💰 <b>Renovação</b>\n<b>${business.name}</b> — ${valorTg} (${planoTg})`
    ).catch(() => {})
  }

  const { data: { user: ownerUser } } = await admin.auth.admin.getUserById(
    business.owner_id
  )
  if (!ownerUser?.email) return

  // ownerName: prioridade user_metadata → email (parte antes do @) → businessName.
  // Evita "Olá, Salão" quando businessName eh tipo "Salão da Erlane".
  const meta = (ownerUser.user_metadata ?? {}) as { full_name?: string; name?: string }
  const ownerName =
    meta.full_name ||
    meta.name ||
    ownerUser.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ||
    business.name

  const valorReais = paymentValue ?? sub.price_cents / 100
  const valorFmt = valorReais.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  await sendPaymentConfirmed({
    ownerEmail: ownerUser.email,
    ownerName,
    businessName: business.name,
    plan: (sub.plan === 'equipe' ? 'equipe' : 'solo') as 'solo' | 'equipe',
    valor: valorFmt,
    modalidade: sub.plan_modalidade as
      | 'mensal_cartao'
      | 'mensal_pix'
      | 'semestral_pix'
      | 'anual_pix',
    refundDeadline: sub.refund_deadline_at ? new Date(sub.refund_deadline_at) : null,
  })
}

async function notifyRefundProcessed(
  admin: AdminClient,
  subscriptionId: string,
  payment: AsaasWebhookPayment
) {
  const { data: sub } = await admin
    .from('subscriptions')
    .select('price_cents, business_id, businesses!inner(name, owner_id)')
    .eq('id', subscriptionId)
    .single()

  if (!sub) return
  const business = (sub.businesses as unknown) as { name: string; owner_id: string }

  const { data: { user: ownerUser } } = await admin.auth.admin.getUserById(
    business.owner_id
  )
  if (!ownerUser?.email) return

  const meta = (ownerUser.user_metadata ?? {}) as { full_name?: string; name?: string }
  const ownerName =
    meta.full_name ||
    meta.name ||
    ownerUser.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ||
    business.name

  const valorReais = payment.value ?? sub.price_cents / 100
  const valorFmt = valorReais.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  // billingType vem como 'PIX' | 'CREDIT_CARD' | 'BOLETO' do Asaas
  const paymentMethod: 'pix' | 'cartao' =
    payment.billingType === 'CREDIT_CARD' ? 'cartao' : 'pix'

  await sendRefundProcessed({
    ownerEmail: ownerUser.email,
    ownerName,
    businessName: business.name,
    valor: valorFmt,
    paymentMethod,
  })
}
