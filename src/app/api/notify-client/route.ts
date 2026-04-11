import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyClient } from '@/lib/whatsapp'
import { sendClientNotification } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { appointmentId, status } = await req.json()

  if (!appointmentId || !status) {
    return NextResponse.json({ error: 'dados obrigatórios' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: appointment } = await supabase
    .from('appointments')
    .select(`*, business:businesses(name)`)
    .eq('id', appointmentId)
    .single()

  if (!appointment) {
    return NextResponse.json({ ok: false, reason: 'agendamento não encontrado' })
  }

  // WhatsApp (Z-API) — silencioso se não configurado
  await notifyClient({
    clientPhone: appointment.client_phone,
    clientName: appointment.client_name,
    businessName: appointment.business?.name || 'estabelecimento',
    date: appointment.appointment_date,
    startTime: appointment.start_time.slice(0, 5),
    confirmed: status === 'confirmed',
  })

  // Email — só envia se o cliente forneceu email
  if (appointment.client_email) {
    await sendClientNotification({
      clientEmail: appointment.client_email,
      clientName: appointment.client_name,
      businessName: appointment.business?.name || 'estabelecimento',
      date: appointment.appointment_date,
      startTime: appointment.start_time.slice(0, 5),
      confirmed: status === 'confirmed',
      serviceName: appointment.service_name ?? null,
    })
  }

  return NextResponse.json({ ok: true })
}
