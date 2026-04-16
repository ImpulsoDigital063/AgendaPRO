import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendClientNotification, sendWaitlistNotification } from '@/lib/email'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  // Identifica o profissional logado
  const { data: professional } = await supabase
    .from('professionals')
    .select('id, name, business_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!professional) {
    return NextResponse.json({ error: 'Profissional não encontrado.' }, { status: 403 })
  }

  const { appointmentId, action } = await req.json()

  if (!appointmentId || !['confirmed', 'cancelled'].includes(action)) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const adminClient = getAdminClient()

  // Verifica se o agendamento pertence a este profissional
  const { data: appointment } = await adminClient
    .from('appointments')
    .select('*, business:businesses(name, slug)')
    .eq('id', appointmentId)
    .eq('professional_id', professional.id)
    .single()

  if (!appointment) {
    return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 })
  }

  // Atualiza status
  const { error: updateError } = await adminClient
    .from('appointments')
    .update({ status: action })
    .eq('id', appointmentId)

  if (updateError) {
    return NextResponse.json({ error: 'Erro ao atualizar.' }, { status: 500 })
  }

  // Registra no activity log
  const actionLabel = action === 'confirmed' ? 'confirmou' : 'cancelou'
  await adminClient.from('activity_log').insert({
    business_id: professional.business_id,
    professional_id: professional.id,
    action: action === 'confirmed' ? 'confirm' : 'cancel',
    target_type: 'appointment',
    target_id: appointmentId,
    description: `${professional.name} ${actionLabel} agendamento de ${appointment.client_name} (${appointment.appointment_date} às ${appointment.start_time.slice(0, 5)})`,
  })

  // Notifica cliente por email
  if (appointment.client_email) {
    sendClientNotification({
      clientEmail: appointment.client_email,
      clientName: appointment.client_name,
      businessName: appointment.business?.name || 'estabelecimento',
      date: appointment.appointment_date,
      startTime: appointment.start_time.slice(0, 5),
      confirmed: action === 'confirmed',
      serviceName: appointment.service_name ?? null,
    }).catch(() => {})
  }

  // Se cancelou, notifica primeiro da fila de espera
  if (action === 'cancelled') {
    const { data: waitlistEntry } = await adminClient
      .from('waitlist')
      .select('*, business:businesses(name, slug)')
      .eq('professional_id', professional.id)
      .eq('appointment_date', appointment.appointment_date)
      .eq('start_time', appointment.start_time)
      .is('notified_at', null)
      .order('created_at')
      .limit(1)
      .maybeSingle()

    if (waitlistEntry?.client_email) {
      await adminClient
        .from('waitlist')
        .update({ notified_at: new Date().toISOString() })
        .eq('id', waitlistEntry.id)

      sendWaitlistNotification({
        clientEmail: waitlistEntry.client_email,
        clientName: waitlistEntry.client_name,
        businessName: waitlistEntry.business?.name || 'estabelecimento',
        businessSlug: waitlistEntry.business?.slug || '',
        date: waitlistEntry.appointment_date,
        startTime: waitlistEntry.start_time.slice(0, 5),
      }).catch(() => {})
    }
  }

  return NextResponse.json({ ok: true, action })
}
