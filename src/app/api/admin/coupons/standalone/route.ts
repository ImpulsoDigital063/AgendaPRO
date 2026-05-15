/**
 * Cupom AVULSO (standalone) · IDEIA 3 Olímpio · 14/05/2026
 *
 * POST /api/admin/coupons/standalone
 *   Body: {
 *     discount_type: 'fixed' | 'percent',
 *     discount_value: number,
 *     validity_days: number (1-365),
 *     label?: string  (nome amigável pro dono: "Promo do rapaz")
 *     professional_id?: string (opcional · decisão 1C · direciona pro prof)
 *   }
 *   Cria 1 cupom is_standalone=TRUE · customer_id=NULL · code único.
 *   Retorna { coupon, share_url, whatsapp_text }.
 *
 * GET /api/admin/coupons/standalone
 *   Lista cupons standalone do business · com contador de usos · ativos
 *   (não expirados) por padrão. ?include_expired=1 inclui histórico.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/lib/rate-limit-api'

const DISCOUNT_TYPES = new Set(['fixed', 'percent'])
const COUPON_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function genCode(): string {
  let c = 'PRO'
  for (let i = 0; i < 5; i++) {
    c += COUPON_ALPHABET[Math.floor(Math.random() * COUPON_ALPHABET.length)]
  }
  return c
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-coupon-standalone-create', limit: 20, windowSeconds: 60 })
  if (rl) return rl

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id, slug, name')
    .eq('owner_id', user.id)
    .single()
  if (!business) return NextResponse.json({ error: 'business_not_found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const discount_type = typeof body.discount_type === 'string' && DISCOUNT_TYPES.has(body.discount_type)
    ? (body.discount_type as 'fixed' | 'percent')
    : null
  const discount_value = Number(body.discount_value)
  const validity_days = Number(body.validity_days)
  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 80) : null
  const professional_id = typeof body.professional_id === 'string' && body.professional_id
    ? body.professional_id
    : null

  if (!discount_type) {
    return NextResponse.json({ error: 'discount_type inválido (fixed | percent)' }, { status: 400 })
  }
  if (!Number.isFinite(discount_value) || discount_value <= 0) {
    return NextResponse.json({ error: 'desconto inválido' }, { status: 400 })
  }
  if (discount_type === 'percent' && discount_value > 100) {
    return NextResponse.json({ error: 'percentual máximo 100%' }, { status: 400 })
  }
  if (discount_type === 'fixed' && discount_value > 1000) {
    return NextResponse.json({ error: 'desconto fixo máximo R$ 1.000' }, { status: 400 })
  }
  if (!Number.isFinite(validity_days) || validity_days < 1 || validity_days > 365) {
    return NextResponse.json({ error: 'validade entre 1 e 365 dias' }, { status: 400 })
  }

  // Se professional_id veio, valida que pertence ao mesmo business
  if (professional_id) {
    const { data: prof } = await supabase
      .from('professionals')
      .select('id, business_id')
      .eq('id', professional_id)
      .maybeSingle()
    if (!prof || prof.business_id !== business.id) {
      return NextResponse.json({ error: 'professional_id inválido' }, { status: 400 })
    }
  }

  const expires_at = new Date()
  expires_at.setDate(expires_at.getDate() + validity_days)

  // Tenta gerar código único · até 5 tentativas em caso de colisão.
  // Alfabeto 32^5 = ~33M combinações · colisão praticamente impossível.
  let lastErr: unknown = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genCode()
    const { data: inserted, error } = await supabase
      .from('coupons')
      .insert({
        business_id: business.id,
        customer_id: null,
        professional_id,
        code,
        discount_type,
        discount_value,
        expires_at: expires_at.toISOString(),
        is_standalone: true,
        standalone_label: label,
      })
      .select('id, code, discount_type, discount_value, expires_at, standalone_label, professional_id')
      .single()

    if (!error && inserted) {
      // URL pública: /{slug}?cupom=CODE · BookingFlow detecta e aplica
      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/${business.slug}?cupom=${code}`
      const valueStr = discount_type === 'percent'
        ? `${discount_value.toFixed(0)}% off`
        : `R$ ${discount_value.toFixed(2).replace('.', ',')} de desconto`
      const expDate = expires_at.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      const whatsappText = `Cupom pra cortar comigo: ${valueStr} · use o código ${code} ou abra direto: ${shareUrl} · vale até ${expDate}`

      revalidatePath('/admin')
      revalidatePath('/admin/clientes/campanhas')

      return NextResponse.json({
        ok: true,
        coupon: inserted,
        share_url: shareUrl,
        whatsapp_text: whatsappText,
      })
    }

    // 23505 = unique_violation no code (extremamente raro · retry)
    lastErr = error
    const errCode = (error as { code?: string } | null)?.code
    if (errCode !== '23505') break
  }

  console.error('standalone coupon insert error:', lastErr)
  return NextResponse.json({ error: 'falha ao criar cupom' }, { status: 500 })
}

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-coupon-standalone-list', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id, slug')
    .eq('owner_id', user.id)
    .single()
  if (!business) return NextResponse.json({ error: 'business_not_found' }, { status: 404 })

  const url = new URL(req.url)
  const includeExpired = url.searchParams.get('include_expired') === '1'

  let query = supabase
    .from('coupons')
    .select('id, code, discount_type, discount_value, expires_at, standalone_label, professional_id, created_at')
    .eq('business_id', business.id)
    .eq('is_standalone', true)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!includeExpired) {
    query = query.gt('expires_at', new Date().toISOString())
  }

  const { data: coupons } = await query

  if (!coupons || coupons.length === 0) {
    return NextResponse.json({ coupons: [], usageByCoupon: {} })
  }

  // Conta usos por cupom em batch (1 query · não N+1)
  const couponIds = coupons.map((c) => c.id)
  const { data: redemptions } = await supabase
    .from('coupon_redemptions')
    .select('coupon_id')
    .in('coupon_id', couponIds)

  const usageByCoupon: Record<string, number> = {}
  for (const r of redemptions || []) {
    if (r.coupon_id) usageByCoupon[r.coupon_id] = (usageByCoupon[r.coupon_id] ?? 0) + 1
  }

  // Nomes dos profissionais (1 query batch · só os que aparecem)
  const profIds = Array.from(
    new Set(coupons.map((c) => c.professional_id).filter(Boolean) as string[]),
  )
  const { data: profs } = profIds.length > 0
    ? await supabase
        .from('professionals')
        .select('id, name')
        .in('id', profIds)
    : { data: [] }
  const profNameById = new Map((profs || []).map((p) => [p.id, p.name as string]))

  const enriched = coupons.map((c) => ({
    ...c,
    professional_name: c.professional_id ? profNameById.get(c.professional_id) ?? null : null,
    uses: usageByCoupon[c.id] ?? 0,
    share_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/${business.slug}?cupom=${c.code}`,
  }))

  return NextResponse.json({ coupons: enriched })
}
