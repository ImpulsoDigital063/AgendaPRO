import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit-api'

/**
 * GET /api/coupons/lookup?code=X&business_id=Y
 *
 * Endpoint PUBLICO (sem auth) usado pelo booking pra validar cupom
 * antes de aplicar desconto. Sem auth pra cliente final poder usar
 * sem login. RLS garante seguranca: SELECT publico, mas so cupons
 * existentes retornam.
 *
 * Retorna { valid, reason, discount_type, discount_value, expires_at }
 */
export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'coupon-lookup', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const url = new URL(req.url)
  const code = (url.searchParams.get('code') || '').toUpperCase()
  const business_id = url.searchParams.get('business_id') || ''
  // v44 · 14/05/2026 — phone opcional pra checar se este telefone já
  // usou um cupom standalone (resposta antecipada de used_by_phone).
  // Sem phone, retorna válido se cupom existe + ativo (cliente final
  // ainda não digitou phone no booking · validação final no /use).
  const phoneRaw = url.searchParams.get('phone') || ''
  const phoneDigits = phoneRaw.replace(/\D/g, '')

  if (!code || !business_id) {
    return NextResponse.json({ valid: false, reason: 'invalid_params' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: coupon } = await supabase
    .from('coupons')
    .select('id, code, business_id, customer_id, discount_type, discount_value, expires_at, used_at, is_standalone, professional_id')
    .eq('code', code)
    .eq('business_id', business_id)
    .maybeSingle()

  if (!coupon) {
    return NextResponse.json({ valid: false, reason: 'not_found' })
  }
  // used_at só queima cupons de campanha (is_standalone=FALSE). Standalone
  // não consome via used_at — multi-uso por telefone via coupon_redemptions.
  if (!coupon.is_standalone && coupon.used_at) {
    return NextResponse.json({ valid: false, reason: 'used' })
  }
  if (new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, reason: 'expired' })
  }

  // Standalone: checa se phone fornecido já tem redemption desse cupom.
  if (coupon.is_standalone && phoneDigits.length >= 10) {
    const { data: existing } = await supabase
      .from('coupon_redemptions')
      .select('id')
      .eq('coupon_id', coupon.id)
      .eq('customer_phone', phoneDigits)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ valid: false, reason: 'used_by_phone' })
    }
  }

  return NextResponse.json({
    valid: true,
    coupon_id: coupon.id,
    customer_id: coupon.customer_id,
    discount_type: coupon.discount_type,
    discount_value: Number(coupon.discount_value),
    expires_at: coupon.expires_at,
    is_standalone: coupon.is_standalone,
    professional_id: coupon.professional_id,
  })
}
