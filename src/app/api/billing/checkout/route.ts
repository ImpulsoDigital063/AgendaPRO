import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/billing/checkout — cria assinatura no Mercado Pago e redireciona
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { plan } = await req.json() as { plan?: string }
  if (!plan || !['solo', 'equipe'].includes(plan)) {
    return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
  }

  const admin = getAdminClient()

  // Buscar o negócio do usuário
  const { data: business } = await admin
    .from('businesses')
    .select('id, name, slug')
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Negócio não encontrado' }, { status: 404 })
  }

  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) {
    return NextResponse.json({ error: 'Mercado Pago não configurado' }, { status: 500 })
  }

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agendapro.net.br'
  const priceBRL = plan === 'solo' ? 67 : 107

  // Criar preferência de assinatura no Mercado Pago
  const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      reason: `AgendaPRO — Plano ${plan === 'solo' ? 'Solo' : 'Equipe'}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: priceBRL,
        currency_id: 'BRL',
      },
      payer_email: user.email,
      back_url: `${APP_URL}/admin`,
      external_reference: business.id,
      notification_url: `${APP_URL}/api/webhooks/mercadopago`,
    }),
  })

  if (!mpResponse.ok) {
    const error = await mpResponse.text()
    console.error('[Billing] Erro ao criar assinatura no MP:', error)
    return NextResponse.json({ error: 'Erro ao criar assinatura' }, { status: 500 })
  }

  const mpData = await mpResponse.json()

  // Atualizar subscription no banco com o ID do MP
  await admin
    .from('subscriptions')
    .update({
      mp_subscription_id: mpData.id,
      plan,
      price_cents: priceBRL * 100,
    })
    .eq('business_id', business.id)

  return NextResponse.json({
    url: mpData.init_point, // URL do checkout do Mercado Pago
    subscription_id: mpData.id,
  })
}
