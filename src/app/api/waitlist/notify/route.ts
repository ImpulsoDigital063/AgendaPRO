import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyWaitlistForCancelledSlot } from '@/lib/waitlist'

// Dispara notificacao da fila quando o dono cancela um agendamento pelo admin.
// Auth obrigatoria (barbeiro autenticado, dono do business).
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { appointmentId } = await req.json()
  if (!appointmentId) {
    return NextResponse.json({ error: 'appointmentId obrigatório' }, { status: 400 })
  }

  const { data: appointment } = await supabase
    .from('appointments')
    .select('professional_id, appointment_date, start_time, business:businesses(owner_id)')
    .eq('id', appointmentId)
    .single()

  const appt = appointment as typeof appointment & { business: { owner_id: string } | null }

  if (!appt?.business || appt.business.owner_id !== user.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const sent = await notifyWaitlistForCancelledSlot({
    professional_id: appt.professional_id,
    appointment_date: appt.appointment_date,
    start_time: appt.start_time,
  })

  return NextResponse.json({ ok: true, sent })
}
