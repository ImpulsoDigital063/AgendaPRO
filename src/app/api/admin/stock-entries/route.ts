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
 * POST /api/admin/stock-entries
 * Body: { supplier_id?, invoice_number?, invoice_key?, entry_date?, notes?,
 *         items: [{ product_id, quantity, unit_cost }] }
 *
 * Cria:
 *  1. Despesa em `expenses` (categoria 'products') com soma do total
 *  2. Entrada em `stock_entries` vinculada à despesa
 *  3. Itens em `stock_entry_items` (trigger v66 cria stock_movements
 *     type=entry · trigger v63 atualiza products.quantity)
 *
 * Read-after-write: devolve estado final pra confirmar.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-stock-entries-create', limit: 30, windowSeconds: 60 })
  if (rl) return rl
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const businessId = await resolveBusinessId(supabase, user.id)
  if (!businessId) return NextResponse.json({ error: 'business_not_found · só dono cadastra entrada' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const items = Array.isArray(body.items) ? body.items : []
  if (items.length === 0) {
    return NextResponse.json({ error: 'Adicione pelo menos 1 produto' }, { status: 400 })
  }

  // Valida + calcula total
  type ItemInput = { product_id: string; quantity: number; unit_cost: number }
  const cleanItems: ItemInput[] = []
  let totalCost = 0
  for (const it of items) {
    const productId = typeof it.product_id === 'string' ? it.product_id : ''
    const qty = typeof it.quantity === 'number' ? it.quantity : 0
    const cost = typeof it.unit_cost === 'number' ? it.unit_cost : 0
    if (!productId || qty <= 0 || cost < 0) {
      return NextResponse.json({ error: 'Item inválido (produto, qtd > 0, custo >= 0)' }, { status: 400 })
    }
    cleanItems.push({ product_id: productId, quantity: qty, unit_cost: cost })
    totalCost += qty * cost
  }

  const supplierId = typeof body.supplier_id === 'string' && body.supplier_id ? body.supplier_id : null
  const invoiceNumber = typeof body.invoice_number === 'string' ? body.invoice_number.trim() || null : null
  const invoiceKey = typeof body.invoice_key === 'string' ? body.invoice_key.trim() || null : null
  const entryDate = typeof body.entry_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.entry_date) ? body.entry_date : new Date().toISOString().slice(0, 10)
  const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null

  // Nome amigável da despesa (fornecedor + NF se houver, senão data)
  let supplierName = ''
  if (supplierId) {
    const { data: sup } = await supabase.from('product_suppliers').select('name').eq('id', supplierId).single()
    supplierName = sup?.name ?? ''
  }
  const expenseName = `Compra de produtos${supplierName ? ` · ${supplierName}` : ''}${invoiceNumber ? ` · NF ${invoiceNumber}` : ''}`

  // 1. Cria despesa primeiro
  const { data: expense, error: expErr } = await supabase
    .from('expenses')
    .insert({
      business_id: businessId,
      name: expenseName,
      amount: totalCost,
      category: 'products',
      occurred_at: entryDate,
      notes,
    })
    .select('id')
    .single()
  if (expErr || !expense) {
    return NextResponse.json({ error: 'Erro ao criar despesa: ' + (expErr?.message ?? 'desconhecido') }, { status: 500 })
  }

  // 2. Cria entrada vinculada
  const { data: entry, error: entErr } = await supabase
    .from('stock_entries')
    .insert({
      business_id: businessId,
      supplier_id: supplierId,
      invoice_number: invoiceNumber,
      invoice_key: invoiceKey,
      entry_date: entryDate,
      total_cost: totalCost,
      notes,
      expense_id: expense.id,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (entErr || !entry) {
    // Rollback da despesa
    await supabase.from('expenses').delete().eq('id', expense.id)
    return NextResponse.json({ error: 'Erro ao criar entrada: ' + (entErr?.message ?? 'desconhecido') }, { status: 500 })
  }

  // 3. Insere items (trigger v66 cria movements + v63 atualiza quantity)
  const itemRows = cleanItems.map((it) => ({
    entry_id: entry.id,
    product_id: it.product_id,
    quantity: it.quantity,
    unit_cost: it.unit_cost,
  }))
  const { error: itemsErr } = await supabase.from('stock_entry_items').insert(itemRows)
  if (itemsErr) {
    // Rollback total
    await supabase.from('stock_entries').delete().eq('id', entry.id)
    await supabase.from('expenses').delete().eq('id', expense.id)
    return NextResponse.json({ error: 'Erro nos itens: ' + itemsErr.message }, { status: 500 })
  }

  revalidatePath('/admin/produtos')
  revalidatePath('/admin/financeiro')
  revalidatePath('/admin')

  return NextResponse.json({
    ok: true,
    entry_id: entry.id,
    expense_id: expense.id,
    total_cost: totalCost,
    items_count: cleanItems.length,
  })
}
