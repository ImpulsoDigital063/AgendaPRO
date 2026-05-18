import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/lib/rate-limit-api'

// 'courtesy' aceito como legacy (V34). UI nova usa 'points' pra resgate
// de fidelidade. Constraint do banco já aceita os 5 (V37).
const VALID_METHODS = new Set(['pix', 'cash', 'card', 'courtesy', 'points'])
const VALID_CARD_TYPES = new Set(['credit', 'debit'])

/**
 * POST /api/admin/appointments/[id]/payment
 *
 * Body pra marcar pago em método não-cartão:
 *   { method: 'pix' | 'cash' | 'courtesy' | 'points' }
 *
 * Body pra marcar pago em cartão (com taxa snapshot):
 *   { method: 'card', device_id: uuid, card_brand: text, card_type: 'credit'|'debit', fee_percent: number }
 *
 * Body pra desmarcar:
 *   { paid: false }
 *
 * Autorizado: dono do business OU recepcionista (is_receptionist=true)
 * do mesmo business.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(req, { key: 'admin-appt-payment', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  // Validacao: appointment + business
  const { data: appt } = await supabase
    .from('appointments')
    .select('id, business_id')
    .eq('id', id)
    .single()
  if (!appt) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Autorização: dono OU recepcionista do business
  const [{ data: business }, { data: prof }] = await Promise.all([
    supabase
      .from('businesses')
      .select('id')
      .eq('id', appt.business_id)
      .eq('owner_id', user.id)
      .maybeSingle(),
    supabase
      .from('professionals')
      .select('id, is_receptionist')
      .eq('business_id', appt.business_id)
      .eq('auth_user_id', user.id)
      .maybeSingle(),
  ])
  const isOwner = !!business
  const isReceptionist = prof?.is_receptionist === true
  if (!isOwner && !isReceptionist) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // 2 modos: marcar pago (com method) OU desmarcar (paid: false)
  const updates: {
    paid_at: string | null
    payment_method: string | null
    payment_device_id?: string | null
    payment_card_brand?: string | null
    payment_card_type?: string | null
    payment_fee_percent?: number | null
    payment_installments?: number
  } = {
    paid_at: null,
    payment_method: null,
    payment_device_id: null,
    payment_card_brand: null,
    payment_card_type: null,
    payment_fee_percent: null,
    payment_installments: 1,
  }

  if (body.paid !== false) {
    const method = typeof body.method === 'string' ? body.method : null
    if (!method || !VALID_METHODS.has(method)) {
      return NextResponse.json(
        { error: 'método inválido (use pix, cash, card, courtesy ou points)' },
        { status: 400 }
      )
    }
    updates.paid_at = new Date().toISOString()
    updates.payment_method = method

    // Snapshot dos dados de cartão — só relevante quando method='card'
    if (method === 'card') {
      const deviceId = typeof body.device_id === 'string' ? body.device_id : null
      const brand = typeof body.card_brand === 'string' ? body.card_brand.trim() : null
      const cardType = typeof body.card_type === 'string' ? body.card_type : null
      const feePercent =
        typeof body.fee_percent === 'number' && body.fee_percent >= 0 && body.fee_percent < 100
          ? body.fee_percent
          : null

      if (cardType && !VALID_CARD_TYPES.has(cardType)) {
        return NextResponse.json({ error: 'card_type inválido' }, { status: 400 })
      }

      // Validação: se forneceu device_id, ele tem que pertencer ao business
      if (deviceId) {
        const { data: device } = await supabase
          .from('merchant_devices')
          .select('id')
          .eq('id', deviceId)
          .eq('business_id', appt.business_id)
          .maybeSingle()
        if (!device) {
          return NextResponse.json(
            { error: 'maquininha não pertence a este negócio' },
            { status: 400 }
          )
        }
      }

      updates.payment_device_id = deviceId
      updates.payment_card_brand = brand
      updates.payment_card_type = cardType
      updates.payment_fee_percent = feePercent

      const installments = typeof body.installments === 'number' && body.installments >= 1 && body.installments <= 12
        ? body.installments
        : 1
      updates.payment_installments = installments
    }
  }

  const { error: updateErr } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)

  if (updateErr) {
    console.error('payment update error:', updateErr)
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  revalidatePath('/admin/financeiro')
  return NextResponse.json({
    ok: true,
    paid_at: updates.paid_at,
    payment_method: updates.payment_method,
    payment_device_id: updates.payment_device_id,
    payment_card_brand: updates.payment_card_brand,
    payment_card_type: updates.payment_card_type,
    payment_fee_percent: updates.payment_fee_percent,
  })
}
