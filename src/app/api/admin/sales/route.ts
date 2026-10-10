import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/lib/rate-limit-api'
import { todayBR } from '@/lib/date-br'
import { negocioDoPainel } from '@/lib/admin-data'

async function resolveBusinessId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ businessId: string | null; userIsOwner: boolean }> {
  const { data: business } = await supabase.from('businesses').select('id').eq('id', await negocioDoPainel(userId)).maybeSingle()
  if (business?.id) return { businessId: business.id, userIsOwner: true }
  const { data: prof } = await supabase.from('professionals').select('business_id, is_receptionist').eq('auth_user_id', userId).eq('is_receptionist', true).maybeSingle()
  return { businessId: prof?.business_id ?? null, userIsOwner: false }
}

/**
 * POST /api/admin/sales
 * Cria venda de produto. Body:
 *   { customer_id, professional_id?, sale_date?, discount?, notes?,
 *     items: [{ product_id, quantity, unit_price, discount? }] }
 *
 * Cria:
 *  1. sale (status='pending' · pagamento desacoplado igual Salão99)
 *  2. sale_items (trigger v66 cria stock_movements type=exit · só pra
 *     produtos com track_stock=true · v63 atualiza products.quantity)
 *
 * Snapshot da comissão de venda: pegamos commission_type/value do produto
 * no momento da venda · resistente a alteração futura do cadastro.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-sales-create', limit: 30, windowSeconds: 60 })
  if (rl) return rl
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const { businessId } = await resolveBusinessId(supabase, user.id)
  if (!businessId) return NextResponse.json({ error: 'business_not_found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const customerId = typeof body.customer_id === 'string' && body.customer_id ? body.customer_id : null

  const items = Array.isArray(body.items) ? body.items : []
  if (items.length === 0) return NextResponse.json({ error: 'Adicione pelo menos 1 produto' }, { status: 400 })

  // Cliente: registrado (customer_id) OU avulso (venda de balcão sem cadastro).
  // Avulso usa o nome digitado (ou "Cliente avulso") · client_phone é NOT NULL → vazio.
  let clientName = 'Cliente avulso'
  let clientPhone = ''
  if (customerId) {
    const { data: cliente } = await supabase
      .from('customers')
      .select('id, name, phone, business_id')
      .eq('id', customerId)
      .single()
    if (!cliente || cliente.business_id !== businessId) {
      return NextResponse.json({ error: 'Cliente não pertence ao seu negócio' }, { status: 400 })
    }
    clientName = cliente.name
    clientPhone = cliente.phone ?? ''
  } else if (typeof body.client_name === 'string' && body.client_name.trim()) {
    clientName = body.client_name.trim()
  }

  // Profissional da venda (T8 · Eduardo 28/09): SÓ quem foi escolhido de
  // propósito. Antes, sem escolha, caía em quem estava logado — e a comissão
  // do produto ia pra dona/recepção que só registrou a venda. E o escolhido
  // tem que ser deste negócio (a rota grava com service role).
  let professionalId = typeof body.professional_id === 'string' && body.professional_id ? body.professional_id : null
  if (professionalId) {
    const { data: prof } = await supabase
      .from('professionals')
      .select('id')
      .eq('id', professionalId)
      .eq('business_id', businessId)
      .maybeSingle()
    if (!prof) return NextResponse.json({ error: 'Profissional não pertence ao negócio' }, { status: 400 })
  }

  // Resolve dados dos produtos (nome, comissão, track_stock)
  const productIds = Array.from(new Set(items.map((i: { product_id: string }) => i.product_id)))
  const { data: produtos } = await supabase
    .from('products')
    .select('id, name, variant, commission_type, commission_value, track_stock, quantity, active, sale_active')
    .in('id', productIds)
    .eq('business_id', businessId)
  const prodMap = new Map((produtos ?? []).map((p) => [p.id, p]))

  // Valida itens + calcula total
  type ItemInput = { product_id: string; quantity: number; unit_price: number; discount?: number }
  const cleanItems: Array<ItemInput & { product_name: string; commission_type: string | null; commission_value: number | null }> = []
  let total = 0
  const totalDiscount = typeof body.discount === 'number' && body.discount >= 0 ? body.discount : 0
  for (const it of items as ItemInput[]) {
    const p = prodMap.get(it.product_id)
    if (!p) return NextResponse.json({ error: 'Produto não encontrado ou não pertence ao negócio' }, { status: 400 })
    if (p.active === false) return NextResponse.json({ error: `${p.name} foi excluído` }, { status: 400 })
    const qty = typeof it.quantity === 'number' ? it.quantity : 0
    const price = typeof it.unit_price === 'number' ? it.unit_price : 0
    const disc = typeof it.discount === 'number' && it.discount >= 0 ? it.discount : 0
    if (qty <= 0 || price < 0) return NextResponse.json({ error: 'Item inválido' }, { status: 400 })
    cleanItems.push({
      product_id: it.product_id,
      // Variante no nome (achado 14): "Esmalte · Vermelho", não só "Esmalte".
      product_name: p.variant ? `${p.name} · ${p.variant}` : p.name,
      quantity: qty,
      unit_price: price,
      discount: disc,
      commission_type: p.commission_type,
      commission_value: p.commission_value,
    })
    total += qty * price - disc
  }
  total = Math.max(0, total - totalDiscount)

  // T10 · estoque: o PDV não conferia nada (comanda e /items conferem).
  // Soma por produto — o mesmo produto em duas linhas conta junto.
  const pedido = new Map<string, number>()
  for (const it of cleanItems) pedido.set(it.product_id, (pedido.get(it.product_id) ?? 0) + it.quantity)
  for (const [pid, qtd] of pedido) {
    const p = prodMap.get(pid)
    if (p && p.track_stock !== false && qtd > Number(p.quantity ?? 0)) {
      return NextResponse.json({
        error: 'insufficient_stock',
        detail: `${p.variant ? `${p.name} · ${p.variant}` : p.name}: pediu ${qtd}, só tem ${Number(p.quantity ?? 0)} em estoque`,
        product_id: pid,
      }, { status: 400 })
    }
  }

  // todayBR() (não toISOString) — fuso de Brasília, senão pega o dia errado à noite.
  const saleDate = typeof body.sale_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.sale_date) ? body.sale_date : todayBR()

  // Pagamento na hora (opcional). Sem método válido → venda fica pendente (paga
  // depois, como era). Card detail (taxa/maquininha) não é guardado aqui: a tabela
  // sales não tem colunas de cartão (só payment_method) — só o método é persistido.
  // 'points' saiu (T9 · Eduardo 28/09): pontos só em atendimento. No PDV
  // entrava como receita e não debitava saldo nenhum.
  const ALLOWED_METHODS = ['cash', 'pix', 'card']
  if (body.payment_method === 'points') {
    return NextResponse.json({ error: 'points_not_allowed', detail: 'Pontos só podem ser usados em atendimento.' }, { status: 400 })
  }
  const payMethod = typeof body.payment_method === 'string' && ALLOWED_METHODS.includes(body.payment_method)
    ? body.payment_method : null
  const nowIso = new Date().toISOString()

  // Snapshot do cartão (maquininha/bandeira/taxa/parcelas) — só quando paga em
  // cartão. A taxa flui pro líquido no fluxo de caixa (v87 · plena comunicação).
  const card = payMethod === 'card' && body.card && typeof body.card === 'object' ? body.card : null

  // 1. Cria venda
  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .insert({
      business_id: businessId,
      type: 'product_sale',
      customer_id: customerId,
      client_name: clientName,
      client_phone: clientPhone,
      professional_id: professionalId,
      sale_date: saleDate,
      total,
      discount: totalDiscount,
      status: payMethod ? 'paid' : 'pending',
      paid_at: payMethod ? nowIso : null,
      payment_method: payMethod,
      payment_device_id: card?.device_id ?? null,
      payment_card_brand: card?.card_brand ?? null,
      payment_card_type: card?.card_type ?? null,
      payment_fee_percent: card != null ? Number(card.fee_percent ?? 0) : null,
      payment_installments: card?.installments ?? null,
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (saleErr || !sale) return NextResponse.json({ error: 'Erro ao criar venda: ' + (saleErr?.message ?? '') }, { status: 500 })

  // 2. Insere items (triggers v66 + v63 fazem o resto)
  const itemRows = cleanItems.map((it) => ({
    sale_id: sale.id,
    product_id: it.product_id,
    product_name: it.product_name,
    quantity: it.quantity,
    unit_price: it.unit_price,
    discount: it.discount,
    commission_type: it.commission_type,
    commission_value: it.commission_value,
  }))
  const { error: itemsErr } = await supabase.from('sale_items').insert(itemRows)
  if (itemsErr) {
    await supabase.from('sales').delete().eq('id', sale.id)
    return NextResponse.json({ error: 'Erro nos itens: ' + itemsErr.message }, { status: 500 })
  }

  revalidatePath('/admin/produtos')
  revalidatePath('/admin')

  return NextResponse.json({ ok: true, sale_id: sale.id, total, items_count: cleanItems.length })
}
