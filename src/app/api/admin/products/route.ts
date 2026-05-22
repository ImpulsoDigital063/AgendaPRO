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
    .select('id, name, description, unit, price, cost, quantity, min_quantity, active, created_at, updated_at')
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

  // Insere com quantity=0 e usa movement pra setar (trigger v63 incrementa).
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
