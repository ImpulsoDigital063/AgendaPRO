import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resolveBusinessIdOperacao } from '@/lib/api-business-access'

// v98k · mesma regra única das outras rotas de comanda
const getBusinessId = resolveBusinessIdOperacao

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

async function validateAccess(invoiceId: string, businessId: string) {
  const admin = getAdmin()
  const { data: invoice } = await admin
    .from('invoices')
    .select('id, business_id, status')
    .eq('id', invoiceId)
    .maybeSingle()
  const inv = invoice as { id: string; business_id: string; status: string } | null
  if (!inv) return { admin, error: NextResponse.json({ error: 'invoice_not_found' }, { status: 404 }) }
  if (inv.business_id !== businessId) return { admin, error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  // Auditoria 28/09 (T7): item de comanda FECHADA não muda por aqui. Remover
  // produto de comanda paga devolvia estoque e sumia do Hub, mas o pagamento
  // ficava — caixa e relatório discordando. Reabrir primeiro (botão existe).
  if (inv.status !== 'open') {
    return { admin, error: NextResponse.json({ error: 'invoice_not_open', detail: 'Reabra a comanda para alterar os itens.' }, { status: 409 }) }
  }
  return { admin, invoice: inv }
}

// Recalcula subtotal/discount/total da invoice considerando manual_discount
// invoice.discount = soma dos descontos por item + desconto manual geral
// invoice.total = sum(items.total) − manual_discount (nunca negativo)
async function recalculateInvoice(invoiceId: string) {
  const admin = getAdmin()
  const [{ data: itemsData }, { data: inv }] = await Promise.all([
    admin.from('invoice_items').select('total, discount').eq('invoice_id', invoiceId),
    admin.from('invoices').select('manual_discount').eq('id', invoiceId).maybeSingle(),
  ])
  const rows = (itemsData ?? []) as Array<{ total: number | string; discount: number | string }>
  const itemsDiscount = rows.reduce((s, it) => s + Number(it.discount ?? 0), 0)
  const itemsTotal = rows.reduce((s, it) => s + Number(it.total ?? 0), 0)
  let manualDiscount = Number(inv?.manual_discount ?? 0)
  // Defesa: se manual > items total, clampa pra não gerar total negativo
  if (manualDiscount > itemsTotal) manualDiscount = itemsTotal
  const subtotal = itemsTotal + itemsDiscount
  const total = Math.max(0, itemsTotal - manualDiscount)
  await admin
    .from('invoices')
    .update({
      subtotal,
      discount: itemsDiscount + manualDiscount,
      manual_discount: manualDiscount,
      total,
    })
    .eq('id', invoiceId)
}

// PATCH /api/admin/invoices/[id]/items/[itemId]
// Body: { quantity?, unit_price?, discount? }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const supabase = await createClient()
  // user é necessário pra creditar o movimento de estoque a quem ajustou
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id, itemId } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  const { admin, error } = await validateAccess(id, businessId)
  if (error) return error

  // Lê item atual
  const { data: item, error: itemErr } = await admin
    .from('invoice_items')
    .select('id, invoice_id, quantity, unit_price, discount, total, item_type, reference_id')
    .eq('id', itemId)
    .maybeSingle()
  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })
  if (!item || item.invoice_id !== id) return NextResponse.json({ error: 'item_not_found' }, { status: 404 })

  // min 0.001 (não 1): material consumido pode ser fração de embalagem —
  // meio pacote de cabelo, 30ml de um vidro. Antes Math.max(1, …) forçava
  // inteiro e era impossível corrigir pra 0,5 (Eduardo 22/07).
  const quantity = typeof body.quantity === 'number' ? Math.max(0.001, body.quantity) : Number(item.quantity)
  const unit_price = typeof body.unit_price === 'number' ? Math.max(0, body.unit_price) : Number(item.unit_price)
  const discount = typeof body.discount === 'number' ? Math.max(0, body.discount) : Number(item.discount)
  const total = Math.max(0, unit_price * quantity - discount)

  const { error: updErr } = await admin
    .from('invoice_items')
    .update({ quantity, unit_price, discount, total })
    .eq('id', itemId)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  // ── ESTOQUE · sincroniza a venda quando a quantidade do PRODUTO muda ──────
  // Antes o PATCH só mexia no valor: baixava 1 pacote, você corrigia pra 0,5,
  // o preço caía mas o estoque continuava −1. Meio pacote sumia do sistema.
  // Bug já existia com inteiros (2 → 1 não devolvia nada) · só era raro.
  //
  // Auditoria 28/09 (T6): a venda também acompanha PREÇO e DESCONTO editados,
  // não só a quantidade. Antes a comanda cobrava R$40 e Hub/Início/comissão
  // seguiam em R$50. E produto sem controle de estoque (track_stock=false) não
  // gera movimento aqui (não teve saída na venda · T12).
  const qtdAntiga = Number(item.quantity ?? 0)
  if (item.item_type === 'product' && item.reference_id) {
    const { data: saleItems, error: siErr } = await admin
      .from('sale_items')
      .select('id, product_id, quantity, unit_price, products(track_stock)')
      .eq('sale_id', item.reference_id)
    if (siErr) return NextResponse.json({ error: `sale_items_read_failed: ${siErr.message}` }, { status: 500 })

    // A venda de um item de comanda tem 1 sale_item (criado por items/route.ts).
    // Com mais de um, não dá pra saber a quem atribuir o delta — não adivinha.
    if ((saleItems?.length ?? 0) === 1) {
      const si = saleItems![0]
      const prod = Array.isArray(si.products) ? si.products[0] : si.products
      const controlaEstoque = (prod as { track_stock?: boolean } | null)?.track_stock !== false
      const delta = quantity - qtdAntiga // >0 consumiu mais · <0 devolveu

      if (si.product_id && delta !== 0 && controlaEstoque) {
        const { error: movErr } = await admin.from('stock_movements').insert({
          business_id: businessId,
          product_id: si.product_id as string,
          type: delta > 0 ? 'exit' : 'entry',
          // exit é gravado negativo (mesma convenção da v66/v68)
          quantity: delta > 0 ? -delta : Math.abs(delta),
          reason: 'Ajuste de quantidade na comanda',
          created_by: user.id,
        })
        if (movErr) return NextResponse.json({ error: `stock_adjust_failed: ${movErr.message}` }, { status: 500 })
      }

      // sale_item e sale acompanham, senão o relatório de vendas diverge da
      // comanda. sales.total = o que a linha cobra (o desconto geral entra
      // quando a comanda fecha · acertarValorDosProdutosDaComanda).
      await admin.from('sale_items').update({ quantity, unit_price, discount }).eq('id', si.id)
      await admin.from('sales').update({ total }).eq('id', item.reference_id)
    }
  }

  await recalculateInvoice(id)
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/invoices/[id]/items/[itemId]
//
// Remove 1 item específico fazendo cascata só do que pertence a ele:
//  - item_type=appointment → solta paid_at + invoice_item_id + payment_method
//  - item_type=product → cancela sale + devolve estoque (entry +qty)
//
// Recalcula subtotal/total da invoice. Se ficou com 0 items, marca a
// invoice como cancelled e apaga invoice_payments.
//
// NÃO mexe em invoice_payments quando ainda há outros items · se o cliente
// pagou a mais agora, fica "saldo a devolver" pra operador resolver no caixa.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id, itemId } = await params
  const { admin, error, invoice } = await validateAccess(id, businessId)
  if (error) return error
  if (invoice?.status === 'cancelled') {
    return NextResponse.json({ error: 'invoice_already_cancelled' }, { status: 400 })
  }

  const { data: item } = await admin
    .from('invoice_items')
    .select('id, invoice_id, reference_id, item_type')
    .eq('id', itemId)
    .maybeSingle()
  if (!item || item.invoice_id !== id) return NextResponse.json({ error: 'item_not_found' }, { status: 404 })

  // Cascata por tipo
  if (item.item_type === 'appointment' && item.reference_id) {
    // status volta pra 'confirmed' · simétrico ao "Faturar atendimento" que
    // promove confirmed→completed na criação da invoice
    const { error: aErr } = await admin
      .from('appointments')
      .update({ invoice_item_id: null, paid_at: null, payment_method: null, status: 'confirmed' })
      .eq('id', item.reference_id)
    if (aErr) return NextResponse.json({ error: `appointment_revert_failed: ${aErr.message}` }, { status: 500 })
  }

  if (item.item_type === 'product' && item.reference_id) {
    // Auditoria 28/09: cancela a venda PRIMEIRO, só se ainda não estava, e
    // devolve estoque só nesse caso (clique duplo não devolve 2x). Produto
    // sem controle de estoque não teve saída → não ganha entrada (T12).
    const { data: cancelou, error: saleErr } = await admin
      .from('sales')
      .update({ status: 'cancelled', paid_at: null })
      .eq('id', item.reference_id)
      .neq('status', 'cancelled')
      .select('id')
    if (saleErr) return NextResponse.json({ error: `sale_cancel_failed: ${saleErr.message}` }, { status: 500 })

    if ((cancelou ?? []).length > 0) {
      const { data: saleItems, error: siErr } = await admin
        .from('sale_items')
        .select('product_id, quantity, products(track_stock)')
        .eq('sale_id', item.reference_id)
      if (siErr) return NextResponse.json({ error: `sale_items_read_failed: ${siErr.message}` }, { status: 500 })

      const compensations = (saleItems ?? [])
        .filter((s) => {
          const prod = Array.isArray(s.products) ? s.products[0] : s.products
          return s.product_id && (prod as { track_stock?: boolean } | null)?.track_stock !== false
        })
        .map((s) => ({
          business_id: businessId,
          product_id: s.product_id as string,
          type: 'entry' as const,
          quantity: Number(s.quantity ?? 0),
          reason: 'Item removido da comanda',
          created_by: user.id,
        }))
      if (compensations.length > 0) {
        const { error: movErr } = await admin.from('stock_movements').insert(compensations)
        if (movErr) return NextResponse.json({ error: `stock_revert_failed: ${movErr.message}` }, { status: 500 })
      }
    }
  }

  // Deleta o invoice_item
  const { error: delErr } = await admin.from('invoice_items').delete().eq('id', itemId)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  // Se foi o último item · cancela a invoice e apaga pagamentos
  const { data: remaining } = await admin
    .from('invoice_items')
    .select('id')
    .eq('invoice_id', id)

  if ((remaining ?? []).length === 0) {
    await admin
      .from('invoices')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), subtotal: 0, total: 0, discount: 0 })
      .eq('id', id)
    await admin.from('invoice_payments').delete().eq('invoice_id', id)
    return NextResponse.json({ ok: true, invoice_status: 'cancelled', items_remaining: 0 })
  }

  await recalculateInvoice(id)
  return NextResponse.json({ ok: true, items_remaining: (remaining ?? []).length })
}
