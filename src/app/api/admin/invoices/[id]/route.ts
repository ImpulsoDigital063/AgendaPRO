import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resolveBusinessIdOperacao } from '@/lib/api-business-access'

// v98k · dono, recepção OU profissional (esta só quando o negócio ligou a flag
// de equipe). Regra única em resolveBusinessIdOperacao — antes cada rota tinha
// a própria cópia, e cada poder novo dado à profissional estourava numa delas.
const getBusinessId = resolveBusinessIdOperacao

// GET /api/admin/invoices/[id] · retorna invoice + items + payments
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: invoice, error: invErr } = await admin
    .from('invoices')
    .select(`
      id,
      invoice_number,
      status,
      subtotal,
      discount,
      total,
      notes,
      created_at,
      closed_at,
      cancelled_at,
      business_id,
      customer:customers(id, name, phone)
    `)
    .eq('id', id)
    .maybeSingle()

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })
  if (!invoice) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (invoice.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data: items } = await admin
    .from('invoice_items')
    .select(`
      id,
      item_type,
      description,
      quantity,
      unit_price,
      discount,
      total,
      professional:professionals(name)
    `)
    .eq('invoice_id', id)
    .order('created_at')

  const { data: payments } = await admin
    .from('invoice_payments')
    .select(`id, payment_method, amount, paid_at, installments, card_brand, card_type`)
    .eq('invoice_id', id)
    .order('paid_at')

  return NextResponse.json({
    invoice,
    items: items ?? [],
    payments: payments ?? [],
  })
}

// PATCH /api/admin/invoices/[id] · body { action: 'reopen' | 'cancel' }
//
// CANCEL faz cascata completa:
//  1. invoice → status=cancelled
//  2. cada invoice_item type=appointment → reverter appointment (paid_at=null, soltar invoice_item_id)
//  3. cada invoice_item type=product → reverter sale (status=cancelled, paid_at=null)
//     + criar stock_movement compensatório (entry +qty) pra cada sale_item
//  4. apagar invoice_payments
//
// REOPEN só permitido se status='closed' (não de cancelled · cancelled já reverteu cascata).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => null)
  const action = body?.action

  if (action !== 'reopen' && action !== 'cancel') {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: invoice } = await admin
    .from('invoices')
    .select('id, business_id, status')
    .eq('id', id)
    .maybeSingle()

  if (!invoice) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (invoice.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // Bloqueia reopen de cancelled (já reverteu cascata · não dá pra desfazer trivialmente)
  if (action === 'reopen' && invoice.status === 'cancelled') {
    return NextResponse.json({ error: 'cannot_reopen_cancelled', detail: 'Comanda cancelada já reverteu estoque e pagamentos · crie uma nova.' }, { status: 400 })
  }

  if (action === 'reopen') {
    const { error: updErr } = await admin
      .from('invoices')
      .update({ status: 'open', closed_at: null, cancelled_at: null })
      .eq('id', id)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
    return NextResponse.json({ ok: true, status: 'open' })
  }

  // ─── action === 'cancel' · cascata completa ─────────────────────────
  const nowIso = new Date().toISOString()

  // 1. Buscar items pra saber o que reverter
  const { data: items, error: itemsErr } = await admin
    .from('invoice_items')
    .select('id, item_type, reference_id')
    .eq('invoice_id', id)
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  const apptIds = (items ?? []).filter((i) => i.item_type === 'appointment').map((i) => i.reference_id as string).filter(Boolean)
  const saleIds = (items ?? []).filter((i) => i.item_type === 'product').map((i) => i.reference_id as string).filter(Boolean)

  // 2. Cancelar comanda INTEIRA = cancelar também o atendimento.
  //    Regra cravada por Eduardo (24/05/2026): se foi "cancelar tudo", o
  //    atendimento na agenda também deve mostrar como cancelado.
  //    (Pra reverter SÓ a cobrança e manter o atendimento, usa-se a lixeira
  //    de item individual na UI · DELETE /items/[itemId] · não esse endpoint.)
  if (apptIds.length > 0) {
    const { error } = await admin
      .from('appointments')
      .update({ paid_at: null, invoice_item_id: null, payment_method: null, status: 'cancelled' })
      .in('id', apptIds)
    if (error) return NextResponse.json({ error: `appointments_revert_failed: ${error.message}` }, { status: 500 })
  }

  // 3. Reverter sales · gerar movement compensatório de estoque
  if (saleIds.length > 0) {
    // Busca sale_items pra saber qty/produto a devolver
    const { data: saleItems, error: siErr } = await admin
      .from('sale_items')
      .select('sale_id, product_id, quantity')
      .in('sale_id', saleIds)
    if (siErr) return NextResponse.json({ error: `sale_items_read_failed: ${siErr.message}` }, { status: 500 })

    // Cria stock_movements de entrada compensando o exit original
    const compensations = (saleItems ?? [])
      .filter((it) => it.product_id)
      .map((it) => ({
        business_id: businessId,
        product_id: it.product_id as string,
        type: 'entry' as const,
        quantity: Number(it.quantity ?? 0), // positivo · trigger v63 soma em products.quantity
        reason: 'Cancelamento de comanda',
        created_by: user.id,
      }))
    if (compensations.length > 0) {
      const { error: movErr } = await admin.from('stock_movements').insert(compensations)
      if (movErr) return NextResponse.json({ error: `stock_revert_failed: ${movErr.message}` }, { status: 500 })
    }

    // Marca sales como cancelled (não delete · histórico). Limpa payment_method
    // junto (igual o appointment) pra não sobrar método num registro cancelado.
    const { error: salesErr } = await admin
      .from('sales')
      .update({ status: 'cancelled', paid_at: null, payment_method: null })
      .in('id', saleIds)
    if (salesErr) return NextResponse.json({ error: `sales_cancel_failed: ${salesErr.message}` }, { status: 500 })
  }

  // 4. Apagar invoice_payments (pagamento revertido)
  const { error: payDelErr } = await admin
    .from('invoice_payments')
    .delete()
    .eq('invoice_id', id)
  if (payDelErr) return NextResponse.json({ error: `payments_delete_failed: ${payDelErr.message}` }, { status: 500 })

  // 5. Por último · marca invoice como cancelled
  const { error: invErr } = await admin
    .from('invoices')
    .update({ status: 'cancelled', cancelled_at: nowIso })
    .eq('id', id)
  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

  // Read-after-write · confirma reversão
  const { data: verify } = await admin
    .from('invoices')
    .select('status')
    .eq('id', id)
    .maybeSingle()
  if (verify?.status !== 'cancelled') {
    return NextResponse.json({ error: 'persistence_check_failed' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    status: 'cancelled',
    reverted: {
      appointments: apptIds.length,
      sales: saleIds.length,
    },
  })
}
