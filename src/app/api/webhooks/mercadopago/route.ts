import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/webhooks/mercadopago — recebe notificações do Mercado Pago
export async function POST(req: NextRequest) {
  const body = await req.json()

  console.log('[MP Webhook] Recebido:', JSON.stringify(body))

  const { type, data } = body

  // Mercado Pago envia vários tipos de notificação
  // Os que nos interessam: subscription_preapproval (status da assinatura)
  // e payment (pagamento aprovado/recusado)
  if (type === 'subscription_preapproval') {
    await handleSubscriptionUpdate(data.id)
  } else if (type === 'payment') {
    await handlePayment(data.id)
  }

  // Sempre retorna 200 pro MP não reenviar
  return NextResponse.json({ ok: true })
}

async function handleSubscriptionUpdate(mpSubscriptionId: string) {
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) return

  // Buscar detalhes da assinatura no MP
  const res = await fetch(`https://api.mercadopago.com/preapproval/${mpSubscriptionId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    console.error('[MP Webhook] Erro ao buscar assinatura:', await res.text())
    return
  }

  const sub = await res.json()
  const admin = getAdminClient()

  // external_reference = business_id
  const businessId = sub.external_reference

  if (!businessId) {
    console.error('[MP Webhook] external_reference vazio para subscription:', mpSubscriptionId)
    return
  }

  // Mapear status do MP para status do AgendaPRO
  let status: string
  const updateData: Record<string, unknown> = {
    mp_subscription_id: mpSubscriptionId,
    mp_payer_id: sub.payer_id?.toString() || null,
  }

  switch (sub.status) {
    case 'authorized':
    case 'active':
      status = 'active'
      updateData.grace_ends_at = null
      updateData.public_blocked_at = null
      updateData.cancelled_at = null
      updateData.data_delete_at = null
      break

    case 'paused':
    case 'pending':
      status = 'past_due'
      // Grace period: 5 dias a partir de agora
      if (!updateData.grace_ends_at) {
        const graceEnd = new Date()
        graceEnd.setDate(graceEnd.getDate() + 5)
        updateData.grace_ends_at = graceEnd.toISOString()

        // Bloqueio público: grace + 7 dias = 12 dias total
        const publicBlock = new Date(graceEnd)
        publicBlock.setDate(publicBlock.getDate() + 7)
        updateData.public_blocked_at = publicBlock.toISOString()
      }
      break

    case 'cancelled':
      status = 'cancelled'
      const now = new Date()
      updateData.cancelled_at = now.toISOString()
      // Dados serão deletados em 90 dias
      const deleteAt = new Date(now)
      deleteAt.setDate(deleteAt.getDate() + 90)
      updateData.data_delete_at = deleteAt.toISOString()
      break

    default:
      console.log('[MP Webhook] Status não mapeado:', sub.status)
      return
  }

  updateData.status = status

  const { error } = await admin
    .from('subscriptions')
    .update(updateData)
    .eq('business_id', businessId)

  if (error) {
    console.error('[MP Webhook] Erro ao atualizar subscription:', error)
  } else {
    console.log(`[MP Webhook] Subscription ${businessId} atualizada para ${status}`)
  }
}

async function handlePayment(paymentId: string) {
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) return

  // Buscar detalhes do pagamento
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    console.error('[MP Webhook] Erro ao buscar payment:', await res.text())
    return
  }

  const payment = await res.json()
  const admin = getAdminClient()

  if (payment.status === 'approved') {
    // Pagamento aprovado — reativar se estava inadimplente
    const { data: sub } = await admin
      .from('subscriptions')
      .select('id, status, business_id')
      .eq('mp_subscription_id', payment.metadata?.preapproval_id || '')
      .single()

    if (sub && (sub.status === 'past_due' || sub.status === 'cancelled')) {
      const periodEnd = new Date()
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      await admin
        .from('subscriptions')
        .update({
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          grace_ends_at: null,
          public_blocked_at: null,
          cancelled_at: null,
          data_delete_at: null,
        })
        .eq('id', sub.id)

      console.log(`[MP Webhook] Subscription ${sub.business_id} reativada via payment ${paymentId}`)
    }
  }
}
