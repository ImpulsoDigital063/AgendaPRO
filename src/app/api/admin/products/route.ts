import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/lib/rate-limit-api'

/**
 * GET /api/admin/products
 * Lista produtos do business.
 * Acesso: owner ou recepcionista.
 */
export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-products-list', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const businessId = await resolveBusinessId(supabase, user.id)
  if (!businessId) return NextResponse.json({ error: 'business_not_found' }, { status: 404 })

  const { data, error } = await supabase
    .from('products')
    .select(`
      id, name, description, unit, price, cost, quantity, min_quantity, active, created_at, updated_at,
      brand_id, category_id, variant, expires_at, pack_quantity, barcode, sku, image_url,
      track_stock, sale_active, commission_type, commission_value,
      brand:product_brands(id, name),
      category:product_categories(id, name)
    `)
    .eq('business_id', businessId)
    .eq('active', true)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ products: data ?? [] })
}

/**
 * POST /api/admin/products
 * Cria novo produto. quantity inicial vai como movement (entry) pra trigger
 * funcionar igual entradas futuras.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-products-create', limit: 30, windowSeconds: 60 })
  if (rl) return rl

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const businessId = await resolveBusinessId(supabase, user.id)
  if (!businessId) return NextResponse.json({ error: 'business_not_found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  if (name.length > 120) return NextResponse.json({ error: 'Nome longo demais (max 120)' }, { status: 400 })

  const initialQty = typeof body.quantity === 'number' && body.quantity >= 0 ? body.quantity : 0

  // Campos v64 (paridade Salão99)
  const commissionType = typeof body.commission_type === 'string' && ['percent', 'fixed'].includes(body.commission_type) ? body.commission_type : null
  const commissionValue = typeof body.commission_value === 'number' && body.commission_value >= 0 ? body.commission_value : null

  // ── VARIANTES (v88 · Caminho A) ────────────────────────────────────────
  // Cada variante é uma LINHA de products, com variant/preço/estoque/sku
  // próprios, compartilhando variant_group_id + name. Reusa o motor de
  // estoque/venda/comissão (só product_id). Sem variantes → cria 1 produto.
  const variantsIn = Array.isArray(body.variants) ? body.variants : []
  if (variantsIn.length > 0) {
    const groupId = crypto.randomUUID()
    const shared = {
      business_id: businessId,
      name,
      description: typeof body.description === 'string' ? body.description.trim() || null : null,
      unit: typeof body.unit === 'string' && body.unit.trim() ? body.unit.trim() : 'un',
      cost: typeof body.cost === 'number' && body.cost >= 0 ? body.cost : null,
      min_quantity: typeof body.min_quantity === 'number' && body.min_quantity >= 0 ? body.min_quantity : 0,
      brand_id: typeof body.brand_id === 'string' && body.brand_id ? body.brand_id : null,
      category_id: typeof body.category_id === 'string' && body.category_id ? body.category_id : null,
      expires_at: typeof body.expires_at === 'string' && body.expires_at ? body.expires_at : null,
      pack_quantity: typeof body.pack_quantity === 'number' && body.pack_quantity > 0 ? body.pack_quantity : null,
      track_stock: typeof body.track_stock === 'boolean' ? body.track_stock : true,
      sale_active: typeof body.sale_active === 'boolean' ? body.sale_active : true,
      commission_type: commissionType,
      commission_value: commissionValue,
      image_url: typeof body.image_url === 'string' && body.image_url.trim() ? body.image_url.trim() : null,
      variant_group_id: groupId,
      quantity: 0,
    }
    const createdIds: string[] = []
    for (const v of variantsIn) {
      const vLabel = typeof v?.variant === 'string' ? v.variant.trim() : ''
      if (!vLabel) continue
      const { data: created, error } = await supabase
        .from('products')
        .insert({
          ...shared,
          variant: vLabel,
          price: typeof v.price === 'number' && v.price >= 0 ? v.price : null,
          sku: typeof v.sku === 'string' ? v.sku.trim() || null : null,
        })
        .select('id')
        .single()
      if (error || !created) {
        // rollback do que já criou pra não deixar grupo pela metade
        if (createdIds.length > 0) await supabase.from('products').delete().in('id', createdIds)
        return NextResponse.json({ error: error?.message ?? 'erro ao criar variante' }, { status: 500 })
      }
      createdIds.push(created.id as string)
      const vQty = typeof v.quantity === 'number' && v.quantity >= 0 ? v.quantity : 0
      if (shared.track_stock && vQty > 0) {
        await supabase.from('stock_movements').insert({
          business_id: businessId, product_id: created.id, type: 'entry',
          quantity: vQty, reason: 'Estoque inicial', created_by: user.id,
        })
      }
    }
    if (createdIds.length === 0) {
      return NextResponse.json({ error: 'Adicione pelo menos 1 variante com rótulo' }, { status: 400 })
    }
    revalidatePath('/admin/produtos')
    return NextResponse.json({ ok: true, group_id: groupId, count: createdIds.length })
  }

  const { data: created, error: insErr } = await supabase
    .from('products')
    .insert({
      business_id: businessId,
      name,
      description: typeof body.description === 'string' ? body.description.trim() || null : null,
      unit: typeof body.unit === 'string' && body.unit.trim() ? body.unit.trim() : 'un',
      price: typeof body.price === 'number' && body.price >= 0 ? body.price : null,
      cost: typeof body.cost === 'number' && body.cost >= 0 ? body.cost : null,
      quantity: 0,
      min_quantity: typeof body.min_quantity === 'number' && body.min_quantity >= 0 ? body.min_quantity : 0,
      // v64 extras
      brand_id: typeof body.brand_id === 'string' && body.brand_id ? body.brand_id : null,
      category_id: typeof body.category_id === 'string' && body.category_id ? body.category_id : null,
      variant: typeof body.variant === 'string' ? body.variant.trim() || null : null,
      expires_at: typeof body.expires_at === 'string' && body.expires_at ? body.expires_at : null,
      pack_quantity: typeof body.pack_quantity === 'number' && body.pack_quantity > 0 ? body.pack_quantity : null,
      barcode: typeof body.barcode === 'string' ? body.barcode.trim() || null : null,
      sku: typeof body.sku === 'string' ? body.sku.trim() || null : null,
      track_stock: typeof body.track_stock === 'boolean' ? body.track_stock : true,
      sale_active: typeof body.sale_active === 'boolean' ? body.sale_active : true,
      commission_type: commissionType,
      commission_value: commissionValue,
      image_url: typeof body.image_url === 'string' && body.image_url.trim() ? body.image_url.trim() : null,
    })
    .select('id')
    .single()

  if (insErr || !created) {
    return NextResponse.json({ error: insErr?.message ?? 'erro ao criar' }, { status: 500 })
  }

  // Estoque inicial vira primeiro movement (mantém histórico consistente)
  if (initialQty > 0) {
    await supabase.from('stock_movements').insert({
      business_id: businessId,
      product_id: created.id,
      type: 'entry',
      quantity: initialQty,
      reason: 'Estoque inicial',
      created_by: user.id,
    })
  }

  revalidatePath('/admin/produtos')
  return NextResponse.json({ ok: true, product_id: created.id })
}

async function resolveBusinessId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle()
  if (business?.id) return business.id

  const { data: prof } = await supabase
    .from('professionals')
    .select('business_id, is_receptionist')
    .eq('auth_user_id', userId)
    .eq('is_receptionist', true)
    .maybeSingle()
  return prof?.business_id ?? null
}
