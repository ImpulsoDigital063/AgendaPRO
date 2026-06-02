import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit-api'

/**
 * GET /api/booking/availability?business=<id>&professional=<id>&date=YYYY-MM-DD
 *
 * Endpoint PUBLICO — alimenta o grid de horários do BookingFlow.
 * Lê appointments (start/end ocupados) e business_blocks via service_role
 * pra que essas tabelas possam ter RLS travado (fix Fase 1).
 * Retorna linhas cruas; a filtragem/geração de slots continua no client
 * (handleSelectDate), sem duplicar lógica.
 */
export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'booking-availability', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('business') || ''
  const professionalId = searchParams.get('professional') || ''
  const date = searchParams.get('date') || ''

  if (!businessId || !professionalId || !date) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const [{ data: appointments }, { data: blocks }] = await Promise.all([
    db
      .from('appointments')
      .select('start_time, end_time')
      .eq('professional_id', professionalId)
      .eq('appointment_date', date)
      .in('status', ['pending', 'confirmed', 'completed']),
    db
      .from('business_blocks')
      .select('start_time, end_time, block_type, day_of_week, block_date')
      .eq('business_id', businessId)
      .eq('active', true)
      .or(`professional_id.eq.${professionalId},professional_id.is.null`),
  ])

  return NextResponse.json({ appointments: appointments ?? [], blocks: blocks ?? [] })
}
