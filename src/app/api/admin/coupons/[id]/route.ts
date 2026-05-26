/**
 * DELETE /api/admin/coupons/[id]
 *   Apaga 1 cupom (validando ownership pelo business_id do user logado).
 *   Eduardo cravou 26/05: tem que poder excluir promoção de teste que ficou
 *   poluindo a tela. Recep não tem acesso (passa por owner_id no businesses).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()
  if (!business) return NextResponse.json({ error: 'business_not_found' }, { status: 404 })

  // Confirma que o cupom pertence ao business antes de apagar
  const { data: coupon } = await supabase
    .from('coupons')
    .select('id, business_id, is_standalone')
    .eq('id', id)
    .maybeSingle()
  if (!coupon) return NextResponse.json({ error: 'cupom não encontrado' }, { status: 404 })
  if (coupon.business_id !== business.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // ON DELETE CASCADE em coupon_redemptions cuida do histórico de uso.
  const { error } = await supabase.from('coupons').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/admin/cupons')
  revalidatePath('/recepcao/cupons')
  return NextResponse.json({ ok: true })
}
