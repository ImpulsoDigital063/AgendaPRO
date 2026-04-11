import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendBarberNotification } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { appointmentId } = await req.json()

  if (!appointmentId) {
    return NextResponse.json({ error: 'appointmentId obrigatório' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: appointment } = await supabase
    .from('appointments')
    .select(`*, business:businesses(name, slug, owner_id), professional:professionals(name), service:services(name)`)
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
    serviceName: appointment.service_name ?? appointment.service?.name ?? null,
  })

  return NextResponse.json({ ok: true })
}
