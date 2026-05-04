import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit-api'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/appointment/award-punctuality
// Concede o bônus de pontualidade configurado no negócio.
// Aceita admin (dono do negócio) ou profissional dono do agendamento.
// Idempotente: se já foi concedido, retorna ok sem duplicar.
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'award-punctuality', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const { appointmentId } = await req.json() as { appointmentId?: string }
  if (!appointmentId) {
    return NextResponse.json({ error: 'appointmentId obrigatório.' }, { status: 400 })
  }

  const admin = getAdminClient()

  // 1. Carrega o agendamento + negócio
  const { data: appointment } = await admin
    .from('appointments')
    .select('id, business_id, professional_id, client_phone, punctuality_awarded')
    .eq('id', appointmentId)
    .single()

  if (!appointment) {
    return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 })
  }

  // 2. Idempotência: se já foi concedido, retorna ok sem inserir de novo
  if (appointment.punctuality_awarded) {
    return NextResponse.json({ ok: true, alreadyAwarded: true })
  }

  // 3. Autorização: ou é dono do negócio, ou é o profissional do agendamento
  const { data: business } = await admin
    .from('businesses')
    .select('id, owner_id, punctuality_bonus_points')
    .eq('id', appointment.business_id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Negócio não encontrado.' }, { status: 404 })
  }

  const isOwner = business.owner_id === user.id

  let isProfessional = false
  if (!isOwner) {
    const { data: prof } = await admin
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('business_id', appointment.business_id)
      .single()
    isProfessional = !!prof && prof.id === appointment.professional_id
  }

  if (!isOwner && !isProfessional) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  const bonusPoints = business.punctuality_bonus_points ?? 10
  if (bonusPoints <= 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'bonus_zero' })
  }

  // 4. Localiza o customer pelo phone+business
  const { data: customer } = await admin
    .from('customers')
    .select('id, total_points')
    .eq('business_id', appointment.business_id)
    .eq('phone', appointment.client_phone)
    .single()

  if (!customer) {
    // Cliente ainda não existe no programa de fidelidade — só marca a flag.
    // O trigger normal de `service` cria o customer no momento do completed,
    // então essa request deve ser feita após o status virar completed.
    return NextResponse.json(
      { error: 'Cliente ainda não cadastrado no programa de fidelidade.' },
      { status: 409 }
    )
  }

  // 5. Insere transaction de pontualidade + soma no saldo + marca flag
  const { error: insertError } = await admin
    .from('points_transactions')
    .insert({
      customer_id: customer.id,
      business_id: appointment.business_id,
      points: bonusPoints,
      reason: 'punctuality',
      appointment_id: appointment.id,
      professional_id: appointment.professional_id,
    })

  if (insertError) {
    return NextResponse.json({ error: 'Erro ao registrar pontos.' }, { status: 500 })
  }

  await admin
    .from('customers')
    .update({ total_points: (customer.total_points ?? 0) + bonusPoints })
    .eq('id', customer.id)

  await admin
    .from('appointments')
    .update({ punctuality_awarded: true })
    .eq('id', appointment.id)

  return NextResponse.json({ ok: true, bonusPoints })
}
