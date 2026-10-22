import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubPageHeader from '@/components/admin/SubPageHeader'
import FinanceiroView, { type AppointmentRow } from '@/components/admin/FinanceiroView'
import DashboardFinanceiro from '@/components/admin/financeiro/DashboardFinanceiro'
import ComposicaoLiquido, { type Composicao } from '@/components/admin/financeiro/ComposicaoLiquido'
import { comissaoPorProfissional } from '@/lib/comissao-gerada'
import { todayBR } from '@/lib/date-br'
import { receitaDoPeriodo, despesasDoPeriodo } from '@/lib/financeiro/resumo-do-periodo'
import { negocioDoPainel } from '@/lib/admin-data'

const CATEGORY_LABEL: Record<string, string> = {
  rent: 'Aluguel',
  products: 'Produtos',
  salary: 'Salários',
  utilities: 'Contas',
  marketing: 'Marketing',
  taxes: 'Impostos',
  other: 'Outros',
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  credit: 'Cartão de Crédito',
  credit_card: 'Cartão de Crédito',
  debit: 'Cartão de Débito',
  debit_card: 'Cartão de Débito',
  card: 'Cartão',
  transfer: 'Transferência',
  other: 'Não classificado',
  null: 'Não classificado',
}

const METHOD_COLORS: Record<string, string> = {
  cash: '#10B981',
  pix: '#01A197',
  credit: '#3B82F6',
  credit_card: '#3B82F6',
  debit: '#8B5CF6',
  debit_card: '#8B5CF6',
  card: '#3B82F6',
  transfer: '#F59E0B',
  other: '#6B7280',
}

const CATEGORY_COLORS: Record<string, string> = {
  rent: '#EF4444',
  products: '#F59E0B',
  salary: '#3B82F6',
  utilities: '#8B5CF6',
  marketing: '#EC4899',
  taxes: '#10B981',
  other: '#6B7280',
}

type Periodo = 'hoje' | 'semana' | 'mes' | 'custom'

/** Teto do intervalo escolhido na mão · 1 ano. Acima disso a query e o gráfico
 *  deixam de fazer sentido na tela, e cai no padrão de 30 dias. */
const MAX_DIAS_CUSTOM = 366

function dateRange(periodo: Periodo, de?: string, ate?: string): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  // λ.fuso: TUDO ancorado ao meio-dia UTC do dia BR. Quem consome essas datas
  // usa toISOString().slice(0,10), e do meio-dia nenhuma conversão de fuso
  // cruza a fronteira do dia.
  //
  // ⚠️ Não usar setHours pra "fechar o dia": setHours é do fuso do RUNTIME.
  // Em máquina no horário de Brasília, `setHours(23,59)` vira 02:59 UTC do dia
  // SEGUINTE e o fim do período anda um dia — provado em 13/09/2026 no teste
  // local (06/07 a 06/07 trouxe R$ 2.820 em vez de R$ 1.105, porque somou 07/07).
  // Em UTC o bug fica escondido, então é armadilha esperando mudança de host.
  const today = new Date(todayBR() + 'T12:00:00Z')
  let start: Date, end: Date
  if (periodo === 'custom' && de && ate) {
    start = new Date(de + 'T12:00:00Z')
    end = new Date(ate + 'T12:00:00Z')
  } else if (periodo === 'hoje') {
    start = new Date(today)
    end = today
  } else if (periodo === 'semana') {
    start = new Date(today.getTime() - 6 * 86400000)
    end = today
  } else {
    start = new Date(today.getTime() - 29 * 86400000)
    end = today
  }
  const periodMs = end.getTime() - start.getTime()
  const prevEnd = new Date(start.getTime() - 1)
  const prevStart = new Date(prevEnd.getTime() - periodMs)
  return { start, end, prevStart, prevEnd }
}

function bucketLabel(d: Date, periodo: Periodo): string {
  if (periodo === 'hoje') return `${String(d.getHours()).padStart(2, '0')}h`
  if (periodo === 'semana') return d.toLocaleDateString('pt-BR', { weekday: 'short' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; de?: string; ate?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', await negocioDoPainel(user.id))
    .single()

  if (!business) redirect(await destinoSemNegocio())

  const { periodo: periodoParam, de: deParam, ate: ateParam } = await searchParams

  // Período escolhido na mão (pedido da Letícia · Viva Cacheada, 06/08/2026).
  // Só vale com as duas datas no formato certo, na ordem certa, sem futuro e
  // com no máximo 1 ano. Qualquer desvio cai nos 30 dias padrão em vez de
  // quebrar a tela — data vem da URL, então qualquer coisa pode chegar aqui.
  const YMD = /^\d{4}-\d{2}-\d{2}$/
  const hojeBR = todayBR()
  const deOk = deParam && YMD.test(deParam) ? deParam : null
  const ateBruto = ateParam && YMD.test(ateParam) ? ateParam : null
  const ateOk = ateBruto && ateBruto > hojeBR ? hojeBR : ateBruto
  const diasEscolhidos =
    deOk && ateOk
      ? Math.round((Date.parse(ateOk + 'T12:00:00Z') - Date.parse(deOk + 'T12:00:00Z')) / 86400000) + 1
      : 0
  const customOk = !!deOk && !!ateOk && deOk <= ateOk && diasEscolhidos <= MAX_DIAS_CUSTOM

  const periodoNorm: Periodo = customOk
    ? 'custom'
    : periodoParam === 'hoje' || periodoParam === 'semana'
      ? periodoParam
      : 'mes'

  const { start, end, prevStart, prevEnd } = dateRange(periodoNorm, deOk ?? undefined, ateOk ?? undefined)
  const startStr = start.toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)
  const prevStartStr = prevStart.toISOString().slice(0, 10)
  const prevEndStr = prevEnd.toISOString().slice(0, 10)

  /* 21/10/2026 · receita e despesas saem de lib/financeiro/resumo-do-periodo,
     a MESMA conta pros dois períodos (antes o anterior era somado por outra
     regra e o "% vs anterior" não comparava igual com igual) e pra tela
     "Pergunte ao seu negócio". Mudou a conta? Muda lá, nunca aqui. */
  const [cur, prev, despCur, despPrev, creditsRes] = await Promise.all([
    receitaDoPeriodo(supabase, business.id, startStr, endStr),
    receitaDoPeriodo(supabase, business.id, prevStartStr, prevEndStr),
    despesasDoPeriodo(supabase, business, startStr, endStr),
    despesasDoPeriodo(supabase, business, prevStartStr, prevEndStr),
    supabase
      .from('customer_credits')
      .select('amount, used_in_invoice_id')
      .eq('business_id', business.id),
  ])

  const appointments = cur.appointments
  const prevAppts = prev.appointments
  const productSales = cur.productSales
  const prevProductSales = prev.productSales
  const expenses = despCur.expenses
  const credits = creditsRes.data ?? []
  const paidAppts = cur.paidAppts
  const { valorRecebidoAppts, valorRecebidoSales, valorPacotes, valorRecebido, valorProgramado, qtdAtendimentos, ticketMedio, totalTaxas } = cur
  const sinalDeFora = cur.sinalDeFora
  const prevValorRecebido = prev.valorRecebido
  const prevQtdAtendimentos = prev.qtdAtendimentos
  const prevTicketMedio = prev.ticketMedio

  const { usaComissaoNoFluxo, pagaNoAtendimento, comissoesPagasRegistradas, comissaoDoPeriodo, comissaoAPagar, despesasPagas } = despCur
  const geradasPeriodo = despCur.geradas
  const prevDespesasPagas = despPrev.despesasPagas
  // Só despesa paga é lida (v104), então pendente é sempre 0 aqui.
  const despesasPendentes = 0

  const lucroLiquido = valorRecebido - despesasPagas - comissaoAPagar
  const prevLucroLiquido = prevValorRecebido - prevDespesasPagas - despPrev.comissaoAPagar

  const creditosTotal = credits
    .filter((c) => !c.used_in_invoice_id)
    .reduce((s, c) => s + Number(c.amount ?? 0), 0)

  // Top Profissionais (por receita gerada no período) · soma appts + produtos
  type ProfAgg = { id: string; name: string; total: number; count: number }
  const profMap = new Map<string, ProfAgg>()
  for (const a of paidAppts) {
    const prof = a.professional
    const pInfo = Array.isArray(prof) ? prof[0] : prof
    if (!pInfo || !pInfo.id) continue
    const cur = profMap.get(pInfo.id) ?? { id: pInfo.id, name: pInfo.name ?? '—', total: 0, count: 0 }
    cur.total += Number(a.total_price ?? 0)
    cur.count += 1
    profMap.set(pInfo.id, cur)
  }
  for (const s of productSales) {
    const prof = s.professional
    const pInfo = Array.isArray(prof) ? prof[0] : prof
    if (!pInfo || !pInfo.id) continue
    const cur = profMap.get(pInfo.id) ?? { id: pInfo.id, name: pInfo.name ?? '—', total: 0, count: 0 }
    cur.total += Number(s.total ?? 0)
    cur.count += 1
    profMap.set(pInfo.id, cur)
  }
  const topProfissionais = Array.from(profMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // Top Serviços + Produtos (por receita) · produtos ganham prefixo "Produto:"
  const servMap = new Map<string, ProfAgg>()
  for (const a of paidAppts) {
    const name = (a.service_name as string) ?? 'Sem nome'
    const key = name
    const cur = servMap.get(key) ?? { id: key, name, total: 0, count: 0 }
    cur.total += Number(a.total_price ?? 0)
    cur.count += 1
    servMap.set(key, cur)
  }
  for (const s of productSales) {
    const items = (s.sale_items ?? []) as { product_name?: string; quantity?: number; unit_price?: number }[]
    for (const it of items) {
      const baseName = it.product_name ?? 'Produto'
      const key = `prod:${baseName}`
      const cur = servMap.get(key) ?? { id: key, name: `Produto · ${baseName}`, total: 0, count: 0 }
      cur.total += Number(it.unit_price ?? 0) * Number(it.quantity ?? 0)
      cur.count += 1
      servMap.set(key, cur)
    }
  }
  const topServicos = Array.from(servMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // Donut · formas de pagamento · soma appts + produtos
  const methodTotals = new Map<string, number>()
  // Cartão é gravado como 'card' + payment_card_type (credit/debit): separa igual ao
  // painel do celular. Sem o tipo informado, fica "Cartão" (antes aparecia "card" cru).
  const metodo = (m: string | null | undefined, tipo: string | null | undefined) =>
    m === 'card' && (tipo === 'credit' || tipo === 'debit') ? tipo : (m ?? 'other')
  for (const a of appointments) {
    if (!a.paid_at) continue
    const m = metodo(a.payment_method as string, a.payment_card_type as string)
    methodTotals.set(m, (methodTotals.get(m) ?? 0) + Number(a.total_price ?? 0))
  }
  for (const s of productSales) {
    const m = metodo(s.payment_method as string, s.payment_card_type as string)
    methodTotals.set(m, (methodTotals.get(m) ?? 0) + Number(s.total ?? 0))
  }
  const formasPagamento = Array.from(methodTotals.entries())
    .map(([key, value]) => ({
      label: METHOD_LABEL[key] ?? key,
      value,
      color: METHOD_COLORS[key] ?? '#6B7280',
    }))
    .sort((a, b) => b.value - a.value)

  // Donut · despesas por categoria
  const categoryTotals = new Map<string, number>()
  for (const e of expenses) {
    const cat = (e.category as string) ?? 'other'
    categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + Number(e.amount ?? 0))
  }
  const principaisDespesas = Array.from(categoryTotals.entries())
    .map(([key, value]) => ({
      label: CATEGORY_LABEL[key] ?? key,
      value,
      color: CATEGORY_COLORS[key] ?? '#6B7280',
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  // Comparativo · buckets por dia (mes/semana) ou hora (hoje)
  const buckets: { label: string; current: number; previous: number; date: string }[] = []
  if (periodoNorm === 'hoje') {
    // 24 horas
    for (let h = 0; h < 24; h++) {
      buckets.push({ label: `${String(h).padStart(2, '0')}h`, current: 0, previous: 0, date: String(h) })
    }
    for (const a of appointments) {
      if (!a.paid_at) continue
      const h = new Date(new Date(a.paid_at).getTime() - 3 * 60 * 60 * 1000).getUTCHours() // λ.fuso: hora BR
      buckets[h].current += Number(a.total_price ?? 0)
    }
    for (const s of productSales) {
      if (!s.paid_at) continue
      const h = new Date(new Date(s.paid_at as string).getTime() - 3 * 60 * 60 * 1000).getUTCHours() // λ.fuso: hora BR
      if (buckets[h]) buckets[h].current += Number(s.total ?? 0)
    }
    for (const a of prevAppts) {
      if (!a.paid_at) continue
      const h = new Date(new Date(a.paid_at).getTime() - 3 * 60 * 60 * 1000).getUTCHours() // λ.fuso: hora BR
      buckets[h].previous += Number(a.total_price ?? 0)
    }
    for (const s of prevProductSales) {
      if (!s.paid_at) continue
      const h = new Date(new Date(s.paid_at as string).getTime() - 3 * 60 * 60 * 1000).getUTCHours() // λ.fuso: hora BR
      if (buckets[h]) buckets[h].previous += Number(s.total ?? 0)
    }
  } else {
    // Uma barra por dia. Em janela longa (só acontece no período escolhido na
    // mão) agrupa de 7 em 7, senão um ano vira 366 barras ilegíveis.
    const DIA_MS = 86400000
    const startYmd = start.toISOString().slice(0, 10)
    const endYmd = end.toISOString().slice(0, 10)
    const prevStartYmd = prevStart.toISOString().slice(0, 10)
    const diasNoRange =
      Math.round((Date.parse(endYmd + 'T12:00:00Z') - Date.parse(startYmd + 'T12:00:00Z')) / DIA_MS) + 1
    const passo = diasNoRange > 60 ? 7 : 1
    const qtdBuckets = Math.max(1, Math.ceil(diasNoRange / passo))

    for (let i = 0; i < qtdBuckets; i++) {
      const d = new Date(Date.parse(startYmd + 'T12:00:00Z') + i * passo * DIA_MS)
      buckets.push({
        label: bucketLabel(d, periodoNorm),
        current: 0,
        previous: 0,
        date: d.toISOString().slice(0, 10),
      })
    }

    // Posição da data no gráfico, contada a partir do 1º dia da janela. O
    // período anterior usa a MESMA conta a partir do 1º dia dele, pra "dia 1"
    // ficar em cima de "dia 1" (era o que o mapa de datas fazia antes).
    const posicao = (ymd: string, baseYmd: string): number => {
      const delta = Math.round((Date.parse(ymd + 'T12:00:00Z') - Date.parse(baseYmd + 'T12:00:00Z')) / DIA_MS)
      if (delta < 0) return -1
      const i = Math.floor(delta / passo)
      return i < buckets.length ? i : -1
    }

    for (const a of appointments) {
      if (!a.paid_at) continue
      const i = posicao(a.appointment_date as string, startYmd)
      if (i >= 0) buckets[i].current += Number(a.total_price ?? 0)
    }
    for (const a of prevAppts) {
      if (!a.paid_at) continue
      const i = posicao(a.appointment_date as string, prevStartYmd)
      if (i >= 0) buckets[i].previous += Number(a.total_price ?? 0)
    }
  }

  // Do bruto ao líquido · fecha no mesmo lucroLiquido do card (Izanara 02/10)
  const composicao: Composicao = {
    servicos: valorRecebidoAppts,
    qtdServicos: paidAppts.length,
    produtos: valorRecebidoSales,
    qtdProdutos: productSales.length,
    outros: sinalDeFora + valorPacotes,
    bruto: valorRecebido,
    comissoes: usaComissaoNoFluxo
      ? {
          total: comissaoDoPeriodo,
          pago: comissoesPagasRegistradas,
          pagaNoAtendimento,
          porProfissional: comissaoPorProfissional(geradasPeriodo),
        }
      : null,
    despesas: despesasPagas - comissoesPagasRegistradas,
    lucroLiquido,
    taxas: totalTaxas,
  }

  const kpis = [
    { label: 'Valor recebido', value: valorRecebido, previous: prevValorRecebido, tone: 'positive' as const, format: 'currency' as const },
    { label: 'A receber', value: valorProgramado, previous: 0, tone: 'neutral' as const, format: 'currency' as const },
    { label: 'Despesas pagas', value: despesasPagas, previous: prevDespesasPagas, tone: 'negative' as const, format: 'currency' as const },
    ...(usaComissaoNoFluxo && !pagaNoAtendimento
      ? [{ label: 'Comissão a pagar', value: comissaoAPagar, previous: 0, tone: 'negative' as const, format: 'currency' as const }]
      : []),
    { label: 'Lucro líquido', value: lucroLiquido, previous: prevLucroLiquido, tone: 'primary' as const, format: 'currency' as const },
    { label: 'Atendimentos', value: qtdAtendimentos, previous: prevQtdAtendimentos, tone: 'neutral' as const, format: 'count' as const },
    { label: 'Ticket médio', value: ticketMedio, previous: prevTicketMedio, tone: 'primary' as const, format: 'currency' as const },
    { label: 'Taxas cartão/Pix', value: totalTaxas, previous: 0, tone: 'negative' as const, format: 'currency' as const },
    { label: 'Créditos pendentes', value: creditosTotal, previous: 0, tone: 'neutral' as const, format: 'currency' as const },
  ]

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <div className="relative">
        <SubPageHeader title="Financeiro" subtitle={business.name} />
        <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-7xl lg:px-8">
          {/* DESKTOP · Dashboard estilo Salão99 */}
          <div className="hidden lg:block">
            <DashboardFinanceiro
              periodo={periodoNorm}
              de={deOk ?? undefined}
              ate={ateOk ?? undefined}
              kpis={kpis}
              formasPagamento={formasPagamento}
              principaisDespesas={principaisDespesas}
              comparativo={buckets}
              comparativoTotals={{
                valor_recebido: valorRecebido,
                despesas_pagas: despesasPagas,
                valor_programado: valorProgramado,
                despesas_pendentes: despesasPendentes,
              }}
              taxasBreakdown={
                totalTaxas > 0
                  ? { bruto: valorRecebido, taxas: totalTaxas, liquido: valorRecebido - totalTaxas }
                  : undefined
              }
              topProfissionais={topProfissionais}
              topServicos={topServicos}
              composicao={composicao}
            />
          </div>

          {/* MOBILE · view antiga preservada */}
          <div className="lg:hidden">
            <FinanceiroView
              appointments={(appointments || []) as unknown as AppointmentRow[]}
              periodo={periodoNorm}
              totalExpenses={despesasPagas + comissaoAPagar}
              outrosRecebidos={sinalDeFora + valorPacotes}
            />
            <div className="mt-4">
              <ComposicaoLiquido c={composicao} />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
