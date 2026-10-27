import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Cupom (?cupom) e indicação (?ref) do link da página pública /[slug].
 *
 * Saiu de dentro da página em 27/10/2026: ler a URL no servidor deixava a
 * /[slug] dinâmica e cada visita custava CPU de função. Agora a página fica
 * em cache e só quem chega com cupom/indicação chama esta rota.
 *
 * Mesmas regras de antes: cupom vale se for do negócio, não usado e não
 * vencido; indicação é lida via service_role porque `customers` tem RLS
 * travado pra role anon (fix Fase 1). Só devolve o nome de quem indicou.
 */
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams
  const businessId = p.get('b') ?? ''
  const cupom = (p.get('cupom') ?? '').trim().slice(0, 40)
  const ref = (p.get('ref') ?? '').trim().slice(0, 40)

  if (!/^[0-9a-f-]{36}$/i.test(businessId) || (!cupom && !ref)) {
    return NextResponse.json({ cupom: null, indicacao: null })
  }

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const [{ data: coupon }, { data: refCustomer }, { data: business }] = await Promise.all([
    cupom
      ? svc
          .from('coupons')
          .select('code, discount_type, discount_value, expires_at, used_at')
          .eq('code', cupom.toUpperCase())
          .eq('business_id', businessId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    ref
      ? svc
          .from('customers')
          .select('name')
          .eq('referral_code', ref)
          .eq('business_id', businessId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    ref
      ? svc.from('businesses').select('points_for_referral').eq('id', businessId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const cupomValido =
    coupon && !coupon.used_at && new Date(coupon.expires_at) > new Date()
      ? {
          code: coupon.code as string,
          discount_type: coupon.discount_type as 'fixed' | 'percent',
          discount_value: Number(coupon.discount_value),
        }
      : null

  const indicacao = refCustomer
    ? { name: refCustomer.name as string, pointsForReferral: Number(business?.points_for_referral ?? 0) }
    : null

  return NextResponse.json({ cupom: cupomValido, indicacao })
}
