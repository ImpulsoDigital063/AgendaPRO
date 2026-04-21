import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendBarberNotification, sendClientBookingConfirmation } from '@/lib/email'
import { generateCancelToken } from '@/lib/token'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Endpoint publico — chamado pelo BookingFlow apos o cliente criar o agendamento.
// Usa service role pra buscar o appointment e disparar emails (barbeiro + cliente).
// Idempotencia: so envia pra agendamentos criados ha menos de 10 min (anti-spam).
export async function POST(req: NextRequest) {
  const { appointmentId } = await req.json()

  if (!appointmentId) {
    return NextResponse.json({ error: 'appointmentId obrigatório' }, { status: 400 })
  }

  const admin = getAdminClient()

  const { data: appointment } = await admin
    .from('appointments')
    .select(`*, business:businesses(name, slug, owner_id), professional:professionals(name), service:services(name), appointment_services(service_name, price)`)
    .eq('id', appointmentId)
    .single()

  if (!appointment?.business) {
    return NextResponse.json({ ok: false, reason: 'negócio não encontrado' })
  }

  // Anti-spam: so notifica agendamentos criados ha menos de 10 min
  const createdAt = new Date(appointment.created_at).getTime()
  const age = Date.now() - createdAt
  if (age > 10 * 60 * 1000) {
    return NextResponse.json({ ok: false, reason: 'agendamento antigo' })
  }

  // Busca o email do dono
  const { data: userData } = await admin.auth.admin.getUserById(appointment.business.owner_id)
  const barberEmail =
    process.env.NODE_ENV === 'development'
      ? process.env.TEST_EMAIL
      : userData?.user?.email

  const apptServices: { service_name: string; price: number | null }[] = appointment.appointment_services || []
  const serviceNames = apptServices.length > 0
    ? apptServices.map((s: { service_name: string }) => s.service_name)
    : appointment.service_name ? [appointment.service_name] : []

  // Email pro barbeiro
  if (barberEmail) {
    await sendBarberNotification({
      barberEmail,
      barberName: appointment.professional?.name || 'Profissional',
      businessName: appointment.business.name,
      clientName: appointment.client_name,
      clientPhone: appointment.client_phone,
      date: appointment.appointment_date,
      startTime: appointment.start_time.slice(0, 5),
      endTime: appointment.end_time.slice(0, 5),
      appointmentId,
      serviceName: serviceNames.join(', ') || null,
    })
  }

  // Email de confirmação pro cliente (se tiver email)
  if (appointment.client_email) {
    await sendClientBookingConfirmation({
      clientEmail: appointment.client_email,
      clientName: appointment.client_name,
      businessName: appointment.business.name,
      date: appointment.appointment_date,
      startTime: appointment.start_time.slice(0, 5),
      endTime: appointment.end_time.slice(0, 5),
      services: serviceNames,
      totalPrice: appointment.total_price,
      appointmentId,
    })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://agendapro.net.br'
  const cancelUrl = `${appUrl}/cancelar?id=${appointmentId}&token=${generateCancelToken(appointmentId)}`

  return NextResponse.json({ ok: true, cancelUrl })
}
