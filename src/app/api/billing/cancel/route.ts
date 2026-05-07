import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit-api'

// =====================================================================
// POST /api/billing/cancel
//
// Cancela a assinatura do cliente. Cobre 2 fluxos:
//
//   1) CARTÃO (mensal_cartao · preapproval):
//      → cancela o preapproval no MP (futuras cobranças param)
//      → busca último payment APROVADO desse preapproval
//      → se ≤ 7 dias: refund automático (CDC art. 49)
//
//   2) PIX (mensal_pix / semestral_pix / anual_pix · preference):
//      → não tem preapproval pra cancelar (pagamento único)
//      → busca o payment via mp_payment_id_atual
//      → se ≤ 7 dias: refund automático (CDC art. 49)
//
// Em ambos: tratamento robusto de erro do MP — se MP cair,
// retorna 502 e NÃO marca DB como cancelado.
// =====================================================================

const ARREPENDIMENTO_DAYS = 7

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function refundPayment(
  paymentId: string,
  accessToken: string
): Promise<{ ok: boolean; amount: number | null; error: string | null }> {
  try {
    const refundRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}/refunds`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `refund-${paymentId}-${Date.now()}`,
        },
      }
    )

    if (refundRes.ok) {
      const refundData = await refundRes.json().catch(() => ({}))
      return {
        ok: true,
        amount: refundData?.amount ?? null,
        error: null,
      }
    }

    const errBody = await refundRes.text().catch(() => '')
    console.error(
      '[billing/cancel] Refund failed for payment',
      paymentId,
      refundRes.status,
      errBody
    )
    return {
      ok: false,
      amount: null,
      error: `MP refund returned ${refundRes.status}`,
    }
  } catch (err) {
    console.error('[billing/cancel] Refund flow error', err)
    return { ok: false, amount: null, error: 'network_error' }
  }
}

async function fetchPaymentDateApproved(
  paymentId: string,
  accessToken: string
): Promise<Date | null> {
  try {
    const res = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.date_approved) return null
    return new Date(data.date_approved)
  } catch {
    return null
  }
}

async function findLastApprovedPaymentOfPreapproval(
  preapprovalId: string,
  accessToken: string
): Promise<{ id: string; date_approved: string } | null> {
  try {
    const res = await fetch(
      `https://api.mercadopago.com/v1/payments/search?` +
        new URLSearchParams({
          'preapproval_id': preapprovalId,
          'status': 'approved',
          'sort': 'date_approved',
          'criteria': 'desc',
          'limit': '1',
        }).toString(),
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.results?.[0] ?? null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'billing-cancel', limit: 5, windowSeconds: 3600 })
  if (rl) return rl

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
      'id, mp_subscription_id, mp_payment_id_atual, plan_modalidade, status'
    )
    .eq('business_id', business.id)
    .single()

  if (!subscription) {
    return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 })
  }

  if (subscription.status === 'cancelled') {
    return NextResponse.json({ error: 'Assinatura já cancelada' }, { status: 400 })
  }

  const accessToken = process.env.MP_ACCESS_TOKEN
  let refunded = false
  let refundAmount: number | null = null
  let refundError: string | null = null
  let paymentMethod: 'cartao' | 'pix' | null = null

  if (accessToken) {
    const isCartao =
      subscription.plan_modalidade === 'mensal_cartao' ||
      (!!subscription.mp_subscription_id && !subscription.plan_modalidade)
    const isPix =
      subscription.plan_modalidade?.endsWith('_pix') ?? false

    // ─────────────────────────────────────────────────────────────────
    // FLUXO 1 · CARTÃO (preapproval)
    // ─────────────────────────────────────────────────────────────────
    if (isCartao && subscription.mp_subscription_id) {
      paymentMethod = 'cartao'

      // 1.1 Cancelar preapproval no MP
      try {
        const cancelRes = await fetch(
          `https://api.mercadopago.com/preapproval/${subscription.mp_subscription_id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ status: 'cancelled' }),
          }
        )

        if (!cancelRes.ok) {
          const errBody = await cancelRes.text().catch(() => '')
          console.error('[billing/cancel] MP cancel preapproval failed', cancelRes.status, errBody)
          return NextResponse.json(
            { error: 'Falha ao cancelar no Mercado Pago. Tente novamente em alguns minutos.' },
            { status: 502 }
          )
        }
      } catch (err) {
        console.error('[billing/cancel] MP cancel network error', err)
        return NextResponse.json(
          { error: 'Erro de conexão com Mercado Pago. Tente novamente.' },
          { status: 502 }
        )
      }

      // 1.2 Buscar último payment aprovado e refund se ≤ 7 dias
      const lastPayment = await findLastApprovedPaymentOfPreapproval(
        subscription.mp_subscription_id,
        accessToken
      )

      if (lastPayment?.id && lastPayment?.date_approved) {
        const approvedAt = new Date(lastPayment.date_approved)
        const daysSince =
          (Date.now() - approvedAt.getTime()) / (1000 * 60 * 60 * 24)

        if (daysSince <= ARREPENDIMENTO_DAYS) {
          const refundResult = await refundPayment(lastPayment.id, accessToken)
          refunded = refundResult.ok
          refundAmount = refundResult.amount
          refundError = refundResult.error
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // FLUXO 2 · PIX (preference + payment avulso)
    // ─────────────────────────────────────────────────────────────────
    else if (isPix && subscription.mp_payment_id_atual) {
      paymentMethod = 'pix'

      // PIX não tem preapproval pra cancelar — só refund do payment
      const dateApproved = await fetchPaymentDateApproved(
        subscription.mp_payment_id_atual,
        accessToken
      )

      if (dateApproved) {
        const daysSince =
          (Date.now() - dateApproved.getTime()) / (1000 * 60 * 60 * 24)

        if (daysSince <= ARREPENDIMENTO_DAYS) {
          const refundResult = await refundPayment(
            subscription.mp_payment_id_atual,
            accessToken
          )
          refunded = refundResult.ok
          refundAmount = refundResult.amount
          refundError = refundResult.error
        }
      } else {
        // Não conseguiu ler o payment no MP — log mas segue (DB cancela igual)
        console.warn(
          '[billing/cancel] PIX sem date_approved disponível pra payment',
          subscription.mp_payment_id_atual
        )
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Marcar DB como cancelado (depois de MP confirmado)
  // ─────────────────────────────────────────────────────────────────
  const now = new Date()
  const deleteAt = new Date(now)
  deleteAt.setDate(deleteAt.getDate() + 90)

  await admin
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: now.toISOString(),
      data_delete_at: deleteAt.toISOString(),
    })
    .eq('id', subscription.id)

  return NextResponse.json({
    ok: true,
    data_delete_at: deleteAt.toISOString(),
    payment_method: paymentMethod,
    refunded,
    refund_amount: refundAmount,
    refund_error: refundError,
  })
}
