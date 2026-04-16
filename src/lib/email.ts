import { Resend } from 'resend'
import { generateActionToken, generateCancelToken } from '@/lib/token'

const resend = new Resend(process.env.RESEND_API_KEY)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/** Escapa HTML para prevenir XSS em templates de email */
function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function emailTemplate({
  title,
  body,
  actionUrl,
  actionLabel,
  secondaryUrl,
  secondaryLabel,
}: {
  title: string
  body: string
  actionUrl?: string
  actionLabel?: string
  secondaryUrl?: string
  secondaryLabel?: string
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">

          <!-- Header -->
          <tr>
            <td style="background:#18181b;padding:24px 32px;">
              <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">AgendaPRO</p>
              <p style="margin:4px 0 0;color:#a1a1aa;font-size:12px;">by Impulso Digital</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 24px;color:#18181b;font-size:16px;line-height:1.6;">${body}</p>

              ${actionUrl && actionLabel ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                <tr>
                  <td align="center">
                    <a href="${actionUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:600;width:100%;text-align:center;box-sizing:border-box;">
                      ${actionLabel}
                    </a>
                  </td>
                </tr>
              </table>` : ''}

              ${secondaryUrl && secondaryLabel ? `
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${secondaryUrl}" style="display:inline-block;background:#f4f4f5;color:#52525b;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:600;width:100%;text-align:center;box-sizing:border-box;">
                      ${secondaryLabel}
                    </a>
                  </td>
                </tr>
              </table>` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #f4f4f5;">
              <p style="margin:0;color:#a1a1aa;font-size:11px;text-align:center;">
                AgendaPRO · Impulso Digital
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendBarberNotification({
  barberEmail,
  barberName,
  businessName,
  clientName,
  clientPhone,
  date,
  startTime,
  endTime,
  appointmentId,
  serviceName,
}: {
  barberEmail: string
  barberName: string
  businessName: string
  clientName: string
  clientPhone: string
  date: string
  startTime: string
  endTime: string
  appointmentId: string
  serviceName?: string | null
}) {
  const [year, month, day] = date.split('-')
  const dateFormatted = `${day}/${month}/${year}`

  const confirmToken = generateActionToken(appointmentId, 'confirmed')
  const cancelToken = generateActionToken(appointmentId, 'cancelled')
  const confirmUrl = `${APP_URL}/api/appointment/action?id=${appointmentId}&action=confirmed&token=${confirmToken}`
  const cancelUrl = `${APP_URL}/api/appointment/action?id=${appointmentId}&action=cancelled&token=${cancelToken}`

  const body = `
    Olá, <strong>${esc(barberName)}</strong>! Você tem uma nova reserva na <strong>${esc(businessName)}</strong>.<br><br>
    ${serviceName ? `✂️ <strong>Serviço:</strong> ${esc(serviceName)}<br>` : ''}
    👤 <strong>Cliente:</strong> ${esc(clientName)}<br>
    📱 <strong>WhatsApp:</strong> ${esc(clientPhone)}<br>
    📅 <strong>Data:</strong> ${dateFormatted}<br>
    🕐 <strong>Horário:</strong> ${startTime} – ${endTime}<br><br>
    Confirme ou cancele o agendamento abaixo:
  `

  await resend.emails.send({
    from: 'AgendaPRO <onboarding@resend.dev>',
    to: barberEmail,
    subject: `🔔 Nova reserva — ${esc(clientName)} · ${dateFormatted} às ${startTime}`,
    html: emailTemplate({
      title: 'Nova reserva',
      body,
      actionUrl: confirmUrl,
      actionLabel: '✓ Confirmar agendamento',
      secondaryUrl: cancelUrl,
      secondaryLabel: '✕ Cancelar agendamento',
    }),
  })
}

export async function sendClientBookingConfirmation({
  clientEmail,
  clientName,
  businessName,
  date,
  startTime,
  endTime,
  services,
  totalPrice,
  appointmentId,
}: {
  clientEmail: string
  clientName: string
  businessName: string
  date: string
  startTime: string
  endTime: string
  services: string[]
  totalPrice?: number | null
  appointmentId?: string
}) {
  const [year, month, day] = date.split('-')
  const dateFormatted = `${day}/${month}/${year}`

  const servicesList = services.length > 0
    ? services.map(s => `✂️ ${esc(s)}`).join('<br>')
    : ''

  const priceLine = totalPrice
    ? `<br>💰 <strong>Total:</strong> ${totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
    : ''

  const cancelUrl = appointmentId
    ? `${APP_URL}/cancelar?id=${appointmentId}&token=${generateCancelToken(appointmentId)}`
    : null

  const body = `
    Olá, <strong>${esc(clientName)}</strong>! Seu agendamento na <strong>${esc(businessName)}</strong> foi recebido com sucesso.<br><br>
    ${servicesList ? `${servicesList}<br>` : ''}
    📅 <strong>Data:</strong> ${dateFormatted}<br>
    🕐 <strong>Horário:</strong> ${startTime} – ${endTime}${priceLine}<br><br>
    Aguarde a confirmação do estabelecimento. Você receberá outro email quando confirmado. 👊
  `

  await resend.emails.send({
    from: 'AgendaPRO <onboarding@resend.dev>',
    to: clientEmail,
    subject: `📋 Agendamento recebido — ${esc(businessName)} · ${dateFormatted} às ${startTime}`,
    html: emailTemplate({
      title: '',
      body,
      ...(cancelUrl ? { secondaryUrl: cancelUrl, secondaryLabel: 'Cancelar agendamento' } : {}),
    }),
  })
}

export async function sendWaitlistNotification({
  clientEmail,
  clientName,
  businessName,
  businessSlug,
  date,
  startTime,
}: {
  clientEmail: string
  clientName: string
  businessName: string
  businessSlug: string
  date: string
  startTime: string
}) {
  const [year, month, day] = date.split('-')
  const dateFormatted = `${day}/${month}/${year}`
  const bookingUrl = `${APP_URL}/${businessSlug}/agendar`

  const body = `
    Olá, <strong>${esc(clientName)}</strong>! Uma vaga abriu na <strong>${esc(businessName)}</strong>.<br><br>
    📅 <strong>Data:</strong> ${dateFormatted}<br>
    🕐 <strong>Horário:</strong> ${startTime}<br><br>
    Corre para garantir seu horário antes que alguém pegue!
  `

  await resend.emails.send({
    from: 'AgendaPRO <onboarding@resend.dev>',
    to: clientEmail,
    subject: `🔔 Vaga abriu! ${esc(businessName)} · ${dateFormatted} às ${startTime}`,
    html: emailTemplate({
      title: '',
      body,
      actionUrl: bookingUrl,
      actionLabel: '🗓️ Garantir meu horário',
    }),
  })
}

export async function sendReminderEmail({
  clientEmail,
  clientName,
  businessName,
  date,
  startTime,
  serviceName,
  type,
}: {
  clientEmail: string
  clientName: string
  businessName: string
  date: string
  startTime: string
  serviceName?: string | null
  type: '1d' | '1h'
}) {
  const [year, month, day] = date.split('-')
  const dateFormatted = `${day}/${month}/${year}`

  const subject = type === '1d'
    ? `Lembrete: seu horário amanhã na ${esc(businessName)}`
    : `Falta 1 hora! Seu horário na ${esc(businessName)}`

  const body = `
    Olá, <strong>${esc(clientName)}</strong>!
    ${type === '1d'
      ? `Lembrando que você tem um agendamento <strong>amanhã</strong> na <strong>${esc(businessName)}</strong>.`
      : `Seu agendamento na <strong>${esc(businessName)}</strong> é <strong>daqui a 1 hora</strong>. Já se prepare!`
    }<br><br>
    ${serviceName ? `✂️ <strong>Serviço:</strong> ${esc(serviceName)}<br>` : ''}
    📅 <strong>Data:</strong> ${dateFormatted}<br>
    🕐 <strong>Horário:</strong> ${startTime}<br><br>
    ${type === '1h' ? 'Não se atrase! Te esperamos lá. 👊' : 'Qualquer dúvida, entre em contato com o estabelecimento. Te esperamos! 👊'}
  `

  await resend.emails.send({
    from: 'AgendaPRO <onboarding@resend.dev>',
    to: clientEmail,
    subject,
    html: emailTemplate({ title: '', body }),
  })
}

export async function sendClientNotification({
  clientEmail,
  clientName,
  businessName,
  date,
  startTime,
  confirmed,
  serviceName,
}: {
  clientEmail?: string
  clientName: string
  businessName: string
  date: string
  startTime: string
  confirmed: boolean
  serviceName?: string | null
}) {
  if (!clientEmail) return

  const [year, month, day] = date.split('-')
  const dateFormatted = `${day}/${month}/${year}`

  const body = confirmed
    ? `Olá, <strong>${esc(clientName)}</strong>! Seu agendamento na <strong>${esc(businessName)}</strong> foi confirmado.<br><br>
       ${serviceName ? `✂️ <strong>Serviço:</strong> ${esc(serviceName)}<br>` : ''}
       📅 <strong>Data:</strong> ${dateFormatted}<br>
       🕐 <strong>Horário:</strong> ${startTime}<br><br>
       Te esperamos lá! 👊`
    : `Olá, <strong>${esc(clientName)}</strong>. Infelizmente seu agendamento na <strong>${esc(businessName)}</strong> foi cancelado.<br><br>
       ${serviceName ? `✂️ <strong>Serviço:</strong> ${esc(serviceName)}<br><br>` : ''}
       Entre em contato com o estabelecimento para remarcar.`

  await resend.emails.send({
    from: 'AgendaPRO <onboarding@resend.dev>',
    to: clientEmail,
    subject: confirmed
      ? `✅ Agendamento confirmado — ${esc(businessName)}`
      : `❌ Agendamento cancelado — ${esc(businessName)}`,
    html: emailTemplate({ title: '', body }),
  })
}
