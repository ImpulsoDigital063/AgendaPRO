import { createHmac, timingSafeEqual } from 'crypto'

function getSecret(): string {
  const secret = process.env.APPOINTMENT_ACTION_SECRET
  if (!secret) {
    throw new Error('APPOINTMENT_ACTION_SECRET environment variable must be set')
  }
  return secret
}

/** Gera token HMAC para ações em agendamentos (confirmar/cancelar via link) */
export function generateActionToken(appointmentId: string, action: string): string {
  return createHmac('sha256', getSecret())
    .update(`${appointmentId}:${action}`)
    .digest('hex')
}

/** Verifica se o token é válido (constant-time comparison) */
export function verifyActionToken(appointmentId: string, action: string, token: string): boolean {
  const expected = generateActionToken(appointmentId, action)
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token))
  } catch {
    return false
  }
}

/* Token da página de pagamento do sinal. Separado do de cancelamento de
   propósito: o link do sinal vai por WhatsApp e pode ser reencaminhado, e
   quem o recebe não pode ganhar o poder de cancelar o horário de alguém.
   A página do sinal só lê e mostra o PIX. */
export function generateSinalToken(appointmentId: string): string {
  return createHmac('sha256', getSecret())
    .update(`sinal:${appointmentId}`)
    .digest('hex')
}

export function verifySinalToken(appointmentId: string, token: string): boolean {
  const expected = generateSinalToken(appointmentId)
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token))
  } catch {
    return false
  }
}

/** Gera token HMAC para cancelamento pelo cliente */
export function generateCancelToken(appointmentId: string): string {
  return createHmac('sha256', getSecret())
    .update(`cancel:${appointmentId}`)
    .digest('hex')
}

/** Verifica token de cancelamento (constant-time comparison) */
export function verifyCancelToken(appointmentId: string, token: string): boolean {
  const expected = generateCancelToken(appointmentId)
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token))
  } catch {
    return false
  }
}
