import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/billing/status — retorna status da assinatura do usuário logado
export async function GET() {
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
    .select('plan, status, trial_ends_at, current_period_end, grace_ends_at, public_blocked_at, cancelled_at')
    .eq('business_id', business.id)
    .single()

  if (!subscription) {
    return NextResponse.json({ subscription: null })
  }

  // Verificar se trial expirou
  const now = new Date()
  let effectiveStatus = subscription.status

  if (subscription.status === 'trial' && new Date(subscription.trial_ends_at) < now) {
    effectiveStatus = 'expired'
  }

  // Verificar se grace period expirou (admin bloqueado)
  const adminBlocked = subscription.grace_ends_at && new Date(subscription.grace_ends_at) < now

  // Verificar se página pública deve ser bloqueada
  const publicBlocked = subscription.public_blocked_at && new Date(subscription.public_blocked_at) < now

  return NextResponse.json({
    subscription: {
      ...subscription,
      effective_status: effectiveStatus,
      admin_blocked: !!adminBlocked,
      public_blocked: !!publicBlocked,
    },
  })
}
