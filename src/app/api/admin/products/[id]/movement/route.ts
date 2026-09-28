import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/lib/rate-limit-api'

/**
 * POST /api/admin/products/[id]/movement
 * Body: { type: 'entry' | 'exit' | 'adjust', quantity: number, reason?: string }
 *
 * - entry: quantity vira positivo (recebe quantity, vira +quantity)
 * - exit: quantity vira negativo (recebe quantity, vira -quantity)
 * - adjust: aceita qualquer sinal (diferença pra zerar/corrigir)
 *
 * O trigger v63 (apply_stock_movement) atualiza products.quantity sozinho.
 * Read-after-write: relê produto e devolve quantidade nova pra UI confirmar.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(req, { key: 'admin-products-movement', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const { id: productId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const type = typeof body.type === 'string' ? body.type : ''
  // 'count' (T11 · auditoria 28/09): a tela manda a quantidade CONTADA e a
  // diferença é calculada aqui, com o estoque do banco na hora de gravar.
  // Antes a tela mandava (contado − estoque da tela) e, se alguém vendeu
  // depois que a lista abriu, o estoque final saía errado. Grava como 'adjust'.
  if (!['entry', 'exit', 'adjust', 'count'].includes(type)) {
    return NextResponse.json({ error: 'type inválido (entry/exit/adjust/count)' }, { status: 400 })
  }
  const rawQty = typeof body.quantity === 'number' ? body.quantity : null
  if (rawQty == null || !isFinite(rawQty)) {
    return NextResponse.json({ error: 'quantity inválida' }, { status: 400 })
  }

  // Resolve business_id pelo produto (autorização via RLS já garante owner/recep)
  const { data: product } = await supabase
    .from('products')
    .select('id, business_id, quantity')
    .eq('id', productId)
    .single()
  if (!product) return NextResponse.json({ error: 'produto não encontrado' }, { status: 404 })

  // Calcula delta com sinal correto
  let delta = Math.abs(rawQty)
  if (type === 'exit') delta = -delta
  else if (type === 'adjust') delta = rawQty // pode ser negativo
  else if (type === 'count') {
    if (rawQty < 0) return NextResponse.json({ error: 'Quantidade contada não pode ser negativa.' }, { status: 400 })
    delta = Math.round((rawQty - Number(product.quantity ?? 0)) * 1000) / 1000
    if (delta === 0) return NextResponse.json({ error: 'O estoque já está com essa quantidade.' }, { status: 400 })
  }

  // Validação: não permitir saída que zera além do estoque
  if (type === 'exit' && product.quantity + delta < 0) {
    return NextResponse.json({
      error: `Saída maior que estoque atual (${product.quantity}).`,
    }, { status: 400 })
  }

  const { error: insErr } = await supabase
    .from('stock_movements')
    .insert({
      business_id: product.business_id,
      product_id: productId,
      type: type === 'count' ? 'adjust' : type,
      quantity: delta,
      reason: typeof body.reason === 'string' && body.reason.trim()
        ? body.reason.trim()
        : type === 'count' ? 'Contagem' : null,
      created_by: user.id,
    })

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  // Read-after-write · prova que o trigger atualizou (λ.prova-na-fonte)
  const { data: after } = await supabase
    .from('products')
    .select('quantity')
    .eq('id', productId)
    .single()

  // λ.prova-na-fonte: o movimento entrou mas o estoque não mudou = o UPDATE
  // do trigger foi barrado (RLS da recepção · T17). Não responder "ok".
  const esperado = Math.round((Number(product.quantity ?? 0) + delta) * 1000) / 1000
  if (after && Math.abs(Number(after.quantity) - esperado) > 0.001 && Number(after.quantity) === Number(product.quantity)) {
    console.error('[movement] estoque nao atualizou', productId, product.quantity, delta, after.quantity)
    return NextResponse.json({ error: 'A movimentação foi registrada, mas o estoque não foi atualizado. Avise o suporte.' }, { status: 500 })
  }

  revalidatePath('/admin/produtos')
  return NextResponse.json({ ok: true, new_quantity: after?.quantity ?? null })
}
