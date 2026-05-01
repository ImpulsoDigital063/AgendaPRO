import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/coupons/[id]/sent
 * Marca cupom como enviado (clicou no botão WhatsApp). Usado pra
 * UI rastrear quem ja foi contatado e nao bombardear o cliente.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  // Validacao via business+owner
  const { data: coupon } = await supabase
    .from('coupons')
    .select('id, business_id')
    .eq('id', id)
    .single()
  if (!coupon) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', coupon.business_id)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!business) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { error } = await supabase
    .from('coupons')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
