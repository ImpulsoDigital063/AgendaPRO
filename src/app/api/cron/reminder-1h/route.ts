import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendReminderEmail } from '@/lib/email'
import { sendReminderWhatsApp } from '@/lib/whatsapp'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// H-1: Lembrete 1 hora antes — roda a cada 15 min (Vercel Cron)
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getAdminClient()

  // Vercel roda em UTC — converte pra BRT (UTC-3) pra bater com os horários do banco
  const nowUTC = new Date()
  const nowBRT = new Date(nowUTC.getTime() - 3 * 60 * 60 * 1000)
  const today = nowBRT.toISOString().split('T')[0]

  // Janela: agendamentos entre 45min e 75min a partir de agora (BRT)
  // Isso garante que o cron de 15 em 15 min pega todos sem duplicar
  const minTime = new Date(nowBRT.getTime() + 45 * 60 * 1000)
  const maxTime = new Date(nowBRT.getTime() + 75 * 60 * 1000)

  const minTimeStr = minTime.toISOString().slice(11, 16) // "HH:MM"
  const maxTimeStr = maxTime.toISOString().slice(11, 16)

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, business:businesses(name)')
    .eq('appointment_date', today)
    .in('status', ['pending', 'confirmed'])
    .eq('reminded_1h', false)
    .gte('start_time', minTimeStr)
    .lte('start_time', maxTimeStr)

  if (!appointments || appointments.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  let sent = 0

  for (const appt of appointments) {
    const businessName = appt.business?.name || 'estabelecimento'

    try {
      // Email
      if (appt.client_email) {
        await sendReminderEmail({
          clientEmail: appt.client_email,
          clientName: appt.client_name,
          businessName,
          date: appt.appointment_date,
          startTime: appt.start_time.slice(0, 5),
          serviceName: appt.service_name,
          type: '1h',
        })
      }

      // WhatsApp
      if (appt.client_phone) {
        await sendReminderWhatsApp({
          clientPhone: appt.client_phone,
          clientName: appt.client_name,
          businessName,
          date: appt.appointment_date,
          startTime: appt.start_time.slice(0, 5),
          serviceName: appt.service_name,
          type: '1h',
        })
      }

      // Marca como enviado
      await supabase
        .from('appointments')
        .update({ reminded_1h: true })
        .eq('id', appt.id)

      sent++
    } catch (err) {
      console.error(`[H-1] Erro ao enviar lembrete para ${appt.client_name}:`, err)
    }
  }

  return NextResponse.json({ ok: true, sent, total: appointments.length })
}
