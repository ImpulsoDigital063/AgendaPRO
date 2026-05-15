import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit-api'

/**
 * POST /api/coupons/use
 * Body: { code, appointment_id }
 *
 * Marca um cupom como usado, vinculando ao appointment criado.
 * Endpoint PUBLICO (sem auth) — chamado pelo cliente final no
 * BookingFlow após confirmar agendamento. RLS da tabela coupons
 * só permite UPDATE pro owner, então usamos service-role aqui.
 *
 * Validação anti-abuso:
 *  1. Cupom existe e não usado
 *  2. Appointment existe e ainda não tem outro cupom vinculado
 *  3. Cupom e appointment são do MESMO business (anti-cross-business)
 *  4. Idempotente — tentar marcar 2x retorna OK silencioso
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'coupon-use', limit: 30, windowSeconds: 60 })
  if (rl) return rl

  const body = await req.json().catch(() => ({}))
  const code = typeof body.code === 'string' ? body.code.toUpperCase() : ''
  const appointmentId = typeof body.appointment_id === 'string' ? body.appointment_id : ''
  // v44 · phone obrigatório pra cupons standalone (rastreia 1 uso por
  // telefone via coupon_redemptions). Cupons de campanha legados ignoram.
  const phoneRaw = typeof body.client_phone === 'string' ? body.client_phone : ''
  const phoneDigits = phoneRaw.replace(/\D/g, '')

  if (!code || !appointmentId) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }

  // Lookup com cliente regular (RLS público de SELECT)
  const supabase = await createClient()

  const { data: coupon } = await supabase
    .from('coupons')
    .select('id, business_id, used_at, expires_at, is_standalone')
    .eq('code', code)
    .maybeSingle()

  if (!coupon) {
    return NextResponse.json({ error: 'coupon_not_found' }, { status: 404 })
  }

  // Idempotente pra cupom de campanha legado: se já marcado, OK.
  // (Standalone não usa used_at — pulamos check.)
  if (!coupon.is_standalone && coupon.used_at) {
    return NextResponse.json({ ok: true, already_used: true })
  }

  if (new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ error: 'coupon_expired' }, { status: 400 })
  }

  // Valida que appointment é do mesmo business (anti-cross-business)
  const { data: appointment } = await supabase
    .from('appointments')
    .select('id, business_id, client_phone')
    .eq('id', appointmentId)
    .maybeSingle()

  if (!appointment) {
    return NextResponse.json({ error: 'appointment_not_found' }, { status: 404 })
  }

  if (appointment.business_id !== coupon.business_id) {
    return NextResponse.json({ error: 'business_mismatch' }, { status: 403 })
  }

  // Service-role pra escrever (RLS de UPDATE/INSERT só permite owner —
  // cliente final é anônimo).
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // CAMINHO A · cupom standalone (multi-uso por telefone)
  if (coupon.is_standalone) {
    // Phone vem do body OU fallback pro appointment.client_phone gravado.
    const effectivePhone = phoneDigits || (appointment.client_phone || '').replace(/\D/g, '')
    if (effectivePhone.length < 10) {
      return NextResponse.json({ error: 'phone_required_for_standalone' }, { status: 400 })
    }
    const { error: insErr } = await admin
      .from('coupon_redemptions')
      .insert({
        coupon_id: coupon.id,
        customer_phone: effectivePhone,
        appointment_id: appointmentId,
      })
    if (insErr) {
      const code = (insErr as { code?: string }).code
      // 23505 = unique_violation · UNIQUE (coupon_id, customer_phone)
      // dispara quando o mesmo telefone tenta usar 2x. Mensagem clara.
      if (code === '23505') {
        return NextResponse.json({ error: 'coupon_already_used_by_phone' }, { status: 409 })
      }
      console.error('coupon redemption insert error:', insErr)
      return NextResponse.json({ error: 'redemption_failed' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, mode: 'standalone' })
  }

  // CAMINHO B · cupom de campanha legado (1 uso global · marca used_at)
  // .select(count: 'exact') retorna nº de linhas afetadas. Se outro
  // request marcou entre nosso SELECT e este UPDATE, count=0 → 409.
  const { error: updateErr, count } = await admin
    .from('coupons')
    .update(
      {
        used_at: new Date().toISOString(),
        used_appointment_id: appointmentId,
      },
      { count: 'exact' }
    )
    .eq('id', coupon.id)
    .is('used_at', null)

  if (updateErr) {
    console.error('coupons mark used error:', updateErr)
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  if (count === 0) {
    return NextResponse.json({ error: 'coupon_already_used' }, { status: 409 })
  }

  return NextResponse.json({ ok: true, mode: 'campaign' })
}
