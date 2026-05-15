/**
 * GET /api/admin/appointments/[id]/penalty-info
 *
 * Retorna info da punição aplicada a um appointment (se houver), pra
 * renderização do badge "−X pts" e botão Reverter no AppointmentCard.
 *
 * Lookup leve · usado em lazy-load quando o card renderiza status=no_show.
 * Permission: owner OR professional do appointment.
 *
 * Response:
 *   {
 *     hasPenalty: boolean,
 *     penaltyPoints: number | null,   // valor positivo (ex: 10)
 *     alreadyRelevado: boolean,
 *   }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit-api'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(req, { key: 'admin-appt-penalty-info', limit: 120, windowSeconds: 60 })
  if (rl) return rl

  const { id: appointmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const admin = getAdminClient()

  const { data: appointment } = await admin
    .from('appointments')
    .select('id, business_id, professional_id')
    .eq('id', appointmentId)
    .single()

  if (!appointment) {
    return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 })
  }

  // Permissão idêntica ao /services e /relevar
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

  // Busca penalty + relevado em batch (2 rows distintas no mesmo appointment)
  const { data: transactions } = await admin
    .from('points_transactions')
    .select('reason, points')
    .eq('appointment_id', appointmentId)
    .in('reason', ['no_show_penalty', 'no_show_relevado'])

  const penalty = (transactions || []).find((t) => t.reason === 'no_show_penalty')
  const relevado = (transactions || []).find((t) => t.reason === 'no_show_relevado')

  return NextResponse.json({
    hasPenalty: !!penalty,
    penaltyPoints: penalty ? Math.abs(penalty.points) : null,
    alreadyRelevado: !!relevado,
  })
}
