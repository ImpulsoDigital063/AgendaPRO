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
  // Negativo era descartado em silêncio e a tela dizia "Salvo!" (auditoria 28/09).
  const negativo = (['price', 'cost', 'min_quantity', 'commission_value'] as const)
    .find((k) => typeof body[k] === 'number' && body[k] < 0)
  if (negativo) {
    const nomes = { price: 'Preço', cost: 'Custo', min_quantity: 'Mínimo', commission_value: 'Comissão' } as const
    return NextResponse.json({ error: `${nomes[negativo]} não pode ser negativo.` }, { status: 400 })
  }
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
  // Variante de grupo não fica sem rótulo (aparecia como "—" no card).
  if ('variant' in body && !update.variant) {
    const { data: atual } = await supabase.from('products').select('variant_group_id').eq('id', id).maybeSingle()
    if (atual?.variant_group_id) return NextResponse.json({ error: 'Variante precisa de um rótulo (ex: Preto, P, 500ml).' }, { status: 400 })
  }
  if ('expires_at' in body) update.expires_at = (typeof body.expires_at === 'string' && body.expires_at ? body.expires_at : null)
  if ('pack_quantity' in body) update.pack_quantity = (typeof body.pack_quantity === 'number' && body.pack_quantity > 0 ? body.pack_quantity : null)
  if ('barcode' in body) update.barcode = (typeof body.barcode === 'string' ? body.barcode.trim() || null : null)
  if ('sku' in body) update.sku = (typeof body.sku === 'string' ? body.sku.trim() || null : null)
  if (typeof body.track_stock === 'boolean') update.track_stock = body.track_stock
  if (typeof body.sale_active === 'boolean') update.sale_active = body.sale_active
  if ('commission_type' in body) {
    // 'none' = "Sem comissão" explícito (antes virava null e sumia da tela)
    update.commission_type = (typeof body.commission_type === 'string' && ['percent', 'fixed', 'none'].includes(body.commission_type) ? body.commission_type : null)
    if (update.commission_type === 'none') update.commission_value = null
  }
  if ('commission_value' in body) {
    update.commission_value = (typeof body.commission_value === 'number' && body.commission_value >= 0 ? body.commission_value : null)
  }
  if ('image_url' in body) {
    update.image_url = (typeof body.image_url === 'string' && body.image_url.trim() ? body.image_url.trim() : null)
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nada pra atualizar' }, { status: 400 })
  }
  update.updated_at = new Date().toISOString()

  // T16 (auditoria 28/09): confere que ALGUMA linha mudou. Sem permissão de
  // escrita (RLS · recepção), o update atinge 0 linhas sem erro e a tela
  // mostrava "Salvo!" sem ter salvo nada.
  const { data: alterados, error } = await supabase
    .from('products')
    .update(update)
    .eq('id', id)
    .select('id, variant_group_id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!alterados || alterados.length === 0) {
    return NextResponse.json({ error: 'Sem permissão para alterar este produto.' }, { status: 403 })
  }

  /* VARIANTES (auditoria 28/09): o que é do PRODUTO vale pro grupo inteiro.
     Editar nome/foto/categoria de uma cor deixava o card do grupo mostrando
     os dados de outra variante e o filtro de categoria rachava o grupo.
     Preço, rótulo, SKU, código de barras, custo, mínimo e estoque seguem
     por variante. */
  const grupo = (alterados[0] as { variant_group_id?: string | null }).variant_group_id
  if (grupo) {
    const DO_GRUPO = ['name', 'description', 'image_url', 'brand_id', 'category_id', 'unit', 'track_stock', 'sale_active', 'commission_type', 'commission_value'] as const
    const comum: Record<string, unknown> = {}
    for (const k of DO_GRUPO) if (k in update) comum[k] = update[k]
    if (Object.keys(comum).length > 0) {
      comum.updated_at = update.updated_at
      const { error: gErr } = await supabase
        .from('products')
        .update(comum)
        .eq('variant_group_id', grupo)
        .neq('id', id)
        .eq('active', true)
      if (gErr) return NextResponse.json({ error: `Salvou esta variante, mas não as outras do grupo: ${gErr.message}` }, { status: 500 })
    }
  }
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

  const { data: alterados, error } = await supabase
    .from('products')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!alterados || alterados.length === 0) {
    return NextResponse.json({ error: 'Sem permissão para excluir este produto.' }, { status: 403 })
  }
  revalidatePath('/admin/produtos')
  return NextResponse.json({ ok: true })
}
