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

// D-1: Lembrete 1 dia antes — roda todo dia às 12h (Vercel Cron)
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

  // Vercel roda em UTC — converte pra BRT (UTC-3) pra bater com as datas do banco
  const nowUTC = new Date()
  const nowBRT = new Date(nowUTC.getTime() - 3 * 60 * 60 * 1000)
  const tomorrow = new Date(nowBRT)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, business:businesses(name)')
    .eq('appointment_date', tomorrowStr)
    .in('status', ['pending', 'confirmed'])
    .eq('reminded_1d', false)

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
          type: '1d',
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
          type: '1d',
        })
      }

      // Marca como enviado
      await supabase
        .from('appointments')
        .update({ reminded_1d: true })
        .eq('id', appt.id)

      sent++
    } catch (err) {
      console.error(`[D-1] Erro ao enviar lembrete para ${appt.client_name}:`, err)
    }
  }

  return NextResponse.json({ ok: true, sent, total: appointments.length })
}
