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
  appointmentId,
  noShowPenaltyPoints,
}: {
  clientEmail: string
  clientName: string
  businessName: string
  date: string
  startTime: string
  serviceName?: string | null
  type: '1d' | '1h' | '3h'
  /** v45 · 14/05/2026 — opcional · usado pra gerar link de cancelamento 1-click no lembrete 3h */
  appointmentId?: string
  /** v45 · 14/05/2026 — opcional · se >0 e business tem punição ativa, texto adapta avisando da perda de pontos (decisão 8 com Eduardo: lembrete híbrido) */
  noShowPenaltyPoints?: number
}) {
  const [year, month, day] = date.split('-')
  const dateFormatted = `${day}/${month}/${year}`

  let subject: string
  if (type === '1d') {
    subject = `Lembrete: seu horário amanhã na ${esc(businessName)}`
  } else if (type === '1h') {
    subject = `Falta 1 hora! Seu horário na ${esc(businessName)}`
  } else {
    subject = `Faltam 3 horas — confirme seu horário na ${esc(businessName)}`
  }

  // Lembrete 3h tem link de cancelamento 1-click (decisão 9 com Eduardo).
  const cancelUrl = type === '3h' && appointmentId
    ? `${APP_URL}/cancelar?id=${appointmentId}&token=${generateCancelToken(appointmentId)}`
    : null

  // Aviso da política de punição · só aparece se business tem ativa
  // (noShowPenaltyPoints > 0). Caller decide se passa o número ou não.
  const punishmentWarning = type === '3h' && noShowPenaltyPoints && noShowPenaltyPoints > 0
    ? `<br><br><span style="display:inline-block;padding:8px 12px;background:#FEF3C7;border-radius:8px;color:#92400E;font-size:14px;">⚠️ <strong>Cancele agora</strong> pra não perder <strong>${noShowPenaltyPoints} pts</strong>. Se você não comparecer sem avisar, os pontos saem do seu saldo.</span>`
    : ''

  let body: string
  if (type === '1d') {
    body = `
      Olá, <strong>${esc(clientName)}</strong>!
      Lembrando que você tem um agendamento <strong>amanhã</strong> na <strong>${esc(businessName)}</strong>.<br><br>
      ${serviceName ? `✂️ <strong>Serviço:</strong> ${esc(serviceName)}<br>` : ''}
      📅 <strong>Data:</strong> ${dateFormatted}<br>
      🕐 <strong>Horário:</strong> ${startTime}<br><br>
      Qualquer dúvida, entre em contato com o estabelecimento. Te esperamos! 👊
    `
  } else if (type === '1h') {
    body = `
      Olá, <strong>${esc(clientName)}</strong>!
      Seu agendamento na <strong>${esc(businessName)}</strong> é <strong>daqui a 1 hora</strong>. Já se prepare!<br><br>
      ${serviceName ? `✂️ <strong>Serviço:</strong> ${esc(serviceName)}<br>` : ''}
      📅 <strong>Data:</strong> ${dateFormatted}<br>
      🕐 <strong>Horário:</strong> ${startTime}<br><br>
      Não se atrase! Te esperamos lá. 👊
    `
  } else {
    // type === '3h' · texto adaptativo + link de cancelamento
    body = `
      Olá, <strong>${esc(clientName)}</strong>!
      Você tem um agendamento na <strong>${esc(businessName)}</strong> <strong>daqui a 3 horas</strong>.<br><br>
      ${serviceName ? `✂️ <strong>Serviço:</strong> ${esc(serviceName)}<br>` : ''}
      📅 <strong>Data:</strong> ${dateFormatted}<br>
      🕐 <strong>Horário:</strong> ${startTime}
      ${punishmentWarning}
      <br><br>
      Vai dar pra comparecer? Se algo mudou, cancele agora pra liberar a vaga pra outro cliente.
    `
  }

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: clientEmail,
    subject,
    html: emailTemplate({
      title: '',
      body,
      actionUrl: cancelUrl ?? undefined,
      actionLabel: cancelUrl ? '❌ Não vou conseguir · cancelar agora' : undefined,
    }),
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

// ── Trial / cortesia (expiração automática · cron billing-check passo 2) ──

/** D-1 · avisa que o teste grátis acaba amanhã (antes de bloquear). */
export async function sendTrialEndingSoon({
  ownerEmail,
  businessName,
  actionUrl,
}: {
  ownerEmail: string
  businessName: string
  actionUrl: string
}) {
  const body = `
    Oi!<br><br>
    Seu período de teste grátis do AgendaPRO da <strong>${esc(businessName)}</strong> <strong>termina amanhã</strong>.<br><br>
    Pra não perder o acesso à agenda, clientes e tudo que você já configurou, é só ativar seu plano — leva 1 minuto, no cartão ou PIX.<br><br>
    Sem fidelidade, cancela quando quiser.
  `

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: ownerEmail,
    subject: `Seu teste do AgendaPRO acaba amanhã — ${esc(businessName)}`,
    html: emailTemplate({
      title: 'Seu teste acaba amanhã',
      body,
      actionUrl,
      actionLabel: 'Ativar meu plano',
    }),
  })
}

/** D-0 · teste grátis acabou · painel caiu no paywall. */
export async function sendTrialEnded({
  ownerEmail,
  businessName,
  actionUrl,
}: {
  ownerEmail: string
  businessName: string
  actionUrl: string
}) {
  const body = `
    Oi!<br><br>
    Seu período de teste grátis do AgendaPRO da <strong>${esc(businessName)}</strong> <strong>chegou ao fim</strong>.<br><br>
    Seus dados continuam guardados. Pra voltar a usar a agenda e tudo que você configurou, é só ativar o plano — cartão ou PIX, sem fidelidade.
  `

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: ownerEmail,
    subject: `Seu teste do AgendaPRO acabou — ${esc(businessName)}`,
    html: emailTemplate({
      title: 'Período de teste encerrado',
      body,
      actionUrl,
      actionLabel: 'Ativar meu plano',
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

/**
 * Extrato de convênio pro RH da empresa conveniada (CAF · 24/08/2026).
 *
 * O campo "e-mail pra mandar o extrato" existia no cadastro da empresa e não
 * mandava nada — a interface prometia o que o produto não fazia. Isto liga.
 *
 * Vai como tabela no corpo do e-mail, não como anexo: o PDF é gerado no
 * navegador (jspdf) e não existe no servidor. O RH consegue conferir linha a
 * linha sem abrir arquivo, e o dono continua podendo mandar o PDF pelo WhatsApp
 * se quiser.
 */
export async function enviarExtratoConvenio(p: {
  para: string
  empresaNome: string
  contatoNome?: string | null
  negocioNome: string
  negocioTelefone?: string | null
  competencia: string
  numero: number
  linhas: Array<{ data: string; hora: string; funcionario: string; profissional: string; servico: string; valor: number }>
  total: number
}): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (!process.env.RESEND_API_KEY) return { ok: false, erro: 'RESEND_API_KEY não configurada' }

  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const dataBR = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`
  const mesBR = `${p.competencia.slice(5, 7)}/${p.competencia.slice(0, 4)}`

  const linhasHtml = p.linhas
    .map(
      (l) => `<tr>
        <td style="padding:6px 8px;border-top:1px solid #e2e8f0">${dataBR(l.data)}</td>
        <td style="padding:6px 8px;border-top:1px solid #e2e8f0">${l.hora}</td>
        <td style="padding:6px 8px;border-top:1px solid #e2e8f0">${esc(l.funcionario)}</td>
        <td style="padding:6px 8px;border-top:1px solid #e2e8f0">${esc(l.profissional)}</td>
        <td style="padding:6px 8px;border-top:1px solid #e2e8f0">${esc(l.servico)}</td>
        <td style="padding:6px 8px;border-top:1px solid #e2e8f0;text-align:right">${brl(l.valor)}</td>
      </tr>`
    )
    .join('')

  const body = `
    ${p.contatoNome ? `Olá, ${esc(p.contatoNome)}.<br><br>` : ''}
    Segue o extrato dos atendimentos dos pacientes da <strong>${esc(p.empresaNome)}</strong>
    na competência <strong>${mesBR}</strong>.<br>
    <span style="color:#64748b">Fatura nº ${p.numero} · ${p.linhas.length} atendimento${p.linhas.length !== 1 ? 's' : ''}</span>
    <br><br>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="text-align:left;color:#64748b;font-size:11px;text-transform:uppercase">
          <th style="padding:6px 8px">Data</th>
          <th style="padding:6px 8px">Hora</th>
          <th style="padding:6px 8px">Paciente</th>
          <th style="padding:6px 8px">Profissional</th>
          <th style="padding:6px 8px">Serviço</th>
          <th style="padding:6px 8px;text-align:right">Valor</th>
        </tr>
      </thead>
      <tbody>${linhasHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="5" style="padding:10px 8px;border-top:2px solid #0f172a;font-weight:700">TOTAL</td>
          <td style="padding:10px 8px;border-top:2px solid #0f172a;font-weight:700;text-align:right">${brl(p.total)}</td>
        </tr>
      </tfoot>
    </table>
    <br>
    Qualquer divergência, é só responder este e-mail${p.negocioTelefone ? ` ou chamar no ${esc(p.negocioTelefone)}` : ''}.
  `

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: p.para,
      subject: `Extrato de atendimentos · ${p.empresaNome} · ${mesBR}`,
      html: emailTemplate({ title: `${p.negocioNome} · extrato ${mesBR}`, body }),
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * v139 · Avisa a DONA que o sinal de um agendamento está pra vencer.
 *
 * Não é e-mail pra cliente: é pra quem vai perder o horário. Por isso o
 * assunto já traz o nome e a hora — ela decide sem abrir.
 *
 * O link cai na AGENDA DO DIA, não na tela do atendimento: o botão "Recebi o
 * sinal" mora no card da agenda (AppointmentDrawer), e a página
 * /admin/atendimentos/[id] não tem esse bloco. Mandar pra lá seria avisar do
 * problema e esconder a solução.
 */
export async function sendSinalVencendo({
  donaEmail,
  clientName,
  businessName,
  date,
  startTime,
  sinalValor,
  minutosRestantes,
}: {
  donaEmail: string
  clientName: string
  businessName: string
  date: string
  startTime: string
  sinalValor: number
  minutosRestantes: number
}) {
  const [year, month, day] = date.split('-')
  const dateFormatted = `${day}/${month}/${year}`
  const valor = sinalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const prazo =
    minutosRestantes > 0
      ? `Faltam <strong>${minutosRestantes} minutos</strong> pro prazo acabar.`
      : `O prazo <strong>já passou</strong> e o horário voltou a ficar livre pra outra cliente marcar.`

  const body = `
    O sinal de <strong>${esc(clientName)}</strong> ainda não foi marcado como recebido na <strong>${esc(businessName)}</strong>.<br><br>
    💰 <strong>Sinal:</strong> ${valor}<br>
    📅 <strong>Atendimento:</strong> ${dateFormatted} às ${startTime}<br><br>
    ${prazo}<br><br>
    <strong>Se o PIX já caiu</strong> e você só não marcou, abre a agenda do dia, toca no agendamento e clica em “Recebi o sinal”. O horário trava de novo na hora.
  `

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: donaEmail,
    subject:
      minutosRestantes > 0
        ? `⏳ Sinal de ${esc(clientName)} vence em ${minutosRestantes} min — ${dateFormatted} às ${startTime}`
        : `⚠️ Sinal de ${esc(clientName)} venceu — o horário de ${dateFormatted} às ${startTime} voltou pra agenda`,
    html: emailTemplate({
      title: minutosRestantes > 0 ? 'Sinal pra vencer' : 'Sinal vencido',
      body,
      actionUrl: `${APP_URL}/admin?date=${date}`,
      actionLabel: 'Abrir a agenda do dia',
    }),
  })
}
