import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit-api'

// =====================================================================
// POST /api/billing/cancel
// Cancela assinatura no MP (preapproval) e, se ainda estiver no prazo
// de arrependimento de 7 dias (CDC art. 49), solicita refund automático
// do último pagamento aprovado.
// =====================================================================

const ARREPENDIMENTO_DAYS = 7

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
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
    .select('id, mp_subscription_id, status')
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

  // === 1. Cancelar preapproval no Mercado Pago (com verificação) ===
  if (subscription.mp_subscription_id && accessToken) {
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
        console.error('[billing/cancel] MP cancel failed', cancelRes.status, errBody)
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

    // === 2. Verificar arrependimento + refund automático ===
    try {
      const paymentsRes = await fetch(
        `https://api.mercadopago.com/v1/payments/search?` +
          new URLSearchParams({
            'preapproval_id': subscription.mp_subscription_id,
            'status': 'approved',
            'sort': 'date_approved',
            'criteria': 'desc',
            'limit': '1',
          }).toString(),
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      )

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json()
        const lastPayment = paymentsData?.results?.[0]

        if (lastPayment?.date_approved && lastPayment?.id) {
          const approvedAt = new Date(lastPayment.date_approved)
          const now = new Date()
          const daysSince =
            (now.getTime() - approvedAt.getTime()) / (1000 * 60 * 60 * 24)

          if (daysSince <= ARREPENDIMENTO_DAYS) {
            // Solicitar refund total (CDC art. 49 — direito de arrependimento)
            const refundRes = await fetch(
              `https://api.mercadopago.com/v1/payments/${lastPayment.id}/refunds`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                  'X-Idempotency-Key': `refund-${lastPayment.id}-${Date.now()}`,
                },
              }
            )

            if (refundRes.ok) {
              refunded = true
              refundAmount = lastPayment.transaction_amount ?? null
            } else {
              const refundErrBody = await refundRes.text().catch(() => '')
              refundError = `MP refund returned ${refundRes.status}`
              console.error(
                '[billing/cancel] Refund failed for payment',
                lastPayment.id,
                refundRes.status,
                refundErrBody
              )
            }
          }
        }
      } else {
        console.error(
          '[billing/cancel] Payments search failed',
          paymentsRes.status
        )
      }
    } catch (err) {
      refundError = 'network_error'
      console.error('[billing/cancel] Refund flow error', err)
    }
  }

  // === 3. Marcar DB como cancelado (depois de MP confirmado) ===
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
    refunded,
    refund_amount: refundAmount,
    refund_error: refundError,
  })
}
