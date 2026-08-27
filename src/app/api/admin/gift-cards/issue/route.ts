import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resolveBusinessIdOperacao as getBusinessId } from '@/lib/api-business-access'

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

// Código legível impresso no cartão-presente · sem caracteres ambíguos (0/O/1/I).
function genCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const b = randomBytes(6)
  let s = ''
  for (let i = 0; i < 6; i++) s += alphabet[b[i] % alphabet.length]
  return s
}

/**
 * POST /api/admin/gift-cards/issue · emite um vale-presente.
 * Body:
 *   mode: 'services' | 'value'
 *   buyer_name?, buyer_phone?         · comprador (avulso)
 *   recipient_customer_id?: string    · presenteada (se já é cliente)
 *   recipient_name: string            · snapshot da presenteada
 *   price_paid?: number               · preço pago pelo vale (default: value_total no modo value)
 *   services?: [{ service_id, quantity, unit_price? }]  · modo 'services'
 *   value_total?: number              · modo 'value'
 *   validity_kind?: 'none'|'days'|'weeks'|'months'|'years'  (default 'none')
 *   validity_value?: number
 *   invoice_id?: string               · adiciona à comanda; senão cria uma nova
 *   notes?: string
 *
 * Efeitos (espelha packages/sell):
 *  - Cria gift_card (+ gift_card_services no modo services)
 *  - Cria/reusa invoice · invoice_item type='gift_card' (unit_price = price_paid)
 *  - Linka gift_card.invoice_item_id · recalcula totais
 *  - Receita entra no caixa quando a comanda for PAGA (data do pagamento = compra)
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'no_business' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  // Cartão-presente é SÓ modo 'services' (decisão do dono · o modo 'value' vendia
  // mas não tinha como ser gasto → bug de dinheiro, removido do produto).
  const mode = 'services' as const
  const recipientName = typeof body.recipient_name === 'string' ? body.recipient_name.trim() : ''
  const recipientPhone = typeof body.recipient_phone === 'string' ? body.recipient_phone.trim() || null : null
  const recipientCustomerId = typeof body.recipient_customer_id === 'string' ? body.recipient_customer_id : null
  const buyerName = typeof body.buyer_name === 'string' ? body.buyer_name.trim() || null : null
  const buyerPhone = typeof body.buyer_phone === 'string' ? body.buyer_phone.trim() || null : null
  const giftMessage = typeof body.gift_message === 'string' ? body.gift_message.trim() || null : null
  const sendOn = typeof body.send_on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.send_on) ? body.send_on : null
  const invoiceIdIn = typeof body.invoice_id === 'string' ? body.invoice_id : null
  const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null
  const validityKind = ['none', 'days', 'weeks', 'months', 'years'].includes(body.validity_kind) ? body.validity_kind : 'none'
  const validityValue = validityKind !== 'none' && Number(body.validity_value) > 0 ? Math.floor(Number(body.validity_value)) : null

  if (body.mode !== 'services') return NextResponse.json({ error: 'mode_must_be_services' }, { status: 400 })
  if (!recipientName) return NextResponse.json({ error: 'recipient_name_required' }, { status: 400 })

  const admin = getAdmin()

  // Rastreia quem vendeu (sold_by). Owner sem professional → 'admin', id null.
  const { data: soldByProf } = await admin.from('professionals').select('id, is_receptionist').eq('auth_user_id', user.id).eq('business_id', businessId).maybeSingle()
  const soldByProfessionalId = soldByProf?.id ?? null
  const soldByRole = soldByProf?.is_receptionist ? 'reception' : 'admin'

  // Valida presenteada (se veio como cliente existente)
  if (recipientCustomerId) {
    const { data: cust } = await admin.from('customers').select('id, business_id').eq('id', recipientCustomerId).maybeSingle()
    if (!cust || cust.business_id !== businessId) return NextResponse.json({ error: 'recipient_not_found' }, { status: 404 })
  }

  // Monta conteúdo por modo
  let valueTotal: number | null = null
  let pricePaid: number
  let serviceRows: { service_id: string; service_name: string; sessions_total: number; unit_price_snapshot: number }[] = []

  {
    const services = Array.isArray(body.services) ? body.services : []
    if (services.length === 0) return NextResponse.json({ error: 'services_required' }, { status: 400 })
    const ids = services.map((s: { service_id?: string }) => s.service_id).filter(Boolean) as string[]
    const { data: svcRows } = await admin
      .from('services')
      .select('id, name, price, business_id')
      .in('id', ids)
    const svcById = Object.fromEntries((svcRows ?? []).filter((s) => s.business_id === businessId).map((s) => [s.id, s]))
    for (const s of services) {
      const svc = svcById[s.service_id]
      if (!svc) return NextResponse.json({ error: `service_not_found:${s.service_id}` }, { status: 404 })
      const qty = Math.floor(Number(s.quantity ?? 1))
      if (!(qty > 0)) return NextResponse.json({ error: 'invalid_quantity' }, { status: 400 })
      const unit = Number(s.unit_price) >= 0 ? Number(s.unit_price) : Number(svc.price ?? 0)
      serviceRows.push({ service_id: svc.id, service_name: svc.name, sessions_total: qty, unit_price_snapshot: unit })
    }
    // preço do vale = soma dos serviços, salvo se veio price_paid explícito
    const sum = serviceRows.reduce((a, r) => a + r.unit_price_snapshot * r.sessions_total, 0)
    pricePaid = Number(body.price_paid) >= 0 ? Number(body.price_paid) : sum
  }

  // expires_at
  let expiresAt: string | null = null
  if (validityKind !== 'none' && validityValue) {
    const d = new Date()
    if (validityKind === 'days') d.setDate(d.getDate() + validityValue)
    else if (validityKind === 'weeks') d.setDate(d.getDate() + validityValue * 7)
    else if (validityKind === 'months') d.setMonth(d.getMonth() + validityValue)
    else if (validityKind === 'years') d.setFullYear(d.getFullYear() + validityValue)
    expiresAt = d.toISOString()
  }

  // Gera code único (retry em colisão no unique index business_id+code)
  let gift: { id: string; code: string } | null = null
  for (let attempt = 0; attempt < 6 && !gift; attempt++) {
    const code = genCode()
    const { data, error } = await admin
      .from('gift_cards')
      .insert({
        business_id: businessId,
        code,
        mode,
        buyer_name: buyerName,
        buyer_phone: buyerPhone,
        recipient_customer_id: recipientCustomerId,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        gift_message: giftMessage,
        send_on: sendOn,
        price_paid: pricePaid,
        value_total: valueTotal,
        expires_at: expiresAt,
        status: 'active',
        notes,
        sold_by_professional_id: soldByProfessionalId,
        sold_by_role: soldByRole,
      })
      .select('id, code')
      .single()
    if (!error && data) { gift = data; break }
    // 23505 = unique_violation → tenta outro code; outro erro → aborta
    if (error && !/duplicate key|23505/i.test(error.message)) {
      return NextResponse.json({ error: `gift_insert_failed: ${error.message}` }, { status: 500 })
    }
  }
  if (!gift) return NextResponse.json({ error: 'code_generation_failed' }, { status: 500 })

  // Serviços do vale (modo services)
  if (mode === 'services') {
    const rows = serviceRows.map((r) => ({ gift_card_id: gift!.id, ...r, sessions_used: 0 }))
    const { error: gsErr } = await admin.from('gift_card_services').insert(rows)
    if (gsErr) {
      await admin.from('gift_cards').delete().eq('id', gift.id) // rollback
      return NextResponse.json({ error: `gift_services_failed: ${gsErr.message}` }, { status: 500 })
    }
  }

  // Resolve invoice (existente OU cria nova só pro vale)
  let invoiceId = invoiceIdIn
  if (invoiceId) {
    const { data: inv } = await admin.from('invoices').select('id, business_id, status').eq('id', invoiceId).maybeSingle()
    if (!inv || inv.business_id !== businessId) return NextResponse.json({ error: 'invoice_not_found' }, { status: 404 })
    if (inv.status !== 'open') return NextResponse.json({ error: 'invoice_not_open' }, { status: 400 })
  } else {
    const { data: invNumber } = await admin.rpc('next_invoice_number', { p_business_id: businessId })
    const { data: inv, error: invErr } = await admin
      .from('invoices')
      .insert({
        business_id: businessId,
        customer_id: recipientCustomerId,
        invoice_number: invNumber,
        status: 'open',
        subtotal: 0, discount: 0, total: 0,
        notes: `Cartão Presente ${gift.code}${buyerName ? ` · de ${buyerName}` : ''} · para ${recipientName}`,
      })
      .select('id')
      .single()
    if (invErr || !inv) {
      await admin.from('gift_cards').delete().eq('id', gift.id)
      return NextResponse.json({ error: `invoice_create_failed: ${invErr?.message}` }, { status: 500 })
    }
    invoiceId = inv.id
  }

  // invoice_item type='gift_card'
  const description = `Cartão Presente ${gift.code} · ${serviceRows.reduce((a, r) => a + r.sessions_total, 0)} serviço(s) · para ${recipientName}`
  const { data: invItem, error: iiErr } = await admin
    .from('invoice_items')
    .insert({
      invoice_id: invoiceId,
      item_type: 'gift_card',
      reference_id: gift.id,
      description,
      quantity: 1,
      unit_price: pricePaid,
      discount: 0,
      total: pricePaid,
    })
    .select('id')
    .single()
  if (iiErr || !invItem) {
    await admin.from('gift_cards').delete().eq('id', gift.id)
    return NextResponse.json({ error: `invoice_item_failed: ${iiErr?.message}` }, { status: 500 })
  }
  await admin.from('gift_cards').update({ invoice_item_id: invItem.id }).eq('id', gift.id)

  // Recalcula totais da comanda (mesma fórmula de packages/sell)
  const [{ data: allItems }, { data: invRow }] = await Promise.all([
    admin.from('invoice_items').select('total, discount').eq('invoice_id', invoiceId),
    admin.from('invoices').select('manual_discount').eq('id', invoiceId).maybeSingle(),
  ])
  const itemsTotal = (allItems ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0)
  const itemsDiscount = (allItems ?? []).reduce((s, r) => s + Number(r.discount ?? 0), 0)
  let manualDiscount = Number(invRow?.manual_discount ?? 0)
  if (manualDiscount > itemsTotal) manualDiscount = itemsTotal
  await admin.from('invoices').update({
    subtotal: itemsTotal + itemsDiscount,
    discount: itemsDiscount + manualDiscount,
    manual_discount: manualDiscount,
    total: Math.max(0, itemsTotal - manualDiscount),
  }).eq('id', invoiceId)

  // Read-after-write
  const { data: verify } = await admin
    .from('gift_cards')
    .select('id, code, status, invoice_item_id')
    .eq('id', gift.id)
    .maybeSingle()
  if (!verify || verify.status !== 'active' || verify.invoice_item_id !== invItem.id) {
    // Rollback total: ou persistiu tudo, ou reverteu tudo. Sem isso o operador
    // re-emite e a venda conta 2x (λ.prova-na-fonte). Desfaz item + vale (cascateia
    // gift_card_services por FK) e recalcula os totais com a MESMA fórmula de cima.
    await admin.from('invoice_items').delete().eq('id', invItem.id)
    await admin.from('gift_cards').delete().eq('id', gift.id)
    const [{ data: rbItems }, { data: rbInv }] = await Promise.all([
      admin.from('invoice_items').select('total, discount').eq('invoice_id', invoiceId),
      admin.from('invoices').select('manual_discount').eq('id', invoiceId).maybeSingle(),
    ])
    const rbItemsTotal = (rbItems ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0)
    const rbItemsDiscount = (rbItems ?? []).reduce((s, r) => s + Number(r.discount ?? 0), 0)
    let rbManualDiscount = Number(rbInv?.manual_discount ?? 0)
    if (rbManualDiscount > rbItemsTotal) rbManualDiscount = rbItemsTotal
    await admin.from('invoices').update({
      subtotal: rbItemsTotal + rbItemsDiscount,
      discount: rbItemsDiscount + rbManualDiscount,
      manual_discount: rbManualDiscount,
      total: Math.max(0, rbItemsTotal - rbManualDiscount),
    }).eq('id', invoiceId)
    return NextResponse.json({ error: 'verify_failed' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    gift_card_id: gift.id,
    code: gift.code,
    invoice_id: invoiceId,
    invoice_item_id: invItem.id,
    expires_at: expiresAt,
  })
}
