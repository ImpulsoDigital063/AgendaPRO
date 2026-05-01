import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = (url.searchParams.get('code') || '').toUpperCase()
  const business_id = url.searchParams.get('business_id') || ''

  if (!code || !business_id) {
    return NextResponse.json({ valid: false, reason: 'invalid_params' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: coupon } = await supabase
    .from('coupons')
    .select('id, code, business_id, customer_id, discount_type, discount_value, expires_at, used_at')
    .eq('code', code)
    .eq('business_id', business_id)
    .maybeSingle()

  if (!coupon) {
    return NextResponse.json({ valid: false, reason: 'not_found' })
  }
  if (coupon.used_at) {
    return NextResponse.json({ valid: false, reason: 'used' })
  }
  if (new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, reason: 'expired' })
  }

  return NextResponse.json({
    valid: true,
    coupon_id: coupon.id,
    customer_id: coupon.customer_id,
    discount_type: coupon.discount_type,
    discount_value: Number(coupon.discount_value),
    expires_at: coupon.expires_at,
  })
}
