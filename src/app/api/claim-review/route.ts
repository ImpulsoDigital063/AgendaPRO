import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { success } = rateLimit({ key: `claim:${ip}`, limit: 10, windowSeconds: 3600 })
  if (!success) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde 1 hora.' }, { status: 429 })
  }

  // Requer autenticação — só o dono do negócio pode creditar pontos
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const { businessId, phone } = await req.json()

  if (!businessId || !phone) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  // Verifica que o user é dono do negócio
  const { data: business } = await supabase
    .from('businesses')
    .select('id, points_for_review')
    .eq('id', businessId)
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Negócio não encontrado.' }, { status: 403 })
  }

  if (!business.points_for_review || business.points_for_review <= 0) {
    return NextResponse.json({ error: 'Pontos por review não configurados.' }, { status: 400 })
  }

  const adminClient = getAdminClient()

  // Busca o customer
  const { data: customer } = await adminClient
    .from('customers')
    .select('id, total_points')
    .eq('business_id', businessId)
    .eq('phone', phone.trim())
    .maybeSingle()

  if (!customer) {
    return NextResponse.json({ error: 'Telefone não encontrado. Faça um agendamento primeiro.' }, { status: 404 })
  }

  // Verifica se já resgatou pontos de review
  const { data: alreadyClaimed } = await adminClient
    .from('points_transactions')
    .select('id')
    .eq('customer_id', customer.id)
    .eq('reason', 'review')
    .maybeSingle()

  if (alreadyClaimed) {
    return NextResponse.json({ error: 'Você já resgatou pontos por avaliação.' }, { status: 409 })
  }

  // Credita os pontos
  await adminClient.from('points_transactions').insert({
    customer_id: customer.id,
    business_id: businessId,
    points: business.points_for_review,
    reason: 'review',
    appointment_id: null,
  })

  await adminClient
    .from('customers')
    .update({ total_points: (customer.total_points ?? 0) + business.points_for_review })
    .eq('id', customer.id)

  return NextResponse.json({ points: business.points_for_review })
}
