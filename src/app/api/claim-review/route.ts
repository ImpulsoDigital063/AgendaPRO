import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const { businessId, phone } = await req.json()

  if (!businessId || !phone) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const supabase = getAdminClient()

  // Busca o negócio e os pontos configurados
  const { data: business } = await supabase
    .from('businesses')
    .select('points_for_review')
    .eq('id', businessId)
    .single()

  if (!business || !business.points_for_review || business.points_for_review <= 0) {
    return NextResponse.json({ error: 'Pontos por review não configurados.' }, { status: 400 })
  }

  // Busca o customer
  const { data: customer } = await supabase
    .from('customers')
    .select('id, total_points')
    .eq('business_id', businessId)
    .eq('phone', phone.trim())
    .maybeSingle()

  if (!customer) {
    return NextResponse.json({ error: 'Telefone não encontrado. Faça um agendamento primeiro.' }, { status: 404 })
  }

  // Verifica se já resgatou pontos de review
  const { data: alreadyClaimed } = await supabase
    .from('points_transactions')
    .select('id')
    .eq('customer_id', customer.id)
    .eq('reason', 'review')
    .maybeSingle()

  if (alreadyClaimed) {
    return NextResponse.json({ error: 'Você já resgatou pontos por avaliação.' }, { status: 409 })
  }

  // Credita os pontos
  await supabase.from('points_transactions').insert({
    customer_id: customer.id,
    business_id: businessId,
    points: business.points_for_review,
    reason: 'review',
    appointment_id: null,
  })

  await supabase
    .from('customers')
    .update({ total_points: (customer.total_points ?? 0) + business.points_for_review })
    .eq('id', customer.id)

  return NextResponse.json({ points: business.points_for_review })
}
