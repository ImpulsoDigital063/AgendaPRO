import type { SupabaseClient } from '@supabase/supabase-js'
import { getApptDiscountMap } from '@/lib/commission-discount'
import { getApptChargedMap } from '@/lib/queries/appointment-charged-total'
import { addDaysBR, startOfDayBR } from '@/lib/date-br'
import { ajusteSinalDoPeriodo } from '@/lib/sinal-da-comanda'
import { vendasPacoteCartao } from '@/lib/queries/vendas-pacote-cartao'
import { comissoesGeradas, type ComissaoLinha } from '@/lib/comissao-gerada'
import { fetchAll } from '@/lib/fetch-all'

/* ═══════════════════════════════════════════════════════════════
   Resumo financeiro do período · UMA conta pra todo lugar (21/10/2026)

   Saiu de dentro de financeiro/page.tsx. Antes, o período anterior do
   hub ("% vs anterior") era somado por outra regra — sem tirar cortesia,
   crédito e pontos, sem sinal e sem pacote —, então a comparação não era
   justa. Agora o hub chama esta função pros dois períodos, e a tela
   "Pergunte ao seu negócio" chama a mesma: o número bate por construção.

   Regra de "faturei" = a do hub: atendimento PAGO pela data do atendimento,
   líquido de desconto, sem cortesia/crédito/pontos, com o ajuste do sinal
   (conta no dia em que caiu) + produto pago pela data da venda + pacote e
   cartão presente vendidos no período. Datas em AAAA-MM-DD (dia BR).
   ═══════════════════════════════════════════════════════════════ */

const NAO_E_RECEITA = ['courtesy', 'credit', 'points']

const SELECT_APPT = `
  id, client_name, client_phone, client_id, appointment_date, start_time,
  status, service_name, total_price, paid_at, payment_method, invoice_item_id,
  payment_card_type, payment_card_brand, payment_fee_percent, payment_installments,
  professional:professionals(id, name, commission_percentage, employment_type)
`

const SELECT_VENDA = `
  id, sale_date, total, paid_at, payment_method, payment_card_type, payment_fee_percent, professional_id,
  professional:professionals(id, name),
  sale_items(product_name, quantity, unit_price)
`

type Prof = { id: string; name: string | null; commission_percentage?: number | null; employment_type?: string | null }

export type ApptDoPeriodo = {
  id: string
  client_name: string | null
  client_phone: string | null
  client_id: string | null
  appointment_date: string
  start_time: string | null
  status: string | null
  service_name: string | null
  /** LÍQUIDO: já sem o desconto da comanda e sem o sinal que não é do período. */
  total_price: number | null
  paid_at: string | null
  payment_method: string | null
  invoice_item_id: string | null
  payment_card_type: string | null
  payment_card_brand: string | null
  payment_fee_percent: number | null
  payment_installments: number | null
  professional: Prof | Prof[] | null
  /** Total da comanda quando ela tem produto (pra "a receber"); senão null. */
  charged_total?: number | null
}

export type VendaDoPeriodo = {
  id: string
  sale_date: string
  total: number | null
  paid_at: string | null
  payment_method: string | null
  payment_card_type: string | null
  payment_fee_percent: number | null
  professional_id: string | null
  professional: { id: string; name: string | null } | { id: string; name: string | null }[] | null
  sale_items: { product_name?: string; quantity?: number; unit_price?: number }[] | null
}

export type ReceitaDoPeriodo = {
  /** Todos os atendimentos do período (qualquer status), normalizados. */
  appointments: ApptDoPeriodo[]
  /** Pagos que contam como receita (sem cortesia, crédito, pontos). */
  paidAppts: ApptDoPeriodo[]
  productSales: VendaDoPeriodo[]
  valorRecebidoAppts: number
  valorRecebidoSales: number
  /** Sinal em dinheiro recebido no período de atendimento de fora dele. */
  sinalDeFora: number
  valorPacotes: number
  valorRecebido: number
  qtdAtendimentos: number
  ticketMedio: number
  /** Atendimentos não pagos e não cancelados, pelo valor da comanda. */
  valorProgramado: number
  totalTaxas: number
}

export async function receitaDoPeriodo(
  sb: SupabaseClient,
  businessId: string,
  de: string,
  ate: string,
): Promise<ReceitaDoPeriodo> {
  const [appointments, productSales] = await Promise.all([
    fetchAll<ApptDoPeriodo>(() =>
      sb.from('appointments')
        .select(SELECT_APPT)
        .eq('business_id', businessId)
        .gte('appointment_date', de)
        .lte('appointment_date', ate)
        .order('appointment_date', { ascending: false })
        .order('id', { ascending: true }) as never,
    ),
    fetchAll<VendaDoPeriodo>(() =>
      sb.from('sales')
        .select(SELECT_VENDA)
        .eq('business_id', businessId)
        .eq('type', 'product_sale')
        .eq('status', 'paid')
        .not('payment_method', 'in', `(${NAO_E_RECEITA.join(',')})`)
        .gte('sale_date', de)
        .lte('sale_date', ate)
        .order('id', { ascending: true }) as never,
    ),
  ])

  // λ.valor-liquido: total_price vira o LÍQUIDO do serviço (desconto rateado).
  // O produto NÃO entra aqui (é somado de productSales) — entra só no
  // charged_total, usado pelo "a receber" (Eduardo 22/07).
  const [disc, charged] = await Promise.all([
    getApptDiscountMap(sb, appointments.map((a) => a.invoice_item_id)),
    getApptChargedMap(sb, appointments.map((a) => a.id)),
  ])
  for (const a of appointments) {
    a.total_price = Math.max(0, Number(a.total_price ?? 0) - (disc[a.id] ?? 0))
    const c = charged[a.id]
    a.charged_total = c && c.produtos.length > 0 ? c.charged : null
  }

  // Sinal conta no dia em que caiu (decisão 29/09).
  const pagosDoPeriodo = appointments.filter((a) => a.paid_at)
  const inicioIso = startOfDayBR(de)
  const fimIso = startOfDayBR(addDaysBR(ate, 1))
  const ajusteSinal = await ajusteSinalDoPeriodo(sb, businessId, pagosDoPeriodo.map((a) => a.id), inicioIso, fimIso)
  for (const a of pagosDoPeriodo) {
    const tirar = ajusteSinal.subtrair[a.id] ?? 0
    if (tirar > 0) a.total_price = Math.max(0, Number(a.total_price ?? 0) - tirar)
  }

  const paidAppts = appointments.filter((a) => a.paid_at && !NAO_E_RECEITA.includes(a.payment_method ?? ''))
  const valorRecebidoAppts = paidAppts.reduce((s, a) => s + Number(a.total_price ?? 0), 0)
  const valorRecebidoSales = productSales.reduce((s, p) => s + Number(p.total ?? 0), 0)
  const pacotes = await vendasPacoteCartao(sb, businessId, inicioIso, fimIso)
  const valorPacotes = Math.round(pacotes.reduce((s, v) => s + v.valor, 0) * 100) / 100
  const valorRecebido = valorRecebidoAppts + valorRecebidoSales + ajusteSinal.somar + valorPacotes

  const valorProgramado = appointments
    .filter((a) => !a.paid_at && a.status !== 'cancelled')
    .reduce((s, a) => s + Number(a.charged_total ?? a.total_price ?? 0), 0)

  const taxa = (valor: number | null, pct: number | null) => (Number(valor ?? 0) * Number(pct ?? 0)) / 100
  const totalTaxas =
    paidAppts.reduce((s, a) => s + taxa(a.total_price, a.payment_fee_percent), 0) +
    productSales.reduce((s, p) => s + taxa(p.total, p.payment_fee_percent), 0)

  return {
    appointments,
    paidAppts,
    productSales,
    valorRecebidoAppts,
    valorRecebidoSales,
    sinalDeFora: ajusteSinal.somar,
    valorPacotes,
    valorRecebido,
    qtdAtendimentos: paidAppts.length,
    ticketMedio: paidAppts.length > 0 ? valorRecebido / paidAppts.length : 0,
    valorProgramado,
    totalTaxas,
  }
}

export type DespesasDoPeriodo = {
  expenses: { amount: number | null; category: string | null; status: string | null; occurred_at: string; name?: string | null }[]
  usaComissaoNoFluxo: boolean
  pagaNoAtendimento: boolean
  geradas: ComissaoLinha[]
  comissaoGerada: number
  comissoesPagasRegistradas: number
  comissaoDoPeriodo: number
  /** Gerada e ainda não registrada como paga: fora de "Despesas pagas", mas sai do lucro. */
  comissaoAPagar: number
  /** Despesas pagas + comissão registrada como paga. */
  despesasPagas: number
}

type NegocioComissao = { id: string; comissao_no_fluxo?: boolean | null; comissao_paga_no_atendimento?: boolean | null }

export async function despesasDoPeriodo(
  sb: SupabaseClient,
  business: NegocioComissao,
  de: string,
  ate: string,
): Promise<DespesasDoPeriodo> {
  // v104 · só saída REALIZADA. expenses NÃO tem paid_at: paga = status 'paid'.
  // occurred_at é DATE: compara direto com o dia BR.
  const expenses = await fetchAll<DespesasDoPeriodo['expenses'][number]>(() =>
    sb.from('expenses')
      .select('amount, category, status, occurred_at, name')
      .eq('business_id', business.id)
      .eq('status', 'paid')
      .gte('occurred_at', de)
      .lte('occurred_at', ate)
      .order('occurred_at', { ascending: true }) as never,
  )

  /* v142 · comissão sai do caixa só com a chave comissao_no_fluxo. Conta o
     MAIOR entre gerada e paga (Izanara 02/10); v151 · quem paga no dia do
     atendimento tem a gerada como paga. Mesmas regras de Remunerações. */
  const usaComissaoNoFluxo = business.comissao_no_fluxo === true
  const pagaNoAtendimento = business.comissao_paga_no_atendimento === true
  let geradas: ComissaoLinha[] = []
  let pagosRegistrados = 0
  if (usaComissaoNoFluxo) {
    const inicioIso = startOfDayBR(de)
    const fimIso = startOfDayBR(addDaysBR(ate, 1))
    const [pagos, ger] = await Promise.all([
      sb.from('commission_payments')
        .select('paid_amount, bonus_amount')
        .eq('business_id', business.id)
        .gte('paid_at', de)
        .lte('paid_at', ate + 'T23:59:59'),
      comissoesGeradas(sb, business.id, inicioIso, fimIso),
    ])
    pagosRegistrados = (pagos.data ?? []).reduce((s, c) => s + Number(c.paid_amount ?? 0) + Number(c.bonus_amount ?? 0), 0)
    geradas = ger
  }
  const comissaoGerada = Math.round(geradas.reduce((s, x) => s + x.valor, 0) * 100) / 100
  const comissoesPagasRegistradas = pagaNoAtendimento ? Math.max(pagosRegistrados, comissaoGerada) : pagosRegistrados
  const comissaoDoPeriodo = Math.max(comissaoGerada, comissoesPagasRegistradas)
  const comissaoAPagar = Math.round((comissaoDoPeriodo - comissoesPagasRegistradas) * 100) / 100
  const despesasPagas = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0) + comissoesPagasRegistradas

  return {
    expenses,
    usaComissaoNoFluxo,
    pagaNoAtendimento,
    geradas,
    comissaoGerada,
    comissoesPagasRegistradas,
    comissaoDoPeriodo,
    comissaoAPagar,
    despesasPagas,
  }
}
