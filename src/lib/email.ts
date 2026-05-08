import { Resend } from 'resend'
import { generateActionToken, generateCancelToken } from '@/lib/token'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AgendaPRO <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agendapro.net.br'

/** Escapa HTML para prevenir XSS em templates de email */
function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Brand kit AgendaPRO (07/05/2026 - reskin pos-1a-venda):
// - Header gradient emerald → cyan + logo branco
// - Botao CTA mesmo gradient
// - Footer com WhatsApp suporte + assinatura "Eduardo · AgendaPRO"
// - Sem mencionar CNPJ ou razao social do recebedor (LGPD/UX)
const LOGO_URL = `${APP_URL}/logo-agendapro-mono-white.svg`
const SUPPORT_WHATSAPP = 'https://wa.me/5563992920080'

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
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px -8px rgba(15,23,42,0.10);">

          <!-- Header — gradient emerald to cyan -->
          <tr>
            <td style="background:linear-gradient(135deg,#10B981 0%,#06B6D4 100%);padding:36px 32px;text-align:center;">
              <img src="${LOGO_URL}" alt="AgendaPRO" width="180" style="display:inline-block;max-width:180px;height:auto;border:0;outline:none;" />
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:11px;letter-spacing:0.5px;text-transform:uppercase;font-weight:600;">by Impulso Digital</p>
            </td>
          </tr>

          ${title ? `
          <!-- Title -->
          <tr>
            <td style="padding:32px 32px 8px;">
              <h1 style="margin:0;color:#0F172A;font-size:22px;font-weight:700;line-height:1.3;">${title}</h1>
            </td>
          </tr>` : ''}

          <!-- Body -->
          <tr>
            <td style="padding:${title ? '8px' : '32px'} 32px 24px;">
              <div style="color:#334155;font-size:15px;line-height:1.65;">${body}</div>

              ${actionUrl && actionLabel ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td align="center">
                    <a href="${actionUrl}" style="display:inline-block;background:linear-gradient(135deg,#10B981 0%,#06B6D4 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;width:100%;text-align:center;box-sizing:border-box;letter-spacing:0.2px;">
                      ${actionLabel}
                    </a>
                  </td>
                </tr>
              </table>` : ''}

              ${secondaryUrl && secondaryLabel ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                <tr>
                  <td align="center">
                    <a href="${secondaryUrl}" style="display:inline-block;background:#F1F5F9;color:#334155;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:600;width:100%;text-align:center;box-sizing:border-box;border:1px solid #E2E8F0;">
                      ${secondaryLabel}
                    </a>
                  </td>
                </tr>
              </table>` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 8px;color:#64748B;font-size:13px;line-height:1.5;">
                Dúvida? <a href="${SUPPORT_WHATSAPP}" style="color:#10B981;text-decoration:none;font-weight:600;">Fala comigo no WhatsApp</a>
              </p>
              <p style="margin:0;color:#94A3B8;font-size:11px;line-height:1.5;">
                Eduardo · AgendaPRO · Palmas/TO
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

  await getResend().emails.send({
    from: FROM_EMAIL,
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
  businessSlug,
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
  businessSlug?: string
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

  const meusPontosUrl = businessSlug ? `${APP_URL}/${businessSlug}/meus-pontos` : null

  const body = `
    Olá, <strong>${esc(clientName)}</strong>! Seu agendamento na <strong>${esc(businessName)}</strong> está confirmado.<br><br>
    ${servicesList ? `${servicesList}<br>` : ''}
    📅 <strong>Data:</strong> ${dateFormatted}<br>
    🕐 <strong>Horário:</strong> ${startTime} – ${endTime}${priceLine}<br><br>
    Te esperamos no horário marcado! 👊<br><br>
    ${meusPontosUrl ? `<small>Acompanhe seus pontos e gerencie seus agendamentos em:<br><a href="${meusPontosUrl}" style="color:#3B82F6">${meusPontosUrl}</a></small>` : ''}
  `

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: clientEmail,
    subject: `✅ Agendamento confirmado — ${esc(businessName)} · ${dateFormatted} às ${startTime}`,
    html: emailTemplate({
      title: '',
      body,
      ...(meusPontosUrl ? { actionUrl: meusPontosUrl, actionLabel: 'Meus pontos e agendamentos' } : {}),
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
  professionalId,
  waitlistId,
}: {
  clientEmail: string
  clientName: string
  businessName: string
  businessSlug: string
  date: string
  startTime: string
  professionalId: string
  waitlistId: string
}) {
  const [year, month, day] = date.split('-')
  const dateFormatted = `${day}/${month}/${year}`
  const bookingUrl = `${APP_URL}/${businessSlug}/agendar?date=${date}&time=${encodeURIComponent(startTime)}&prof=${professionalId}&w=${waitlistId}`

  const body = `
    ${esc(clientName.split(' ')[0])}, abriu vaga das <strong>${startTime} (${dateFormatted})</strong> na <strong>${esc(businessName)}</strong>. Corre pra garantir.
  `

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: clientEmail,
    subject: `🔔 Surgiu uma vaga — ${esc(businessName)} · ${dateFormatted} às ${startTime}`,
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

  await getResend().emails.send({
    from: FROM_EMAIL,
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

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: clientEmail,
    subject: confirmed
      ? `✅ Agendamento confirmado — ${esc(businessName)}`
      : `❌ Agendamento cancelado — ${esc(businessName)}`,
    html: emailTemplate({ title: '', body }),
  })
}

// ── Billing emails (PIX recorrente — mensal_pix / semestral_pix / anual_pix) ──

/**
 * Email D-3 antes do vencimento — manda PIX novo gerado pelo cron.
 */
export async function sendBillingReminderD3({
  ownerEmail,
  ownerName,
  businessName,
  pixUrl,
  valor,
  diasParaVencer,
  modalidade,
}: {
  ownerEmail: string
  ownerName: string
  businessName: string
  pixUrl: string
  valor: string
  diasParaVencer: number
  modalidade: 'mensal_pix' | 'semestral_pix' | 'anual_pix'
}) {
  const periodo =
    modalidade === 'mensal_pix' ? 'mensal' :
    modalidade === 'semestral_pix' ? 'semestral' : 'anual'

  const body = `
    Oi, <strong>${esc(ownerName)}</strong>!<br><br>
    A mensalidade ${periodo} do AgendaPRO da <strong>${esc(businessName)}</strong> vence em <strong>${diasParaVencer} ${diasParaVencer === 1 ? 'dia' : 'dias'}</strong>.<br><br>
    💰 <strong>Valor:</strong> ${esc(valor)}<br>
    💳 <strong>Forma:</strong> PIX<br><br>
    Pode pagar agora pelo link abaixo — leva uns 30 segundos. Painel continua liberado até o vencimento.
  `

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: ownerEmail,
    subject: `⏰ AgendaPRO vence em ${diasParaVencer} ${diasParaVencer === 1 ? 'dia' : 'dias'} — ${esc(businessName)}`,
    html: emailTemplate({
      title: 'Mensalidade vencendo',
      body,
      actionUrl: pixUrl,
      actionLabel: `Pagar ${esc(valor)} via PIX agora`,
    }),
  })
}

/**
 * Email D+0 a D+5 — vencida, ainda em grace period.
 */
export async function sendBillingOverdue({
  ownerEmail,
  ownerName,
  businessName,
  pixUrl,
  valor,
  diasAtrasado,
  diasAteBlock,
}: {
  ownerEmail: string
  ownerName: string
  businessName: string
  pixUrl: string
  valor: string
  diasAtrasado: number
  diasAteBlock: number
}) {
  const titulo = diasAtrasado === 0
    ? 'Mensalidade vence hoje'
    : `Mensalidade atrasada há ${diasAtrasado} ${diasAtrasado === 1 ? 'dia' : 'dias'}`

  const body = diasAtrasado === 0
    ? `
      Oi, <strong>${esc(ownerName)}</strong>!<br><br>
      A mensalidade do AgendaPRO da <strong>${esc(businessName)}</strong> vence <strong>hoje</strong>.<br><br>
      💰 <strong>Valor:</strong> ${esc(valor)}<br><br>
      O painel continua liberado normalmente — só precisa pagar pra evitar bloqueio.
    `
    : `
      Oi, <strong>${esc(ownerName)}</strong>!<br><br>
      A mensalidade do AgendaPRO da <strong>${esc(businessName)}</strong> está atrasada há <strong>${diasAtrasado} ${diasAtrasado === 1 ? 'dia' : 'dias'}</strong>.<br><br>
      💰 <strong>Valor:</strong> ${esc(valor)}<br>
      ⚠️ <strong>Bloqueio do painel em ${diasAteBlock} ${diasAteBlock === 1 ? 'dia' : 'dias'}</strong>.<br><br>
      Pode regularizar agora pelo link abaixo — PIX confirma na hora.
    `

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: ownerEmail,
    subject: diasAtrasado === 0
      ? `⏰ AgendaPRO vence hoje — ${esc(businessName)}`
      : `⚠️ AgendaPRO atrasado há ${diasAtrasado} ${diasAtrasado === 1 ? 'dia' : 'dias'} — ${esc(businessName)}`,
    html: emailTemplate({
      title: titulo,
      body,
      actionUrl: pixUrl,
      actionLabel: `Pagar ${esc(valor)} via PIX`,
    }),
  })
}

/**
 * Email D+6+ — bloqueada, painel travado.
 */
export async function sendBillingBlocked({
  ownerEmail,
  ownerName,
  businessName,
  pixUrl,
  valor,
}: {
  ownerEmail: string
  ownerName: string
  businessName: string
  pixUrl: string
  valor: string
}) {
  const body = `
    Oi, <strong>${esc(ownerName)}</strong>.<br><br>
    O painel do AgendaPRO da <strong>${esc(businessName)}</strong> foi <strong>bloqueado</strong> por falta de pagamento.<br><br>
    💰 <strong>Valor:</strong> ${esc(valor)}<br>
    🔓 <strong>Painel libera automaticamente</strong> assim que o PIX for confirmado.<br><br>
    Seus dados continuam intactos — só pagar pra reativar tudo na hora.
  `

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: ownerEmail,
    subject: `🔒 AgendaPRO bloqueado — ${esc(businessName)}`,
    html: emailTemplate({
      title: 'Painel bloqueado',
      body,
      actionUrl: pixUrl,
      actionLabel: `Pagar ${esc(valor)} via PIX e reativar`,
    }),
  })
}

// ── Pos-pagamento (substitui emails do Asaas pra esconder o CNPJ do recebedor) ──

/**
 * Disparado pelo webhook Asaas em PAYMENT_CONFIRMED ou PAYMENT_RECEIVED.
 * Substitui o email padrao do Asaas (que expoe "64.585.949 EDUARDO BARROS
 * CHAVES" no header). Cliente passa a receber email branded AgendaPRO.
 */
export async function sendPaymentConfirmed({
  ownerEmail,
  ownerName,
  businessName,
  plan,
  valor,
  modalidade,
  refundDeadline,
}: {
  ownerEmail: string
  ownerName: string
  businessName: string
  plan: 'solo' | 'equipe'
  valor: string  // ex: "R$ 67"
  modalidade: 'mensal_cartao' | 'mensal_pix' | 'semestral_pix' | 'anual_pix'
  refundDeadline: Date | null
}) {
  const planLabel = plan === 'equipe' ? 'Equipe' : 'Solo'

  const proxima =
    modalidade === 'mensal_pix' ? 'Próxima cobrança em 1 mês.' :
    modalidade === 'semestral_pix' ? 'Próxima cobrança em 6 meses.' :
    modalidade === 'anual_pix' ? 'Próxima cobrança em 12 meses.' :
    'Renovação automática no cartão todo mês.'

  const refundLine = refundDeadline
    ? `<br><br>Garantia de 7 dias: se não fizer sentido até <strong>${refundDeadline.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</strong>, eu devolvo a grana sem burocracia.`
    : ''

  const firstName = ownerName.split(' ')[0]

  const body = `
    Olá, <strong>${esc(firstName)}</strong>.<br><br>
    Recebi seu pagamento de <strong>${esc(valor)}</strong>. A conta da <strong>${esc(businessName)}</strong> tá ativa.<br><br>
    ${proxima}${refundLine}
  `

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: ownerEmail,
    subject: `Pagamento confirmado · AgendaPRO ${planLabel} ${esc(valor)}`,
    html: emailTemplate({
      title: 'Pagamento recebido',
      body,
      actionUrl: `${APP_URL}/admin`,
      actionLabel: 'Acessar o painel',
    }),
  })
}

/**
 * Disparado pelo webhook Asaas em PAYMENT_REFUNDED.
 * Garante que cliente saiba que o reembolso foi processado, com info sobre
 * prazo de retorno do dinheiro (PIX 24h, cartão 5-10 dias).
 */
export async function sendRefundProcessed({
  ownerEmail,
  ownerName,
  businessName,
  valor,
  paymentMethod,
}: {
  ownerEmail: string
  ownerName: string
  businessName: string
  valor: string
  paymentMethod: 'pix' | 'cartao'
}) {
  const prazoLine = paymentMethod === 'pix'
    ? 'A grana volta no seu PIX em até <strong>24h</strong> (no app do banco).'
    : 'A grana volta no seu cartão em <strong>5 a 10 dias úteis</strong> (depende do banco).'

  const firstName = ownerName.split(' ')[0]

  const body = `
    Olá, <strong>${esc(firstName)}</strong>.<br><br>
    Solicitei o estorno de <strong>${esc(valor)}</strong> da assinatura da <strong>${esc(businessName)}</strong>.<br><br>
    ${prazoLine}<br><br>
    Se mudar de ideia, fala comigo no WhatsApp que eu reativo na hora.
  `

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: ownerEmail,
    subject: `Reembolso processado · ${esc(valor)} voltando pra você`,
    html: emailTemplate({
      title: 'Reembolso solicitado',
      body,
      actionUrl: SUPPORT_WHATSAPP,
      actionLabel: 'Falar comigo no WhatsApp',
    }),
  })
}

/**
 * Alerta interno (pra Eduardo) quando refund obrigatorio falha no Asaas.
 * Causa mais comum: saldo insuficiente (Asaas exige saldo INTEGRAL pra
 * estornar, mas cobrou taxa antes de receber). Eduardo precisa verificar
 * + fazer refund manual via API ou painel + falar com cliente.
 */
export async function sendRefundFailedAlert({
  businessId,
  paymentMethod,
  refundError,
}: {
  businessId: string
  paymentMethod: 'pix' | 'cartao'
  refundError: string
}) {
  const ALERT_TO = 'edubchaves5@gmail.com'

  const body = `
    Cliente tentou cancelar dentro dos <strong>7 dias da garantia</strong> mas
    o Asaas rejeitou o estorno.<br><br>
    <strong>Business ID:</strong> <code>${esc(businessId)}</code><br>
    <strong>Método:</strong> ${paymentMethod}<br>
    <strong>Erro Asaas:</strong> <code>${esc(refundError)}</code><br><br>
    O cancelamento <strong>NÃO foi efetivado no DB</strong> — cliente continua com acesso.
    Resolve no painel Asaas e fala com o cliente pra refazer.<br><br>
    Causa típica: <em>"Não há saldo suficiente"</em>. Solução: garantir buffer
    no saldo Asaas ou processar refund manual via API.
  `

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: ALERT_TO,
    subject: `[ALERTA] Refund Asaas falhou — business ${businessId.slice(0, 8)}`,
    html: emailTemplate({
      title: 'Refund falhou — intervir',
      body,
      actionUrl: 'https://www.asaas.com/dashboard/home',
      actionLabel: 'Abrir painel Asaas',
    }),
  })
}
