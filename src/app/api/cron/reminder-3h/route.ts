/**
 * H-3 · Lembrete email 3 horas antes do agendamento.
 *
 * IDEIA 2 do Olímpio (cravada 14/05/2026): cliente recebe lembrete com
 * link 1-click pra cancelar SE não puder ir. Texto adapta se o business
 * tem punição por no-show ativa (decisão 8: lembrete híbrido).
 *
 * Espelho do reminder-1h (v7) — mesma estrutura · janela diferente.
 * Roda a cada 15min (Vercel Cron) · marca `reminded_3h=TRUE` após envio
 * pra evitar duplicação.
 *
 * Diferença vs 1h:
 *  · Janela 2h45-3h15 a partir de agora (BRT)
 *  · Link de cancelamento 1-click via generateCancelToken (já existe)
 *  · Se business.no_show_punishment_enabled=TRUE, calcula penalty e
 *    passa noShowPenaltyPoints pro template (texto adapta)
 *
 * Cron entry no vercel.json: { path: '/api/cron/reminder-3h', schedule: '*\/15 * * * *' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendReminderEmail } from '@/lib/email'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

type BusinessForReminder = {
  name: string
  no_show_punishment_enabled: boolean | null
  no_show_penalty_mode: 'proportional' | 'fixed' | null
  no_show_fixed_points: number | null
}

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

  // Vercel roda em UTC — converte pra BRT (UTC-3) pra bater com banco
  const nowUTC = new Date()
  const nowBRT = new Date(nowUTC.getTime() - 3 * 60 * 60 * 1000)
  const today = nowBRT.toISOString().split('T')[0]

  // Janela: agendamentos entre 165 e 195 minutos a partir de agora (BRT).
  // Centrada em 3h · 30min de tolerância pra cobrir cron a cada 15min sem gap.
  const minTime = new Date(nowBRT.getTime() + 165 * 60 * 1000)
  const maxTime = new Date(nowBRT.getTime() + 195 * 60 * 1000)
  const minTimeStr = minTime.toISOString().slice(11, 16) // "HH:MM"
  const maxTimeStr = maxTime.toISOString().slice(11, 16)

  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      *,
      business:businesses(
        name,
        no_show_punishment_enabled,
        no_show_penalty_mode,
        no_show_fixed_points
      )
    `)
    .eq('appointment_date', today)
    .in('status', ['pending', 'confirmed'])
    .eq('reminded_3h', false)
    .gte('start_time', minTimeStr)
    .lte('start_time', maxTimeStr)

  if (!appointments || appointments.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  let sent = 0
  let skippedNoEmail = 0

  for (const appt of appointments) {
    const business = (appt.business as BusinessForReminder | null) ?? null
    const businessName = business?.name || 'estabelecimento'

    try {
      // Sem email · pula (mas marca como enviado pra não retentar)
      if (!appt.client_email) {
        skippedNoEmail++
        await supabase
          .from('appointments')
          .update({ reminded_3h: true })
          .eq('id', appt.id)
        continue
      }

      // Calcula pontos de penalty SE business tem ativa.
      // Vai pro texto do email · texto adapta (decisão 8 híbrido).
      let noShowPenaltyPoints: number | undefined
      if (business?.no_show_punishment_enabled) {
        if (business.no_show_penalty_mode === 'fixed') {
          noShowPenaltyPoints = business.no_show_fixed_points ?? 0
        } else {
          // 'proportional' (default) · soma points dos services do appt
          const { data: services } = await supabase
            .from('appointment_services')
            .select('services(points)')
            .eq('appointment_id', appt.id)
          const sum = (services || []).reduce((acc, row) => {
            const pts = (row.services as { points?: number | null } | null)?.points ?? 0
            return acc + (pts || 0)
          }, 0)
          noShowPenaltyPoints = sum > 0 ? sum : undefined
        }
      }

      await sendReminderEmail({
        clientEmail: appt.client_email,
        clientName: appt.client_name,
        businessName,
        date: appt.appointment_date,
        startTime: appt.start_time.slice(0, 5),
        serviceName: appt.service_name,
        type: '3h',
        appointmentId: appt.id,
        noShowPenaltyPoints,
      })

      // Marca como enviado · evita duplo envio se cron rodar 2x na janela
      await supabase
        .from('appointments')
        .update({ reminded_3h: true })
        .eq('id', appt.id)

      sent++
    } catch (err) {
      // Não derruba cron por erro num appointment · loga e segue
      console.error(`[H-3] Erro ao enviar lembrete para ${appt.client_name}:`, err)
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    skipped_no_email: skippedNoEmail,
    total: appointments.length,
  })
}
