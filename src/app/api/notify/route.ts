import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendBarberNotification, sendClientBookingConfirmation } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { appointmentId } = await req.json()

  if (!appointmentId) {
    return NextResponse.json({ error: 'appointmentId obrigatório' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: appointment } = await supabase
    .from('appointments')
    .select(`*, business:businesses(name, slug, owner_id), professional:professionals(name), service:services(name), appointment_services(service_name, price)`)
    .eq('id', appointmentId)
    .single()

  if (!appointment?.business) {
    return NextResponse.json({ ok: false, reason: 'negócio não encontrado' })
  }

  // Busca o email do dono pelo auth do Supabase
  const { data: userData } = await supabase.auth.admin.getUserById(
    appointment.business.owner_id
  )

  // Em desenvolvimento usa TEST_EMAIL, em produção usa o email real do dono
  const barberEmail =
    process.env.NODE_ENV === 'development'
      ? process.env.TEST_EMAIL
      : userData?.user?.email

  if (!barberEmail) {
    return NextResponse.json({ ok: false, reason: 'email do barbeiro não encontrado' })
  }

  const apptServices: { service_name: string; price: number | null }[] = appointment.appointment_services || []
  const serviceNames = apptServices.length > 0
    ? apptServices.map((s: { service_name: string }) => s.service_name)
    : appointment.service_name ? [appointment.service_name] : []

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

  return NextResponse.json({ ok: true })
}
