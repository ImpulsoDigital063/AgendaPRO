import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/billing/cancel — cliente cancela assinatura pelo painel
export async function POST(req: NextRequest) {
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

  // Buscar assinatura
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

  // Cancelar no Mercado Pago (se tiver subscription ativa)
  if (subscription.mp_subscription_id) {
    const accessToken = process.env.MP_ACCESS_TOKEN
    if (accessToken) {
      await fetch(`https://api.mercadopago.com/preapproval/${subscription.mp_subscription_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: 'cancelled' }),
      })
    }
  }

  // Atualizar no banco
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

  return NextResponse.json({ ok: true, data_delete_at: deleteAt.toISOString() })
}
