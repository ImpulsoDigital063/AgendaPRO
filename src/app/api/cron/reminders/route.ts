import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Protege a rota — só Vercel Cron pode chamar
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Amanhã
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  // Busca agendamentos confirmados ou pendentes para amanhã com email
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`*, business:businesses(name)`)
    .eq('appointment_date', tomorrowStr)
    .in('status', ['pending', 'confirmed'])
    .not('client_email', 'is', null)

  if (!appointments || appointments.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  let sent = 0

  for (const appt of appointments) {
    const [year, month, day] = appt.appointment_date.split('-')
    const dateFormatted = `${day}/${month}/${year}`
    const businessName = appt.business?.name || 'estabelecimento'

    const body = `
      Olá, <strong>${appt.client_name}</strong>! Lembrando que você tem um agendamento <strong>amanhã</strong> na <strong>${businessName}</strong>.<br><br>
      📅 <strong>Data:</strong> ${dateFormatted}<br>
      🕐 <strong>Horário:</strong> ${appt.start_time.slice(0, 5)}<br>
      ${appt.service_name ? `✂️ <strong>Serviço:</strong> ${appt.service_name}<br>` : ''}
      <br>
      Qualquer dúvida, entre em contato com o estabelecimento. Te esperamos! 👊
    `

    try {
      await resend.emails.send({
        from: 'AgendaPRO <onboarding@resend.dev>',
        to: appt.client_email,
        subject: `⏰ Lembrete — seu horário amanhã na ${businessName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
          <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
              <tr><td align="center">
                <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
                  <tr><td style="background:#18181b;padding:24px 32px;">
                    <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">AgendaPRO</p>
                    <p style="margin:4px 0 0;color:#a1a1aa;font-size:12px;">by Impulso Digital</p>
                  </td></tr>
                  <tr><td style="padding:32px;">
                    <p style="margin:0;color:#18181b;font-size:16px;line-height:1.6;">${body}</p>
                  </td></tr>
                  <tr><td style="padding:16px 32px;border-top:1px solid #f4f4f5;">
                    <p style="margin:0;color:#a1a1aa;font-size:11px;text-align:center;">AgendaPRO · Impulso Digital</p>
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </body>
          </html>
        `,
      })
      sent++
    } catch {
      // silencioso — não para o loop por erro de um email
    }
  }

  return NextResponse.json({ ok: true, sent, total: appointments.length })
}
