import { NextRequest, NextResponse } from 'next/server'
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

  const { businessId, phone } = await req.json()

  if (!businessId || !phone || typeof phone !== 'string') {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const adminClient = getAdminClient()

  // Valida que o negócio existe + tem programa de pontos por review ativo
  const { data: business } = await adminClient
    .from('businesses')
    .select('id, points_for_review')
    .eq('id', businessId)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Negócio não encontrado.' }, { status: 404 })
  }

  if (!business.points_for_review || business.points_for_review <= 0) {
    return NextResponse.json({ error: 'Programa de pontos por avaliação não está ativo.' }, { status: 400 })
  }

  // Busca o customer
  const { data: customer } = await adminClient
    .from('customers')
    .select('id, name, phone')
    .eq('business_id', businessId)
    .eq('phone', phone.trim())
    .maybeSingle()

  if (!customer) {
    return NextResponse.json({ error: 'Telefone não encontrado. Faça um agendamento primeiro.' }, { status: 404 })
  }

  // Já tem claim approved? Não pode pedir de novo.
  const { data: existingApproved } = await adminClient
    .from('review_claims')
    .select('id')
    .eq('business_id', businessId)
    .eq('customer_id', customer.id)
    .eq('status', 'approved')
    .maybeSingle()

  if (existingApproved) {
    return NextResponse.json({ error: 'Você já recebeu pontos por avaliação neste estabelecimento.' }, { status: 409 })
  }

  // Já tem claim pending? Não duplica.
  const { data: existingPending } = await adminClient
    .from('review_claims')
    .select('id')
    .eq('business_id', businessId)
    .eq('customer_id', customer.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingPending) {
    return NextResponse.json({
      ok: true,
      pending: true,
      message: 'Pedido já registrado. Aguarde o estabelecimento aprovar.',
    })
  }

  // Cria claim pending
  const { error: insertError } = await adminClient.from('review_claims').insert({
    business_id: businessId,
    customer_id: customer.id,
    customer_phone: customer.phone,
    customer_name: customer.name,
    status: 'pending',
  })

  if (insertError) {
    return NextResponse.json({ error: 'Erro ao registrar pedido. Tente novamente.' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    pending: true,
    message: 'Pedido enviado! O estabelecimento vai confirmar tua avaliação em breve.',
  })
}
