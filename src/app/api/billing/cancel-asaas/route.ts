import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit-api'
import {
  cancelSubscription,
  listSubscriptionPayments,
  getPaymentById,
  refundPayment,
  type AsaasPayment,
} from '@/lib/asaas'
import { sendRefundFailedAlert } from '@/lib/email'

// =====================================================================
// POST /api/billing/cancel-asaas
//
// Variante Asaas do /api/billing/cancel.
// Cobre 2 fluxos (igual ao MP):
//
//   1) CARTÃO recorrente (subscription)
//      → cancela subscription Asaas
//      → busca último payment CONFIRMED/RECEIVED
//      → se ≤ 7 dias: refund automático
//
//   2) PIX (payment avulso)
//      → não tem subscription pra cancelar
//      → busca payment via asaas_payment_id_atual
//      → se ≤ 7 dias: refund
//
// Tratamento robusto: erro do Asaas → 502 + DB intacto.
// =====================================================================

const ARREPENDIMENTO_DAYS = 7

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function isApprovedStatus(status: AsaasPayment['status']): boolean {
  return status === 'CONFIRMED' || status === 'RECEIVED' || status === 'RECEIVED_IN_CASH'
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, {
    key: 'billing-cancel-asaas',
    limit: 5,
    windowSeconds: 3600,
  })
  if (rl) return rl

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Negócio não encontrado' }, { status: 404 })
  }

  const admin = getAdminClient()

  const { data: subscription } = await admin
    .from('subscriptions')
    .select(
      'id, asaas_subscription_id, asaas_payment_id_atual, plan_modalidade, status, provider, refund_deadline_at'
    )
    .eq('business_id', business.id)
    .single()

  if (!subscription) {
    return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 })
  }

  if (subscription.status === 'cancelled') {
    return NextResponse.json({ error: 'Assinatura já cancelada' }, { status: 400 })
  }

  if (subscription.provider !== 'asaas') {
    return NextResponse.json(
      { error: 'Esta assinatura não é Asaas. Use /api/billing/cancel.' },
      { status: 400 }
    )
  }

  let refunded = false
  let refundAmount: number | null = null
  let refundError: string | null = null
  let paymentMethod: 'cartao' | 'pix' | null = null

  const isCartao = subscription.plan_modalidade === 'mensal_cartao'
  const isPix = subscription.plan_modalidade?.endsWith('_pix') ?? false

  const now = new Date()

  // Cliente esta dentro da janela de garantia de 7 dias?
  // Source of truth: refund_deadline_at (setado no webhook quando setup_paid_at).
  // Se sim, refund eh OBRIGATORIO — se Asaas rejeitar (saldo insuficiente,
  // payment ja estornado, etc), NAO cancela no DB. Cliente tenta de novo
  // ou fala no WhatsApp.
  const withinRefundWindow =
    !!subscription.refund_deadline_at &&
    new Date(subscription.refund_deadline_at) > now

  // ─────────────────────────────────────────────────────────────────
  // FLUXO 1 · CARTÃO (subscription)
  // ─────────────────────────────────────────────────────────────────
  if (isCartao && subscription.asaas_subscription_id) {
    paymentMethod = 'cartao'

    // 1.1 Cancelar subscription
    const cancelRes = await cancelSubscription(subscription.asaas_subscription_id)
    if (!cancelRes.ok) {
      console.error('[cancel-asaas] cancel subscription failed', cancelRes.error)
      return NextResponse.json(
        {
          error:
            'Falha ao cancelar no Asaas. Tente novamente em alguns minutos.',
        },
        { status: 502 }
      )
    }

    // 1.2 Buscar último payment aprovado
    const paysRes = await listSubscriptionPayments(
      subscription.asaas_subscription_id
    )

    if (paysRes.ok && paysRes.data?.data) {
      const lastApproved = paysRes.data.data
        .filter((p) => isApprovedStatus(p.status))
        .sort((a, b) => {
          const dA = new Date(a.paymentDate ?? a.clientPaymentDate ?? 0).getTime()
          const dB = new Date(b.paymentDate ?? b.clientPaymentDate ?? 0).getTime()
          return dB - dA
        })[0]

      if (lastApproved?.id) {
        const paidAtStr =
          lastApproved.paymentDate ?? lastApproved.clientPaymentDate
        if (paidAtStr) {
          const paidAt = new Date(paidAtStr)
          const daysSince = (Date.now() - paidAt.getTime()) / (1000 * 60 * 60 * 24)

          if (daysSince <= ARREPENDIMENTO_DAYS) {
            const refundRes = await refundPayment({ paymentId: lastApproved.id })
            if (refundRes.ok) {
              refunded = true
              refundAmount = lastApproved.value ?? null
            } else {
              refundError = refundRes.error
              console.error('[cancel-asaas] refund failed', refundRes.error)
            }
          }
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // FLUXO 2 · PIX (payment avulso)
  // ─────────────────────────────────────────────────────────────────
  else if (isPix && subscription.asaas_payment_id_atual) {
    paymentMethod = 'pix'

    const payRes = await getPaymentById(subscription.asaas_payment_id_atual)
    if (payRes.ok && payRes.data) {
      const payment = payRes.data
      if (isApprovedStatus(payment.status)) {
        const paidAtStr = payment.paymentDate ?? payment.clientPaymentDate
        if (paidAtStr) {
          const paidAt = new Date(paidAtStr)
          const daysSince = (Date.now() - paidAt.getTime()) / (1000 * 60 * 60 * 24)

          if (daysSince <= ARREPENDIMENTO_DAYS) {
            const refundRes = await refundPayment({ paymentId: payment.id })
            if (refundRes.ok) {
              refunded = true
              refundAmount = payment.value ?? null
            } else {
              refundError = refundRes.error
              console.error('[cancel-asaas] refund pix failed', refundRes.error)
            }
          }
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Decisao: cancelar no DB ou bloquear?
  // ─────────────────────────────────────────────────────────────────

  // Cliente dentro da janela de garantia + refund FALHOU = NAO cancela.
  // Cliente fica em estado "pendente cancelamento" — tenta de novo ou
  // contata suporte. Evita: cliente cancelar, perder acesso, mas nao
  // receber a grana de volta.
  if (withinRefundWindow && !refunded && refundError) {
    console.error(
      `[cancel-asaas] refund obrigatorio FALHOU pra business ${business.id}: ${refundError}`
    )

    // Alerta o owner (Eduardo) por email pra intervir manualmente
    void sendRefundFailedAlert({
      businessId: business.id,
      paymentMethod: paymentMethod ?? 'pix',
      refundError,
    }).catch((err) =>
      console.error('[cancel-asaas] sendRefundFailedAlert falhou:', err)
    )

    return NextResponse.json(
      {
        error:
          'Não conseguimos processar o reembolso agora. Tenta de novo em alguns minutos ou fala comigo no WhatsApp pra resolver.',
        refund_error: refundError,
      },
      { status: 502 }
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // Marcar DB como cancelado
  // ─────────────────────────────────────────────────────────────────
  const deleteAt = new Date(now)
  deleteAt.setDate(deleteAt.getDate() + 90)

  const updatePayload: Record<string, unknown> = {
    status: 'cancelled',
    cancelled_at: now.toISOString(),
    data_delete_at: deleteAt.toISOString(),
  }

  // Se refund foi processado (Asaas aceitou), marca refunded_at IMEDIATO.
  // Webhook PAYMENT_REFUNDED vai chegar depois e re-confirmar — eh idempotente.
  // Marcar agora resolve: layout /admin/(protected) ja redireciona pra
  // /admin/bloqueado (porque blocked = !!refunded_at), cliente nao continua
  // usando o painel apos pedir reembolso.
  if (refunded) {
    updatePayload.refunded_at = now.toISOString()
  }

  await admin
    .from('subscriptions')
    .update(updatePayload)
    .eq('id', subscription.id)

  return NextResponse.json({
    ok: true,
    data_delete_at: deleteAt.toISOString(),
    payment_method: paymentMethod,
    refunded,
    refund_amount: refundAmount,
    refund_error: refundError,
    within_refund_window: withinRefundWindow,
  })
}
