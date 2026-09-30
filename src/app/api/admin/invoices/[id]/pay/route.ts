import { resolveBusinessIdOperacao } from '@/lib/api-business-access'
import { acertarValorDosProdutosDaComanda } from '@/lib/produto-desconto'
import { NextResponse } from 'next/server'
import { linhasDoSinal, NOTA_SINAL } from '@/lib/sinal-da-comanda'
import { resgatarRecompensa, estornarResgates } from '@/lib/resgate-pontos'
import { reservarComanda, RESPOSTA_COMANDA_OCUPADA, comReservaLiberadaNoErro, devolverCreditoDaComanda } from '@/lib/reserva-comanda'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * POST /api/admin/invoices/[id]/pay
 *
 * Recebe pagamento de comanda em status='open'.
 * Body: {
 *   method: 'cash'|'pix'|'card'|'courtesy'|'points',
 *   device_id?, card_brand?, card_type?, installments?, fee_percent?
 * }
 *
 * Cascata:
 *  1. Cria invoice_payment com valor = invoice.total
 *  2. Marca invoice status='closed' + closed_at
 *  3. Atualiza appointments vinculados: status='completed', paid_at, payment_method
 *  4. Atualiza sales vinculadas: status='paid', paid_at, payment_method
 *  5. Read-after-write
 */
// Qualquer erro depois de reservar a comanda libera a reserva (v150).
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return comReservaLiberadaNoErro(
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  ),
    (ctxReserva) => postPagar(request, ctx, ctxReserva),
  )
}

async function postPagar(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
  ctxReserva: { reservada?: string },
): Promise<Response> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // v98k · dono, recepção OU profissional (esta só com a flag de equipe ligada).
  // É o "Receber pagamento" da comanda — sem isso a Realli, que não tem
  // recepção, empacava aqui depois de marcar o atendimento (relato 30/07 14:48).
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return NextResponse.json({ error: 'no_business' }, { status: 403 })

  const { id: invoiceId } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  // 2 modos:
  //  A) Single: { method, device_id?, card_brand?, card_type?, installments?, fee_percent? }
  //  B) Split:  { payments: [{ method, amount, device_id?, card_brand?, card_type?, installments?, fee_percent? }, ...] }
  type PaymentIn = {
    method: 'cash' | 'pix' | 'card' | 'courtesy' | 'points' | 'credit'
    amount?: number
    device_id?: string | null
    card_brand?: string | null
    card_type?: string | null
    installments?: number | null
    fee_percent?: number | null
    /** method 'points': recompensa trocada pelos pontos (lib/resgate-pontos) */
    reward_id?: string | null
  }
  const ALLOWED = ['cash', 'pix', 'card', 'courtesy', 'points', 'credit']
  let payments: PaymentIn[] = []
  if (Array.isArray(body.payments) && body.payments.length > 0) {
    payments = body.payments
  } else if (typeof body.method === 'string') {
    payments = [{
      method: body.method,
      device_id: body.device_id ?? null,
      card_brand: body.card_brand ?? null,
      card_type: body.card_type ?? null,
      installments: body.installments ?? 1,
      fee_percent: body.fee_percent ?? 0,
      reward_id: body.reward_id ?? null,
    }]
  }
  if (payments.length === 0 || payments.some((p) => !ALLOWED.includes(p.method))) {
    return NextResponse.json({ error: 'invalid_payments' }, { status: 400 })
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: invoice } = await admin
    .from('invoices')
    .select('id, business_id, status, total, customer_id')
    .eq('id', invoiceId)
    .maybeSingle()
  if (!invoice) return NextResponse.json({ error: 'invoice_not_found' }, { status: 404 })
  if (invoice.business_id !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (invoice.status !== 'open') {
    return NextResponse.json({ error: 'invoice_not_open', current: invoice.status }, { status: 400 })
  }
  // Clique duplo / 2 aparelhos pagando a mesma comanda (v150 · M5)
  if (!(await reservarComanda(admin, invoiceId))) {
    return NextResponse.json(RESPOSTA_COMANDA_OCUPADA, { status: 409 })
  }
  ctxReserva.reservada = invoiceId

  const nowIso = new Date().toISOString()
  const total = Number(invoice.total ?? 0)

  /* SINAL já pago (auditoria 29/09): esta rota não conhecia o sinal e
     cobrava o total cheio — a cliente pagava o sinal de novo. Agora o sinal
     vira pagamento próprio (na data em que caiu, pix ou crédito) e a dona
     recebe só o que falta. */
  const { data: itensAppt } = await admin
    .from('invoice_items')
    .select('reference_id')
    .eq('invoice_id', invoiceId)
    .eq('item_type', 'appointment')
  const sinal = await linhasDoSinal(admin, (itensAppt ?? []).map((i) => i.reference_id as string).filter(Boolean))
  const aReceber = Math.max(0, Math.round((total - sinal.total) * 100) / 100)

  // Se single, amount = o que falta. Se split, amount vem em cada · valida soma.
  const normalized = payments.map((p) => ({ ...p, amount: payments.length === 1 ? aReceber : Number(p.amount ?? 0) }))
  const sumAmounts = normalized.reduce((s, p) => s + (p.amount ?? 0), 0)
  if (Math.abs(sumAmounts - aReceber) > 0.01) {
    return NextResponse.json({
      error: 'amounts_dont_sum_total',
      detail: sinal.total > 0
        ? `Soma dos pagamentos (${sumAmounts.toFixed(2)}) não fecha com o que falta receber (${aReceber.toFixed(2)} · R$ ${sinal.total.toFixed(2)} já pagos no sinal)`
        : `Soma dos pagamentos (${sumAmounts.toFixed(2)}) não fecha com o total da comanda (${total.toFixed(2)})`,
    }, { status: 400 })
  }

  /* PONTOS = resgate de recompensa (Eduardo 29/09 · lib/resgate-pontos).
     Repagamento devolve o resgate anterior; pagar com pontos resgata de novo. */
  const apptIdsComanda = (itensAppt ?? []).map((i) => i.reference_id as string).filter(Boolean)
  await estornarResgates(admin, apptIdsComanda)
  const pagPontos = normalized.find((p) => p.method === 'points')
  if (pagPontos) {
    if (apptIdsComanda.length === 0) return NextResponse.json({ error: 'Pontos só pagam atendimento.' }, { status: 400 })
    const r = await resgatarRecompensa(admin, {
      businessId,
      customerId: (invoice.customer_id as string | null) ?? null,
      rewardId: pagPontos.reward_id ?? null,
      appointmentId: apptIdsComanda[0],
    })
    if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 400 })
  }

  // Repagamento (comanda reaberta): o crédito usado no pagamento anterior
  // volta antes de abater de novo — senão a cliente perdia saldo 2x (M3).
  await devolverCreditoDaComanda(admin, invoiceId)

  // 1a. CRÉDITO · valida saldo + abate customer_credits FIFO antes de criar invoice_payment
  const creditTotal = normalized.filter((p) => p.method === 'credit').reduce((s, p) => s + (p.amount ?? 0), 0)
  if (creditTotal > 0) {
    if (!invoice.customer_id) {
      return NextResponse.json({ error: 'no_customer_for_credit', detail: 'Comanda sem cliente · crédito exige cliente vinculado' }, { status: 400 })
    }
    /* v113 · dois filtros novos, e o primeiro fechava um buraco de dinheiro:
       · used_in_appointment_id — crédito já gasto pra pagar o SINAL de um
         agendamento continuava aparecendo como disponível aqui. A cliente
         ganharia o mesmo desconto duas vezes: uma no sinal, outra na comanda.
       · expires_at — crédito de cancelamento vale N dias; sem o filtro, o
         prazo que a tela promete pra cliente não valeria na hora de usar.
       Crédito antigo (anterior à v113) tem expires_at nulo e segue valendo
       pra sempre, como sempre valeu. */
    const agoraIso = new Date().toISOString()
    const { data: credits } = await admin
      .from('customer_credits')
      .select('id, amount, origin, date, expires_at, business_id')
      .eq('customer_id', invoice.customer_id)
      .is('used_in_invoice_id', null)
      .is('used_in_appointment_id', null)
      .or(`expires_at.is.null,expires_at.gte.${agoraIso}`)
      .order('date', { ascending: true }) // FIFO · mais antigos primeiro
    const available = (credits ?? []).reduce((s, c) => s + Number(c.amount ?? 0), 0)
    if (available < creditTotal - 0.01) {
      return NextResponse.json({
        error: 'insufficient_credit',
        detail: `Cliente tem só R$ ${available.toFixed(2)} de crédito · pediu R$ ${creditTotal.toFixed(2)}`,
      }, { status: 400 })
    }
    // Abate · marca os créditos como usados até cobrir o valor
    let remaining = creditTotal
    const creditIdsToUse: string[] = []
    // Auditoria 29/09 (M3): o último crédito era queimado INTEIRO — R$100 de
    // crédito usado numa conta de R$30 perdia R$70. A sobra volta como crédito
    // novo, com a mesma origem/data/validade (mesmo padrão do sinal).
    let sobra: { valor: number; origin: string; date: string; expires_at: string | null; business_id: string } | null = null
    for (const c of (credits ?? [])) {
      if (remaining <= 0.01) break
      const amt = Number(c.amount ?? 0)
      if (amt <= 0) continue
      creditIdsToUse.push(c.id as string)
      if (amt > remaining + 0.01) {
        sobra = {
          valor: Math.round((amt - remaining) * 100) / 100,
          origin: (c.origin as string) ?? 'other',
          date: (c.date as string) ?? new Date().toISOString().slice(0, 10),
          expires_at: (c.expires_at as string | null) ?? null,
          business_id: c.business_id as string,
        }
      }
      remaining -= amt
    }
    // V1 simples: marca todos os créditos consumidos como used_in_invoice_id=invoiceId
    // (não faz split parcial de 1 crédito · se cliente quiser usar só parte, V2)
    if (creditIdsToUse.length > 0) {
      const { error: usedErr } = await admin
        .from('customer_credits')
        .update({ used_in_invoice_id: invoiceId })
        .in('id', creditIdsToUse)
      if (usedErr) return NextResponse.json({ error: `credit_abate_failed: ${usedErr.message}` }, { status: 500 })
    }
    if (sobra && sobra.valor > 0) {
      const { error: sobraErr } = await admin.from('customer_credits').insert({
        business_id: sobra.business_id,
        customer_id: invoice.customer_id,
        amount: sobra.valor,
        origin: sobra.origin,
        date: sobra.date,
        expires_at: sobra.expires_at,
        notes: `Sobra de crédito usado na comanda ${invoiceId}`,
      })
      if (sobraErr) {
        // Sem a sobra gravada, devolve os créditos usados (não queima saldo)
        await admin.from('customer_credits').update({ used_in_invoice_id: null }).in('id', creditIdsToUse)
        return NextResponse.json({ error: `credit_sobra_failed: ${sobraErr.message}` }, { status: 500 })
      }
    }
  }

  // 1b. invoice_payments · 1 row por pagamento
  //
  // Idempotência (caso #819): uma comanda pode ter sido REABERTA depois de um
  // pagamento anterior (action 'reopen' mantém os payments antigos). Cada
  // fechamento aqui é uma quitação COMPLETA (single=total OU split somando o
  // total), então limpamos os pagamentos antigos antes de registrar os novos.
  // Sem isso, reabrir+pagar de novo empilhava pagamentos duplicados (ex: comanda
  // de R$195 com R$754 registrado). Studio Mood/Izanara 09/06.
  /* Repagamento de comanda REABERTA (auditoria 29/09): usa a data do
     pagamento original, não a de hoje. Antes o paid_at de todos os
     atendimentos/vendas ia pra hoje: o Fluxo de um dia já fechado mudava pra
     trás e a comissão já paga reaparecia como pendente no mês novo. */
  const { data: pagosAntes } = await admin
    .from('invoice_payments')
    .select('paid_at')
    .eq('invoice_id', invoiceId)
    .or(`notes.is.null,notes.neq.${NOTA_SINAL}`)
    .order('paid_at', { ascending: true })
    .limit(1)
  const quando = (pagosAntes?.[0]?.paid_at as string | undefined) ?? nowIso

  // A linha do SINAL fica (é dinheiro que entrou em outro dia · 29/09).
  await admin.from('invoice_payments').delete().eq('invoice_id', invoiceId)
    .or(`notes.is.null,notes.neq.${NOTA_SINAL}`)
  const { count: sinalJaLancado } = await admin
    .from('invoice_payments')
    .select('id', { count: 'exact', head: true })
    .eq('invoice_id', invoiceId)
    .eq('notes', NOTA_SINAL)
  if (!sinalJaLancado && sinal.linhas.length > 0) {
    const { error: sinalErr } = await admin.from('invoice_payments').insert(
      sinal.linhas.map((l) => ({ invoice_id: invoiceId, ...l, installments: 1, fee_percent: 0, notes: NOTA_SINAL })),
    )
    if (sinalErr) return NextResponse.json({ error: `sinal_payment_failed: ${sinalErr.message}` }, { status: 500 })
  }

  const rows = normalized.filter((p) => (p.amount ?? 0) > 0).map((p) => ({
    invoice_id: invoiceId,
    payment_method: p.method,
    amount: p.amount,
    device_id: p.device_id ?? null,
    card_brand: p.card_brand ?? null,
    card_type: p.card_type ?? null,
    installments: p.installments ?? 1,
    fee_percent: p.fee_percent ?? 0,
    paid_at: quando,
  }))
  // Sinal cobriu tudo (ou comanda 100% descontada): não sobra linha a gravar.
  const { error: payErr } = rows.length > 0
    ? await admin.from('invoice_payments').insert(rows)
    : { error: null }
  if (payErr) return NextResponse.json({ error: `payment_creation_failed: ${payErr.message}` }, { status: 500 })

  // Pra appointments/sales, usa o método do MAIOR pagamento REAL (cash/pix/card/courtesy/points).
  // 'credit' não está no CHECK constraint do schema · se a comanda foi 100% crédito,
  // propaga null (paid_at preenchido mas method null) · breakdown completo fica em invoice_payments.
  const realMethods = normalized.filter((p) => p.method !== 'credit')
  const propagatedMethod = realMethods.length > 0
    ? [...realMethods].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))[0].method
    : null

  // 2. Pega items pra propagar pagamento
  const { data: items } = await admin
    .from('invoice_items')
    .select('id, item_type, reference_id')
    .eq('invoice_id', invoiceId)

  const apptIds = (items ?? []).filter((i) => i.item_type === 'appointment' && i.reference_id).map((i) => i.reference_id as string)
  const saleIds = (items ?? []).filter((i) => i.item_type === 'product' && i.reference_id).map((i) => i.reference_id as string)

  // 3. Atualiza appointments → completed + paid_at
  if (apptIds.length > 0) {
    // paid_at só onde ainda não tem (reaberta mantém o dia original)
    const { error } = await admin
      .from('appointments')
      .update({ status: 'completed', payment_method: propagatedMethod })
      .in('id', apptIds)
    if (error) return NextResponse.json({ error: `appointments_update_failed: ${error.message}` }, { status: 500 })
    await admin.from('appointments').update({ paid_at: quando }).in('id', apptIds).is('paid_at', null)
  }

  // 4. Atualiza sales → paid
  if (saleIds.length > 0) {
    // Valor do produto = o cobrado na comanda − parte do desconto geral.
    await acertarValorDosProdutosDaComanda(admin, invoiceId)
    const { error } = await admin
      .from('sales')
      .update({ status: 'paid', payment_method: propagatedMethod })
      .in('id', saleIds)
    await admin.from('sales').update({ paid_at: quando }).in('id', saleIds).is('paid_at', null)
    if (error) return NextResponse.json({ error: `sales_update_failed: ${error.message}` }, { status: 500 })
  }

  // 5. Fecha invoice
  const { error: invErr } = await admin
    .from('invoices')
    .update({ status: 'closed', closed_at: quando, fechando_desde: null })
    .eq('id', invoiceId)
  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

  // 6. Read-after-write
  const { data: confirm } = await admin
    .from('invoices')
    .select('status, total')
    .eq('id', invoiceId)
    .maybeSingle()
  if (confirm?.status !== 'closed') {
    return NextResponse.json({ error: 'persistence_check_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status: 'closed', total })
}
