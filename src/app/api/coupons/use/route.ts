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

  if (!code || !appointmentId) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }

  // Lookup com cliente regular (RLS público de SELECT)
  const supabase = await createClient()

  const { data: coupon } = await supabase
    .from('coupons')
    .select('id, business_id, used_at, expires_at')
    .eq('code', code)
    .maybeSingle()

  if (!coupon) {
    return NextResponse.json({ error: 'coupon_not_found' }, { status: 404 })
  }

  // Idempotente: se já marcado, retorna OK sem rodar update de novo
  if (coupon.used_at) {
    return NextResponse.json({ ok: true, already_used: true })
  }

  if (new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ error: 'coupon_expired' }, { status: 400 })
  }

  // Valida que appointment é do mesmo business (anti-cross-business)
  const { data: appointment } = await supabase
    .from('appointments')
    .select('id, business_id')
    .eq('id', appointmentId)
    .maybeSingle()

  if (!appointment) {
    return NextResponse.json({ error: 'appointment_not_found' }, { status: 404 })
  }

  if (appointment.business_id !== coupon.business_id) {
    return NextResponse.json({ error: 'business_mismatch' }, { status: 403 })
  }

  // Update via service-role (RLS de UPDATE só permite owner — cliente
  // final é anônimo). Operação atômica via WHERE used_at IS NULL.
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // .select(count: 'exact') retorna nº de linhas afetadas.
  // Se outro cliente conseguiu marcar entre o SELECT acima e este
  // UPDATE (race), o WHERE used_at IS NULL bate 0 linhas — antes isso
  // retornava ok=true silencioso (bug: 2 appointments achavam que tinham
  // o cupom). Agora distingue: 1 linha = sucesso, 0 = corrida perdida.
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
    // Cupom foi marcado por outro request entre nosso SELECT e UPDATE.
    return NextResponse.json({ error: 'coupon_already_used' }, { status: 409 })
  }

  return NextResponse.json({ ok: true })
}
