import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/lib/rate-limit-api'

// 'courtesy' aceito como legacy (V34). UI nova usa 'points' pra resgate
// de fidelidade. Constraint do banco já aceita os 5 (V37).
const VALID_METHODS = new Set(['pix', 'cash', 'card', 'courtesy', 'points'])
const VALID_CARD_TYPES = new Set(['credit', 'debit'])

/**
 * POST /api/admin/appointments/[id]/payment
 *
 * Body pra marcar pago em método não-cartão:
 *   { method: 'pix' | 'cash' | 'courtesy' | 'points' }
 *
 * Body pra marcar pago em cartão (com taxa snapshot):
 *   { method: 'card', device_id: uuid, card_brand: text, card_type: 'credit'|'debit', fee_percent: number }
 *
 * Body pra desmarcar:
 *   { paid: false }
 *
 * Autorizado: dono do business OU recepcionista (is_receptionist=true)
 * do mesmo business.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(req, { key: 'admin-appt-payment', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  // Validacao: appointment + business
  const { data: appt } = await supabase
    .from('appointments')
    .select('id, business_id, professional_id, total_price, invoice_item_id, commission_payment_id')
    .eq('id', id)
    .single()
  if (!appt) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Autorização: dono, recepcionista OU profissional (v98 · 30/07/2026).
  //
  // Eduardo 30/07: "quem marca, agenda e marca como pago são as próprias
  // profissionais" — negócio sem recepção (Realli) não tinha ninguém além da
  // dona pra receber. Sem isso, o atendimento nunca virava comissão pra ela
  // nem recebido pra dona.
  //
  // Mesma regra do cancelar: age sempre no que é dela; no da colega só se o
  // negócio ligou `professionals_can_book_others`. Default false = Olímpio,
  // Studio MOOD e os outros seguem com dono/recepção só.
  const [{ data: business }, { data: prof }, { data: biz }] = await Promise.all([
    supabase
      .from('businesses')
      .select('id')
      .eq('id', appt.business_id)
      .eq('owner_id', user.id)
      .maybeSingle(),
    supabase
      .from('professionals')
      .select('id, is_receptionist')
      .eq('business_id', appt.business_id)
      .eq('auth_user_id', user.id)
      .eq('active', true)
      .maybeSingle(),
    supabase
      .from('businesses')
      .select('professionals_can_book_others')
      .eq('id', appt.business_id)
      .maybeSingle(),
  ])
  const isOwner = !!business
  const isReceptionist = prof?.is_receptionist === true
  const ehDela = !!prof && prof.id === appt.professional_id
  const podeMexerNoDaColega = biz?.professionals_can_book_others === true
  const isProfissionalAutorizada = !!prof && !prof.is_receptionist && (ehDela || podeMexerNoDaColega)
  if (!isOwner && !isReceptionist && !isProfissionalAutorizada) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  /* ─── VALOR NO ATO DO PAGAMENTO (v100 · 03/08/2026) ───────────────────
     Eduardo, a partir do caso DN Diogo Nogueira: "o tempo e o valor do
     serviço muitas vezes é definido quando faz o atendimento e não no
     agendamento". Instalação de papel de parede é orçada por metragem —
     e o mesmo vale pra cabelo que precisou de mais produto ou sessão que
     rendeu mais tempo. Antes disso o dono tinha que sair da tela, editar o
     atendimento, salvar e voltar pra marcar pago. Ele fazia uma vez e
     desistia: 6 dos 14 atendimentos do Diogo ficaram sem valor.

     ⚠️ "alterar o valor propaga pra TODO o sistema financeiro. TODO."
     (Eduardo, 03/08). O valor NÃO vive só em appointments.total_price —
     está copiado na comanda:

        appointments.total_price
          └─ invoice_items.unit_price + .total      (cópia por item)
              └─ invoices.subtotal + .total         (soma dos itens)

     Hoje 1.437 atendimentos estão dentro de comanda. Gravar só o
     total_price deixaria a comanda com o valor velho — duas telas de
     dinheiro discordando. Por isso a propagação abaixo é parte do mesmo
     fluxo, não um "depois".

     BLOQUEIOS (o que NÃO se reescreve):
     · atendimento já incluído em comissão paga (commission_payment_id) —
       mudar a base depois faz o que foi pago à profissional não bater com
       o que o sistema calcula
     · comanda que já tem pagamento registrado — o dinheiro já entrou por
       um valor; corrigir isso é estorno, não edição
     Nos dois casos devolve 409 e a tela explica o motivo.
     ─────────────────────────────────────────────────────────────────── */
  let novoValor: number | null = null
  if (body.paid !== false && body.total_price !== undefined && body.total_price !== null) {
    const v = Number(body.total_price)
    if (!Number.isFinite(v) || v < 0 || v > 1_000_000) {
      return NextResponse.json({ error: 'valor inválido' }, { status: 400 })
    }
    // Só encara como alteração se mudou de fato — evita reescrever comanda à toa.
    if (Math.abs(v - Number(appt.total_price ?? 0)) > 0.001) {
      if (appt.commission_payment_id) {
        return NextResponse.json(
          { error: 'Este atendimento já entrou num pagamento de comissão. O valor não pode mais ser alterado.' },
          { status: 409 }
        )
      }
      if (appt.invoice_item_id) {
        const { data: item } = await supabase
          .from('invoice_items')
          .select('invoice_id')
          .eq('id', appt.invoice_item_id)
          .maybeSingle()
        if (item?.invoice_id) {
          const { count } = await supabase
            .from('invoice_payments')
            .select('id', { count: 'exact', head: true })
            .eq('invoice_id', item.invoice_id)
          if ((count ?? 0) > 0) {
            return NextResponse.json(
              { error: 'A comanda deste atendimento já foi paga. Para corrigir o valor, estorne o pagamento da comanda.' },
              { status: 409 }
            )
          }
        }
      }
      novoValor = v
    }
  }

  // 2 modos: marcar pago (com method) OU desmarcar (paid: false)
  const updates: {
    paid_at: string | null
    payment_method: string | null
    payment_device_id?: string | null
    payment_card_brand?: string | null
    payment_card_type?: string | null
    payment_fee_percent?: number | null
    payment_installments?: number
    total_price?: number
  } = {
    paid_at: null,
    payment_method: null,
    payment_device_id: null,
    payment_card_brand: null,
    payment_card_type: null,
    payment_fee_percent: null,
    payment_installments: 1,
  }

  if (body.paid !== false) {
    const method = typeof body.method === 'string' ? body.method : null
    if (!method || !VALID_METHODS.has(method)) {
      return NextResponse.json(
        { error: 'método inválido (use pix, cash, card, courtesy ou points)' },
        { status: 400 }
      )
    }
    updates.paid_at = new Date().toISOString()
    updates.payment_method = method

    // Snapshot dos dados de cartão — só relevante quando method='card'
    if (method === 'card') {
      const deviceId = typeof body.device_id === 'string' ? body.device_id : null
      const brand = typeof body.card_brand === 'string' ? body.card_brand.trim() : null
      const cardType = typeof body.card_type === 'string' ? body.card_type : null
      const feePercent =
        typeof body.fee_percent === 'number' && body.fee_percent >= 0 && body.fee_percent < 100
          ? body.fee_percent
          : null

      if (cardType && !VALID_CARD_TYPES.has(cardType)) {
        return NextResponse.json({ error: 'card_type inválido' }, { status: 400 })
      }

      // Validação: se forneceu device_id, ele tem que pertencer ao business
      if (deviceId) {
        const { data: device } = await supabase
          .from('merchant_devices')
          .select('id')
          .eq('id', deviceId)
          .eq('business_id', appt.business_id)
          .maybeSingle()
        if (!device) {
          return NextResponse.json(
            { error: 'maquininha não pertence a este negócio' },
            { status: 400 }
          )
        }
      }

      updates.payment_device_id = deviceId
      updates.payment_card_brand = brand
      updates.payment_card_type = cardType
      updates.payment_fee_percent = feePercent

      const installments = typeof body.installments === 'number' && body.installments >= 1 && body.installments <= 12
        ? body.installments
        : 1
      updates.payment_installments = installments
    }
  }

  // Valor entra no MESMO update do pagamento. Tem que estar gravado antes da
  // reconciliação de comanda lá embaixo, que lê o total pra criar o
  // invoice_payments — senão a comanda registra o valor antigo.
  if (novoValor !== null) updates.total_price = novoValor

  const { error: updateErr } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)

  if (updateErr) {
    console.error('payment update error:', updateErr)
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  /* ─── PROPAGAÇÃO PRA COMANDA ────────────────────────────────────────
     Roda ANTES da reconciliação de pagamento (bloco seguinte), que soma
     invoices.total. Ordem invertida = comanda paga com valor velho.

     Refaz o total da fatura somando os itens em vez de aplicar a
     diferença: soma é idempotente e sobrevive a item adicionado por outro
     caminho; delta acumula erro a cada correção. */
  if (novoValor !== null && appt.invoice_item_id) {
    try {
      const admin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
      )
      const { data: item } = await admin
        .from('invoice_items')
        .select('id, invoice_id, quantity, discount')
        .eq('id', appt.invoice_item_id)
        .maybeSingle()

      if (item) {
        const qtd = Number(item.quantity ?? 1) || 1
        const descontoItem = Number(item.discount ?? 0)
        await admin
          .from('invoice_items')
          .update({
            unit_price: novoValor,
            total: Math.max(0, novoValor * qtd - descontoItem),
          })
          .eq('id', item.id)

        const { data: itens } = await admin
          .from('invoice_items')
          .select('total')
          .eq('invoice_id', item.invoice_id)
        const subtotal = (itens ?? []).reduce((s, i) => s + Number(i.total ?? 0), 0)

        const { data: fatura } = await admin
          .from('invoices')
          .select('discount')
          .eq('id', item.invoice_id)
          .maybeSingle()
        const descontoFatura = Number(fatura?.discount ?? 0)

        await admin
          .from('invoices')
          .update({ subtotal, total: Math.max(0, subtotal - descontoFatura) })
          .eq('id', item.invoice_id)
      }
    } catch (e) {
      // Não-fatal pro pagamento, mas registra: comanda fora de sincronia é
      // dinheiro divergente entre telas e precisa aparecer no log.
      console.error('propagacao de valor para comanda falhou:', e)
    }
  }

  // Reconcilia comanda ABERTA (bug Olímpio 09/06): se o atendimento já pertence
  // a uma comanda (faturada "pagar depois") e agora é pago DIRETO aqui, a comanda
  // ficava aberta e o valor sumia do "Recebido" (a régua exclui appt com
  // invoice_item_id, assumindo que conta via pagamento da comanda — que nunca
  // veio). Aqui fechamos a comanda + registramos o pagamento. Não-fatal: se
  // falhar, o atendimento segue marcado pago.
  if (updates.paid_at) {
    try {
      const admin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
      )
      const { data: full } = await admin
        .from('appointments')
        .select('invoice_item_id, total_price')
        .eq('id', id)
        .maybeSingle()
      if (full?.invoice_item_id) {
        const { data: item } = await admin
          .from('invoice_items')
          .select('invoice_id')
          .eq('id', full.invoice_item_id)
          .maybeSingle()
        if (item?.invoice_id) {
          const { data: inv } = await admin
            .from('invoices')
            .select('id, status, total')
            .eq('id', item.invoice_id)
            .maybeSingle()
          if (inv && inv.status === 'open') {
            const { count } = await admin
              .from('invoice_payments')
              .select('id', { count: 'exact', head: true })
              .eq('invoice_id', inv.id)
            if ((count ?? 0) === 0) {
              await admin.from('invoice_payments').insert({
                invoice_id: inv.id,
                payment_method: updates.payment_method,
                amount: Number(inv.total ?? full.total_price ?? 0),
                paid_at: updates.paid_at,
                installments: updates.payment_installments ?? 1,
                fee_percent: updates.payment_fee_percent ?? 0,
              })
            }
            await admin
              .from('invoices')
              .update({ status: 'closed', closed_at: updates.paid_at })
              .eq('id', inv.id)
          }
        }
      }
    } catch (e) {
      console.error('[payment] reconcile comanda aberta (não-fatal):', e)
    }
  }

  revalidatePath('/admin/financeiro')
  return NextResponse.json({
    ok: true,
    paid_at: updates.paid_at,
    payment_method: updates.payment_method,
    payment_device_id: updates.payment_device_id,
    payment_card_brand: updates.payment_card_brand,
    payment_card_type: updates.payment_card_type,
    payment_fee_percent: updates.payment_fee_percent,
  })
}
