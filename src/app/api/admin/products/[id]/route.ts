import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/lib/rate-limit-api'

/**
 * PATCH /api/admin/products/[id]
 * Atualiza metadados do produto (não mexe em quantity · isso vai por /movement).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(req, { key: 'admin-products-update', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const update: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim()
  if (typeof body.description === 'string') update.description = body.description.trim() || null
  if (typeof body.unit === 'string' && body.unit.trim()) update.unit = body.unit.trim()
  if (typeof body.price === 'number' && body.price >= 0) update.price = body.price
  else if (body.price === null) update.price = null
  if (typeof body.cost === 'number' && body.cost >= 0) update.cost = body.cost
  else if (body.cost === null) update.cost = null
  if (typeof body.min_quantity === 'number' && body.min_quantity >= 0) update.min_quantity = body.min_quantity

  // v64 extras
  if ('brand_id' in body) update.brand_id = (typeof body.brand_id === 'string' && body.brand_id) ? body.brand_id : null
  if ('category_id' in body) update.category_id = (typeof body.category_id === 'string' && body.category_id) ? body.category_id : null
  if ('variant' in body) update.variant = (typeof body.variant === 'string' ? body.variant.trim() || null : null)
  if ('expires_at' in body) update.expires_at = (typeof body.expires_at === 'string' && body.expires_at ? body.expires_at : null)
  if ('pack_quantity' in body) update.pack_quantity = (typeof body.pack_quantity === 'number' && body.pack_quantity > 0 ? body.pack_quantity : null)
  if ('barcode' in body) update.barcode = (typeof body.barcode === 'string' ? body.barcode.trim() || null : null)
  if ('sku' in body) update.sku = (typeof body.sku === 'string' ? body.sku.trim() || null : null)
  if (typeof body.track_stock === 'boolean') update.track_stock = body.track_stock
  if (typeof body.sale_active === 'boolean') update.sale_active = body.sale_active
  if ('commission_type' in body) {
    update.commission_type = (typeof body.commission_type === 'string' && ['percent', 'fixed'].includes(body.commission_type) ? body.commission_type : null)
  }
  if ('commission_value' in body) {
    update.commission_value = (typeof body.commission_value === 'number' && body.commission_value >= 0 ? body.commission_value : null)
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nada pra atualizar' }, { status: 400 })
  }
  update.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('products')
    .update(update)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath('/admin/produtos')
  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/admin/products/[id]
 * Soft-delete (active=false). Preserva histórico de movimentações.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(req, { key: 'admin-products-delete', limit: 30, windowSeconds: 60 })
  if (rl) return rl

  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { error } = await supabase
    .from('products')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath('/admin/produtos')
  return NextResponse.json({ ok: true })
}
