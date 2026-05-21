import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit-api'

/**
 * POST /api/admin/coupons/[id]/sent
 * Marca cupom como enviado (clicou no botão WhatsApp). Usado pra
 * UI rastrear quem ja foi contatado e nao bombardear o cliente.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(req, { key: 'admin-coupon-sent', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  // Validacao via business+owner OU recepcionista do mesmo business.
  // Recepcionista precisa marcar enviado quando dispara WhatsApp no painel /recepcao/sumidos.
  const { data: coupon } = await supabase
    .from('coupons')
    .select('id, business_id')
    .eq('id', id)
    .single()
  if (!coupon) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: ownerBusiness } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', coupon.business_id)
    .eq('owner_id', user.id)
    .maybeSingle()

  let authorized = !!ownerBusiness
  if (!authorized) {
    const { data: recep } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('business_id', coupon.business_id)
      .eq('is_receptionist', true)
      .maybeSingle()
    authorized = !!recep
  }
  if (!authorized) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { error } = await supabase
    .from('coupons')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
