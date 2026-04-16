const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE_ID
const ZAPI_TOKEN = process.env.ZAPI_TOKEN
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN

function formatPhone(phone: string): string {
  // Remove tudo que não é número e garante DDI 55
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('55')) return digits
  return `55${digits}`
}

async function sendMessage(phone: string, message: string): Promise<boolean> {
  if (!ZAPI_INSTANCE || !ZAPI_TOKEN || !ZAPI_CLIENT_TOKEN) {
    console.log('[WhatsApp] Credenciais não configuradas. Mensagem não enviada.')
    console.log('[WhatsApp] Para:', phone)
    console.log('[WhatsApp] Mensagem:', message)
    return false
  }

  try {
    const response = await fetch(
      `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': ZAPI_CLIENT_TOKEN,
        },
        body: JSON.stringify({
          phone: formatPhone(phone),
          message,
        }),
      }
    )

    if (!response.ok) {
      console.error('[WhatsApp] Erro ao enviar:', await response.text())
      return false
    }

    return true
  } catch (err) {
    console.error('[WhatsApp] Erro de conexão:', err)
    return false
  }
}

export async function notifyBarber({
  barberPhone,
  clientName,
  clientPhone,
  date,
  startTime,
  endTime,
  adminUrl,
}: {
  barberPhone: string
  clientName: string
  clientPhone: string
  date: string   // "2026-04-11"
  startTime: string // "09:00"
  endTime: string   // "09:40"
  adminUrl: string
}) {
  const [year, month, day] = date.split('-')
  const dateFormatted = `${day}/${month}/${year}`

  const message =
    `🔔 *Nova reserva — AgendaPRO*\n\n` +
    `👤 Cliente: ${clientName}\n` +
    `📱 WhatsApp: ${clientPhone}\n` +
    `📅 Data: ${dateFormatted}\n` +
    `🕐 Horário: ${startTime} – ${endTime}\n\n` +
    `Confirme ou cancele em:\n${adminUrl}`

  return sendMessage(barberPhone, message)
}

export async function notifyClient({
  clientPhone,
  clientName,
  businessName,
  date,
  startTime,
  confirmed,
}: {
  clientPhone: string
  clientName: string
  businessName: string
  date: string
  startTime: string
  confirmed: boolean
}) {
  const [year, month, day] = date.split('-')
  const dateFormatted = `${day}/${month}/${year}`

  const message = confirmed
    ? `✅ *Agendamento confirmado!*\n\n` +
      `Olá, ${clientName}! Seu horário na ${businessName} foi confirmado.\n\n` +
      `📅 ${dateFormatted} às ${startTime}\n\n` +
      `Te esperamos lá! 👊`
    : `❌ *Agendamento cancelado*\n\n` +
      `Olá, ${clientName}. Infelizmente seu horário na ${businessName} foi cancelado.\n\n` +
      `Entre em contato para remarcar.`

  return sendMessage(clientPhone, message)
}

export async function sendReminderWhatsApp({
  clientPhone,
  clientName,
  businessName,
  date,
  startTime,
  serviceName,
  type,
}: {
  clientPhone: string
  clientName: string
  businessName: string
  date: string
  startTime: string
  serviceName?: string | null
  type: '1d' | '1h'
}) {
  const [year, month, day] = date.split('-')
  const dateFormatted = `${day}/${month}/${year}`

  const message = type === '1d'
    ? `⏰ *Lembrete — AgendaPRO*\n\n` +
      `Olá, ${clientName}! Lembrando que você tem um agendamento *amanhã* na *${businessName}*.\n\n` +
      (serviceName ? `✂️ Serviço: ${serviceName}\n` : '') +
      `📅 Data: ${dateFormatted}\n` +
      `🕐 Horário: ${startTime}\n\n` +
      `Te esperamos lá! 👊`
    : `🔔 *Falta 1 hora! — AgendaPRO*\n\n` +
      `Olá, ${clientName}! Seu horário na *${businessName}* é *daqui a 1 hora*.\n\n` +
      (serviceName ? `✂️ Serviço: ${serviceName}\n` : '') +
      `📅 Data: ${dateFormatted}\n` +
      `🕐 Horário: ${startTime}\n\n` +
      `Não se atrase! Te esperamos lá. 👊`

  return sendMessage(clientPhone, message)
}
