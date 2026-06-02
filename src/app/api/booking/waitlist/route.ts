import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit-api'

/**
 * POST /api/booking/waitlist
 *
 * Endpoint PUBLICO — entrada na fila de espera pelo BookingFlow.
 * Insert via service_role pra permitir RLS travado em waitlist (fix Fase 1).
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'booking-waitlist', limit: 20, windowSeconds: 60 })
  if (rl) return rl

  const body = await req.json().catch(() => ({}))
  const businessId = typeof body.businessId === 'string' ? body.businessId : ''
  const professionalId = typeof body.professionalId === 'string' ? body.professionalId : ''
  const appointmentDate = typeof body.date === 'string' ? body.date : ''
  const startTime = typeof body.startTime === 'string' ? body.startTime : ''
  const name = typeof body.clientName === 'string' ? body.clientName.trim() : ''
  const phone = typeof body.clientPhone === 'string' ? body.clientPhone.trim() : ''
  const email = typeof body.clientEmail === 'string' && body.clientEmail.trim() ? body.clientEmail.trim() : null
  const serviceIds = Array.isArray(body.serviceIds) && body.serviceIds.length > 0 ? body.serviceIds : null

  if (!businessId || !professionalId || !appointmentDate || !startTime || !name || !phone) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Valida professional ↔ business (anti-payload forjado)
  const { data: prof } = await db
    .from('professionals')
    .select('id, business_id')
    .eq('id', professionalId)
    .maybeSingle()
  if (!prof || prof.business_id !== businessId) {
    return NextResponse.json({ error: 'invalid_professional' }, { status: 400 })
  }

  const { error } = await db.from('waitlist').insert({
    business_id: businessId,
    professional_id: professionalId,
    appointment_date: appointmentDate,
    start_time: startTime,
    client_name: name,
    client_phone: phone,
    client_email: email,
    service_ids: serviceIds,
  })

  if (error) {
    console.error('booking waitlist insert error:', error)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
