import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit-api'

// GET /api/billing/status — retorna status da assinatura do usuário logado
export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'billing-status', limit: 60, windowSeconds: 60 })
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

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(`
      plan, status, price_cents, setup_cents,
      setup_paid_at, refund_deadline_at, refunded_at,
      current_period_start, current_period_end,
      grace_ends_at, public_blocked_at, cancelled_at,
      provider, plan_modalidade, pago_ate
    `)
    .eq('business_id', business.id)
    .single()

  if (!subscription) {
    return NextResponse.json({ subscription: null })
  }

  const now = new Date()

  // Admin bloqueado quando: past_due + grace expirou | cancelado | refund executado
  const graceExpired = subscription.grace_ends_at && new Date(subscription.grace_ends_at) < now
  const adminBlocked =
    subscription.status === 'cancelled' ||
    !!subscription.refunded_at ||
    (subscription.status === 'past_due' && graceExpired)

  // Página pública bloqueada: public_blocked_at passou
  const publicBlocked = subscription.public_blocked_at && new Date(subscription.public_blocked_at) < now

  // Dentro da janela de garantia: pagou, ainda não pediu refund, e dentro dos 7 dias
  const withinRefundWindow =
    subscription.status === 'active' &&
    !subscription.refunded_at &&
    subscription.refund_deadline_at &&
    new Date(subscription.refund_deadline_at) > now

  const refundDaysLeft = withinRefundWindow && subscription.refund_deadline_at
    ? Math.max(0, Math.ceil(
        (new Date(subscription.refund_deadline_at).getTime() - now.getTime())
        / (1000 * 60 * 60 * 24)
      ))
    : null

  return NextResponse.json({
    subscription: {
      ...subscription,
      admin_blocked: !!adminBlocked,
      public_blocked: !!publicBlocked,
      within_refund_window: !!withinRefundWindow,
      refund_days_left: refundDaysLeft,
    },
  })
}
