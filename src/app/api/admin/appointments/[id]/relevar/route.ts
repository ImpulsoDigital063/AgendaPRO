/**
 * POST /api/admin/appointments/[id]/relevar
 *
 * Reverte uma punição por no-show aplicada automaticamente pelo trigger
 * apply_no_show_penalty (v46). Decisão 13 com Eduardo: dono pode "relevar"
 * caso a caso quando cliente teve emergência legítima.
 *
 * Lógica:
 *   1. Auth: owner OU professional do appointment (mesma do edit-services)
 *   2. Acha points_transaction mais recente com:
 *      - appointment_id = id
 *      - reason = 'no_show_penalty'
 *   3. INSERT inverso · points = ABS(original) · reason = 'no_show_relevado'
 *   4. UPDATE customers.total_points += valor
 *   5. Activity log: 'no_show_relevado'
 *
 * Idempotência: se já foi relevado (já existe transaction com reason
 * 'no_show_relevado' pra esse appointment), retorna 409 com mensagem clara.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/lib/rate-limit-api'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(req, { key: 'admin-appt-relevar', limit: 30, windowSeconds: 60 })
  if (rl) return rl

  const { id: appointmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const admin = getAdminClient()

  // 1. Carrega appointment
  const { data: appointment } = await admin
    .from('appointments')
    .select('id, business_id, professional_id, status, client_name')
    .eq('id', appointmentId)
    .single()

  if (!appointment) {
    return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 })
  }

  // 2. Auth · owner OR professional do appointment
  const [ownerRes, profRes] = await Promise.all([
    admin
      .from('businesses')
      .select('id')
      .eq('id', appointment.business_id)
      .eq('owner_id', user.id)
      .maybeSingle(),
    admin
      .from('professionals')
      .select('id, business_id')
      .eq('auth_user_id', user.id)
      .maybeSingle(),
  ])
  const isOwner = !!ownerRes.data
  const isProfOfAppt =
    !!profRes.data &&
    profRes.data.business_id === appointment.business_id &&
    profRes.data.id === appointment.professional_id
  if (!isOwner && !isProfOfAppt) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  // 3. Busca a punição original · ordenada por created_at DESC pra pegar a mais recente
  // (no caso raro de múltiplas tentativas de mark no_show · pega a última)
  const { data: penalty } = await admin
    .from('points_transactions')
    .select('id, customer_id, points, business_id')
    .eq('appointment_id', appointmentId)
    .eq('reason', 'no_show_penalty')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!penalty) {
    return NextResponse.json(
      { error: 'Nenhuma punição encontrada pra reverter.' },
      { status: 404 },
    )
  }

  // 4. Idempotência: se já foi relevado, retorna 409
  const { data: existingRelevado } = await admin
    .from('points_transactions')
    .select('id')
    .eq('appointment_id', appointmentId)
    .eq('reason', 'no_show_relevado')
    .limit(1)
    .maybeSingle()

  if (existingRelevado) {
    return NextResponse.json(
      { error: 'Punição já foi revertida anteriormente.' },
      { status: 409 },
    )
  }

  // 5. INSERT da reversão · points = ABS(penalty.points) pois penalty é negativo
  const reversalAmount = Math.abs(penalty.points)

  const { error: insErr } = await admin
    .from('points_transactions')
    .insert({
      customer_id: penalty.customer_id,
      business_id: penalty.business_id,
      points: reversalAmount,
      reason: 'no_show_relevado',
      appointment_id: appointmentId,
    })

  if (insErr) {
    console.error('relevar insert error:', insErr)
    return NextResponse.json({ error: 'Erro ao registrar reversão.' }, { status: 500 })
  }

  // 6. Atualiza saldo denormalizado em customers (sem clamp · saldo final
  // nunca passa do que tinha antes da punição porque a punição clampou em 0)
  if (penalty.customer_id) {
    const { data: cust } = await admin
      .from('customers')
      .select('total_points')
      .eq('id', penalty.customer_id)
      .single()
    if (cust) {
      await admin
        .from('customers')
        .update({ total_points: (cust.total_points ?? 0) + reversalAmount })
        .eq('id', penalty.customer_id)
    }
  }

  // 7. Activity log (rastreio · auditável)
  await admin.from('activity_log').insert({
    business_id: appointment.business_id,
    professional_id: appointment.professional_id,
    action: 'no_show_relevado',
    target_type: 'appointment',
    target_id: appointmentId,
    description: `Punição revertida · ${appointment.client_name} · +${reversalAmount} pts devolvidos`,
  })

  // 8. Invalida caches RSC
  revalidatePath('/admin')
  revalidatePath('/profissional')

  return NextResponse.json({
    ok: true,
    reversed_points: reversalAmount,
  })
}
