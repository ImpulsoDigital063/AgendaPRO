/**
 * Helper de rate limit pra API routes — retorna NextResponse 429 direto
 * se exceder limite, ou null se passou. Reduz boilerplate de 8 linhas
 * pra 2 em cada handler.
 *
 * Uso:
 *   export async function POST(req: NextRequest) {
 *     const rl = checkRateLimit(req, 'minha-rota')
 *     if (rl) return rl
 *     // ... handler normal
 *   }
 *
 * Default 60/min é razoável pra ações administrativas (logado). Pra
 * fluxos públicos críticos (cadastro, regenerate-pix) usar limite mais
 * baixo (5-10/hora) explicitamente.
 *
 * Key inclui IP — protege contra script abusivo do mesmo cliente.
 * Chave de prefixo separa contadores entre rotas.
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

export type RateLimitOptions = {
  /** Identificador único da rota (prefixo da chave). Ex: 'notify-client'. */
  key: string
  /** Máximo de requests na janela. Default 60. */
  limit?: number
  /** Janela em segundos. Default 60 (1 min). */
  windowSeconds?: number
  /** Mensagem custom de erro. */
  message?: string
}

/**
 * Verifica rate limit. Retorna NextResponse 429 se excedeu, null se ok.
 *
 * Adiciona header `Retry-After` com segundos restantes pra ajudar
 * clients respeitarem o limite (browsers fazem isso automaticamente).
 */
export function checkRateLimit(
  req: NextRequest,
  options: RateLimitOptions | string
): NextResponse | null {
  const opts: RateLimitOptions = typeof options === 'string' ? { key: options } : options
  const { key, limit = 60, windowSeconds = 60, message } = opts

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const result = rateLimit({
    key: `${key}:${ip}`,
    limit,
    windowSeconds,
  })

  if (!result.success) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
    return NextResponse.json(
      { error: message || 'Muitas requisições. Tente novamente em instantes.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.max(retryAfter, 1)) },
      }
    )
  }

  return null
}
