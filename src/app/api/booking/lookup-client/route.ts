import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit-api'

/**
 * GET /api/booking/lookup-client?phone=<raw>
 *
 * Endpoint PUBLICO — reconhece cliente recorrente pelo telefone no
 * BookingFlow. Antes o navegador fazia SELECT em clients direto com anon,
 * o que expunha a tabela inteira. Agora vai por service_role e retorna
 * SÓ a linha do telefone consultado (uma, nunca a lista).
 *
 * Match tolerante a formato (igual ao lookupClientByPhone original):
 * tenta digits-only, fallback pro formato cru.
 *
 * Rate-limit apertado pra dificultar enumeração de telefones.
 */
export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'booking-lookup', limit: 20, windowSeconds: 60 })
  if (rl) return rl

  const { searchParams } = new URL(req.url)
  const raw = (searchParams.get('phone') || '').trim()
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 10) {
    return NextResponse.json({ client: null })
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  let { data } = await db
    .from('clients')
    .select('id, name, phone, email, created_at')
    .eq('phone', digits)
    .maybeSingle()

  if (!data && raw !== digits) {
    const r = await db
      .from('clients')
      .select('id, name, phone, email, created_at')
      .eq('phone', raw)
      .maybeSingle()
    data = r.data
  }

  return NextResponse.json({ client: data ?? null })
}
