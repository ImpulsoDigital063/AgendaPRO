import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit-api'

/**
 * GET /api/booking/availability?business=<id>&professional=<id>&date=YYYY-MM-DD
 * GET /api/booking/availability?business=<id>&professional=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Endpoint PUBLICO — alimenta o grid de horários do BookingFlow.
 * Lê appointments (start/end ocupados) e business_blocks via service_role
 * pra que essas tabelas possam ter RLS travado (fix Fase 1).
 * Retorna linhas cruas; a filtragem/geração de slots continua no client
 * (handleSelectDate), sem duplicar lógica.
 *
 * Modo INTERVALO (v101 · 31/07/2026): `from`+`to` no lugar de `date` devolve os
 * agendamentos de toda a janela, cada um com seu appointment_date. Serve pra
 * pintar de "ocupado" os dias já lotados ANTES do cliente clicar — o Diogo
 * reportou (31/07) que dia cheio aparecia disponível e só ao clicar via que
 * estava ocupado. Os bloqueios já vinham sem filtro de data, então valem
 * pra janela inteira sem mudança.
 */
export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'booking-availability', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('business') || ''
  const professionalId = searchParams.get('professional') || ''
  const date = searchParams.get('date') || ''
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''

  const modoIntervalo = !date && !!from && !!to
  if (!businessId || !professionalId || (!date && !modoIntervalo)) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }

  // Teto defensivo: endpoint é público, não pode virar varredura da agenda
  // inteira do negócio via querystring.
  if (modoIntervalo) {
    const dias = (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000
    if (!Number.isFinite(dias) || dias < 0 || dias > 180) {
      return NextResponse.json({ error: 'invalid_range' }, { status: 400 })
    }
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // No modo intervalo o appointment_date volta junto — o client precisa saber
  // a qual dia cada agendamento pertence pra montar o mapa de dias lotados.
  const qAppointments = db
    .from('appointments')
    .select(modoIntervalo ? 'appointment_date, start_time, end_time' : 'start_time, end_time')
    .eq('professional_id', professionalId)
    .in('status', ['pending', 'confirmed', 'completed'])

  const [{ data: appointments }, { data: blocks }] = await Promise.all([
    modoIntervalo
      ? qAppointments.gte('appointment_date', from).lte('appointment_date', to)
      : qAppointments.eq('appointment_date', date),
    db
      .from('business_blocks')
      .select('start_time, end_time, block_type, day_of_week, block_date')
      .eq('business_id', businessId)
      .eq('active', true)
      .or(`professional_id.eq.${professionalId},professional_id.is.null`),
  ])

  return NextResponse.json({ appointments: appointments ?? [], blocks: blocks ?? [] })
}
