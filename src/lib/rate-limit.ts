/**
 * Rate limiter in-memory baseado em sliding window.
 * Funciona bem em serverless (Vercel) — cada cold start reseta o estado,
 * o que é aceitável (rate limit é best-effort, não garantia absoluta).
 * Para garantia absoluta em produção, migrar para Upstash Redis.
 */

type Entry = { count: number; resetAt: number }

const store = new Map<string, Entry>()

// Limpa entradas expiradas a cada 60s para evitar memory leak
let lastCleanup = Date.now()
function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < 60_000) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}

type RateLimitConfig = {
  /** Identificador único (ex: IP, user ID) */
  key: string
  /** Máximo de requests na janela */
  limit: number
  /** Janela em segundos */
  windowSeconds: number
}

type RateLimitResult = {
  success: boolean
  remaining: number
  resetAt: number
}

export function rateLimit({ key, limit, windowSeconds }: RateLimitConfig): RateLimitResult {
  cleanup()

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowSeconds * 1000
    store.set(key, { count: 1, resetAt })
    return { success: true, remaining: limit - 1, resetAt }
  }

  entry.count++
  store.set(key, entry)

  if (entry.count > limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}
