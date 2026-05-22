import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/lib/rate-limit-api'

async function resolveBusinessId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data: business } = await supabase.from('businesses').select('id').eq('owner_id', userId).maybeSingle()
  return business?.id ?? null
}

/**
 * GET /api/admin/services/[id]/products
 * Lista produtos vinculados ao serviço · com nome/unidade/qtd consumida.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(req, { key: 'admin-svc-products-list', limit: 60, windowSeconds: 60 })
  if (rl) return rl
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { id: serviceId } = await params
  const { data, error } = await supabase
    .from('service_product_consumption')
    .select(`
      id, quantity, product_id,
      product:products(id, name, variant, unit, quantity)
    `)
    .eq('service_id', serviceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

/**
 * POST /api/admin/services/[id]/products
 * Body: { product_id, quantity }
 * Idempotente: se já existir, atualiza quantity.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(req, { key: 'admin-svc-products-add', limit: 30, windowSeconds: 60 })
  if (rl) return rl
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const businessId = await resolveBusinessId(supabase, user.id)
  if (!businessId) return NextResponse.json({ error: 'business_not_found' }, { status: 404 })

  const { id: serviceId } = await params
  const body = await req.json().catch(() => ({}))
  const productId = typeof body.product_id === 'string' && body.product_id ? body.product_id : null
  const qty = typeof body.quantity === 'number' && body.quantity > 0 ? body.quantity : null
  if (!productId || !qty) return NextResponse.json({ error: 'product_id e quantity > 0 obrigatórios' }, { status: 400 })

  // Validar que serviço e produto pertencem ao business
  const { data: svc } = await supabase.from('services').select('business_id').eq('id', serviceId).single()
  const { data: prod } = await supabase.from('products').select('business_id').eq('id', productId).single()
  if (!svc || !prod || svc.business_id !== businessId || prod.business_id !== businessId) {
    return NextResponse.json({ error: 'recurso não pertence ao negócio' }, { status: 403 })
  }

  // Upsert (unique service_id + product_id)
  const { error: upErr } = await supabase
    .from('service_product_consumption')
    .upsert({
      business_id: businessId,
      service_id: serviceId,
      product_id: productId,
      quantity: qty,
    }, { onConflict: 'service_id,product_id' })

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  revalidatePath('/admin/configuracoes')
  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/admin/services/[id]/products?product_id=X
 * Remove vínculo de um produto específico do serviço.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(req, { key: 'admin-svc-products-del', limit: 30, windowSeconds: 60 })
  if (rl) return rl
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { id: serviceId } = await params
  const url = new URL(req.url)
  const productId = url.searchParams.get('product_id')
  if (!productId) return NextResponse.json({ error: 'product_id obrigatório' }, { status: 400 })

  const { error } = await supabase
    .from('service_product_consumption')
    .delete()
    .eq('service_id', serviceId)
    .eq('product_id', productId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath('/admin/configuracoes')
  return NextResponse.json({ ok: true })
}
