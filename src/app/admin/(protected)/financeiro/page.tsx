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

  // Queries em paralelo · range atual + range anterior + créditos
  const [
    apptsCur,
    apptsPrev,
    expensesCur,
    expensesPrev,
    creditsRes,
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
  ])

  const appointments = apptsCur.data ?? []
  const prevAppts = apptsPrev.data ?? []
  const expenses = expensesCur.data ?? []
  const prevExpenses = expensesPrev.data ?? []
  const credits = creditsRes.data ?? []

  // Cálculos
  const valorRecebido = appointments
    .filter((a) => a.paid_at)
    .reduce((s, a) => s + Number(a.total_price ?? 0), 0)
  const prevValorRecebido = prevAppts
    .filter((a) => a.paid_at)
    .reduce((s, a) => s + Number(a.total_price ?? 0), 0)

  const valorProgramado = appointments
    .filter((a) => !a.paid_at && a.status !== 'cancelled')
    .reduce((s, a) => s + Number(a.total_price ?? 0), 0)

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

  const creditosTotal = credits
    .filter((c) => !c.used_in_invoice_id)
    .reduce((s, c) => s + Number(c.amount ?? 0), 0)

  // Donut · formas de pagamento
  const methodTotals = new Map<string, number>()
  for (const a of appointments) {
    if (!a.paid_at) continue
    const m = (a.payment_method as string) ?? 'other'
    methodTotals.set(m, (methodTotals.get(m) ?? 0) + Number(a.total_price ?? 0))
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
    for (const a of prevAppts) {
      if (!a.paid_at) continue
      const h = new Date(a.paid_at).getHours()
      buckets[h].previous += Number(a.total_price ?? 0)
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
    { label: 'Despesas pagas', value: despesasPagas, previous: prevDespesasPagas, tone: 'negative' as const, format: 'currency' as const },
    { label: 'Lucro líquido', value: lucroLiquido, previous: prevLucroLiquido, tone: 'primary' as const, format: 'currency' as const },
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
