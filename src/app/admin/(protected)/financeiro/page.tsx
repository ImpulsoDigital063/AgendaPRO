import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubPageHeader from '@/components/admin/SubPageHeader'
import FinanceiroView, { type AppointmentRow } from '@/components/admin/FinanceiroView'
import DashboardFinanceiro from '@/components/admin/financeiro/DashboardFinanceiro'

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

function dateRange(periodo: 'hoje' | 'semana' | 'mes'): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  let start: Date, end: Date
  if (periodo === 'hoje') {
    start = new Date(today)
    start.setHours(0, 0, 0, 0)
    end = today
  } else if (periodo === 'semana') {
    start = new Date(today)
    start.setDate(start.getDate() - 6)
    start.setHours(0, 0, 0, 0)
    end = today
  } else {
    start = new Date(today)
    start.setDate(start.getDate() - 29)
    start.setHours(0, 0, 0, 0)
    end = today
  }
  const periodMs = end.getTime() - start.getTime()
  const prevEnd = new Date(start.getTime() - 1)
  const prevStart = new Date(prevEnd.getTime() - periodMs)
  return { start, end, prevStart, prevEnd }
}

function bucketLabel(d: Date, periodo: 'hoje' | 'semana' | 'mes'): string {
  if (periodo === 'hoje') return `${String(d.getHours()).padStart(2, '0')}h`
  if (periodo === 'semana') return d.toLocaleDateString('pt-BR', { weekday: 'short' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!business) redirect('/cadastro')

  const { periodo: periodoParam } = await searchParams
  const periodoNorm: 'hoje' | 'semana' | 'mes' =
    periodoParam === 'hoje' || periodoParam === 'semana' ? periodoParam : 'mes'

  const { start, end, prevStart, prevEnd } = dateRange(periodoNorm)
  const startStr = start.toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)
  const prevStartStr = prevStart.toISOString().slice(0, 10)
  const prevEndStr = prevEnd.toISOString().slice(0, 10)

  // Queries em paralelo · range atual + range anterior + créditos + vendas de produto
  const [
    apptsCur,
    apptsPrev,
    expensesCur,
    expensesPrev,
    creditsRes,
    productSalesCur,
    productSalesPrev,
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select(`
        id, client_name, client_phone, appointment_date, start_time,
        status, service_name, total_price, paid_at, payment_method,
        payment_card_type, payment_card_brand, payment_fee_percent, payment_installments,
        professional:professionals(id, name, commission_percentage, employment_type)
      `)
      .eq('business_id', business.id)
      .gte('appointment_date', startStr)
      .lte('appointment_date', endStr)
      .order('appointment_date', { ascending: false }),
    supabase
      .from('appointments')
      .select('total_price, paid_at, payment_method, status, appointment_date')
      .eq('business_id', business.id)
      .gte('appointment_date', prevStartStr)
      .lte('appointment_date', prevEndStr),
    supabase
      .from('expenses')
      .select('amount, category, paid_at, occurred_at')
      .eq('business_id', business.id)
      .gte('occurred_at', startStr)
      .lte('occurred_at', endStr),
    supabase
      .from('expenses')
      .select('amount, paid_at')
      .eq('business_id', business.id)
      .gte('occurred_at', prevStartStr)
      .lte('occurred_at', prevEndStr),
    supabase
      .from('customer_credits')
      .select('amount, used_in_invoice_id')
      .eq('business_id', business.id),
    // Vendas de produto pagas no range atual · soma na receita + KPIs (exclui cortesia)
    supabase
      .from('sales')
      .select(`
        id, sale_date, total, paid_at, payment_method, professional_id,
        professional:professionals(id, name),
        sale_items(product_name, quantity, unit_price)
      `)
      .eq('business_id', business.id)
      .eq('type', 'product_sale')
      .eq('status', 'paid')
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('sale_date', startStr)
      .lte('sale_date', endStr),
    supabase
      .from('sales')
      .select('total, sale_date, paid_at, payment_method')
      .eq('business_id', business.id)
      .eq('type', 'product_sale')
      .eq('status', 'paid')
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('sale_date', prevStartStr)
      .lte('sale_date', prevEndStr),
  ])

  const appointments = apptsCur.data ?? []
  const prevAppts = apptsPrev.data ?? []
  const expenses = expensesCur.data ?? []
  const prevExpenses = expensesPrev.data ?? []
  const credits = creditsRes.data ?? []
  const productSales = productSalesCur.data ?? []
  const prevProductSales = productSalesPrev.data ?? []

  // Cálculos · receita = appointments pagos + vendas de produto pagas
  // Receita real exclui cortesia (bonificação não conta como faturamento)
  const paidAppts = appointments.filter((a) => a.paid_at && a.payment_method !== 'courtesy' && a.payment_method !== 'credit')
  const valorRecebidoAppts = paidAppts.reduce((s, a) => s + Number(a.total_price ?? 0), 0)
  const valorRecebidoSales = productSales.reduce((s, p) => s + Number(p.total ?? 0), 0)
  const valorRecebido = valorRecebidoAppts + valorRecebidoSales
  const prevPaid = prevAppts.filter((a) => a.paid_at)
  const prevValorRecebidoAppts = prevPaid.reduce((s, a) => s + Number(a.total_price ?? 0), 0)
  const prevValorRecebidoSales = prevProductSales.reduce((s, p) => s + Number(p.total ?? 0), 0)
  const prevValorRecebido = prevValorRecebidoAppts + prevValorRecebidoSales

  const naoPagos = appointments.filter((a) => !a.paid_at && a.status !== 'cancelled')
  const valorProgramado = naoPagos.reduce((s, a) => s + Number(a.total_price ?? 0), 0)

  const qtdAtendimentos = paidAppts.length
  const prevQtdAtendimentos = prevPaid.length
  const ticketMedio = qtdAtendimentos > 0 ? valorRecebido / qtdAtendimentos : 0
  const prevTicketMedio = prevQtdAtendimentos > 0 ? prevValorRecebido / prevQtdAtendimentos : 0

  const despesasPagas = expenses
    .filter((e) => e.paid_at)
    .reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const prevDespesasPagas = prevExpenses
    .filter((e) => e.paid_at)
    .reduce((s, e) => s + Number(e.amount ?? 0), 0)

  const despesasPendentes = expenses
    .filter((e) => !e.paid_at)
    .reduce((s, e) => s + Number(e.amount ?? 0), 0)

  const lucroLiquido = valorRecebido - despesasPagas
  const prevLucroLiquido = prevValorRecebido - prevDespesasPagas

  // Taxas (cartão crédito/débito · fee_percent)
  const totalTaxas = paidAppts.reduce((s, a) => {
    const pct = Number(a.payment_fee_percent ?? 0)
    const price = Number(a.total_price ?? 0)
    return s + (price * pct) / 100
  }, 0)
  const lucroPosTaxas = lucroLiquido - totalTaxas

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
  for (const a of appointments) {
    if (!a.paid_at) continue
    const m = (a.payment_method as string) ?? 'other'
    methodTotals.set(m, (methodTotals.get(m) ?? 0) + Number(a.total_price ?? 0))
  }
  for (const s of productSales) {
    const m = (s.payment_method as string) ?? 'other'
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
      const h = new Date(a.paid_at).getHours()
      buckets[h].current += Number(a.total_price ?? 0)
    }
    for (const s of productSales) {
      if (!s.paid_at) continue
      const h = new Date(s.paid_at as string).getHours()
      if (buckets[h]) buckets[h].current += Number(s.total ?? 0)
    }
    for (const a of prevAppts) {
      if (!a.paid_at) continue
      const h = new Date(a.paid_at).getHours()
      buckets[h].previous += Number(a.total_price ?? 0)
    }
    for (const s of prevProductSales) {
      if (!s.paid_at) continue
      const h = new Date(s.paid_at as string).getHours()
      if (buckets[h]) buckets[h].previous += Number(s.total ?? 0)
    }
  } else {
    const days = periodoNorm === 'semana' ? 7 : 30
    for (let i = 0; i < days; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      buckets.push({
        label: bucketLabel(d, periodoNorm),
        current: 0,
        previous: 0,
        date: d.toISOString().slice(0, 10),
      })
    }
    const bucketByDate = new Map(buckets.map((b) => [b.date, b]))
    for (const a of appointments) {
      if (!a.paid_at) continue
      const d = a.appointment_date as string
      const b = bucketByDate.get(d)
      if (b) b.current += Number(a.total_price ?? 0)
    }
    // Mapeia datas anteriores pra mesma posição (alinha "dia 1 anterior" com "dia 1 atual")
    const prevDates = new Map<string, number>()
    for (let i = 0; i < days; i++) {
      const d = new Date(prevStart)
      d.setDate(d.getDate() + i)
      prevDates.set(d.toISOString().slice(0, 10), i)
    }
    for (const a of prevAppts) {
      if (!a.paid_at) continue
      const d = a.appointment_date as string
      const idx = prevDates.get(d)
      if (idx !== undefined && buckets[idx]) {
        buckets[idx].previous += Number(a.total_price ?? 0)
      }
    }
  }

  const kpis = [
    { label: 'Valor recebido', value: valorRecebido, previous: prevValorRecebido, tone: 'positive' as const, format: 'currency' as const },
    { label: 'A receber', value: valorProgramado, previous: 0, tone: 'neutral' as const, format: 'currency' as const },
    { label: 'Despesas pagas', value: despesasPagas, previous: prevDespesasPagas, tone: 'negative' as const, format: 'currency' as const },
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
            />
          </div>

          {/* MOBILE · view antiga preservada */}
          <div className="lg:hidden">
            <FinanceiroView
              appointments={(appointments || []) as unknown as AppointmentRow[]}
              periodo={periodoNorm}
              totalExpenses={despesasPagas}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
