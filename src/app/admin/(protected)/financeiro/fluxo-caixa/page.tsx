import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'
import SubPageHeader from '@/components/admin/SubPageHeader'
import FluxoCaixaTable, { type CashMonth, type MonthCol } from '@/components/admin/financeiro/FluxoCaixaTable'

const METHOD_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  credit: 'Cartão de Crédito',
  credit_card: 'Cartão de Crédito',
  debit: 'Cartão de Débito',
  debit_card: 'Cartão de Débito',
  transfer: 'Transferência Bancária',
  other: 'Outro',
}

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Aluguel',
  products: 'Produtos',
  salary: 'Salários',
  utilities: 'Contas (água · luz · internet)',
  marketing: 'Marketing',
  taxes: 'Impostos',
  other: 'Outros',
}

function monthLabel(year: number, month0: number): string {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${months[month0]}/${String(year).slice(2)}`
}

export default async function FluxoCaixaPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect('/cadastro')

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // 4 últimos meses (atual + 3 anteriores)
  const now = new Date()
  const currentY = now.getFullYear()
  const currentM = now.getMonth()
  const months: MonthCol[] = []
  for (let i = 3; i >= 0; i--) {
    const d = new Date(currentY, currentM - i, 1)
    months.push({
      year: d.getFullYear(),
      month0: d.getMonth(),
      label: monthLabel(d.getFullYear(), d.getMonth()),
      key: `${d.getFullYear()}-${d.getMonth()}`,
    })
  }

  const fullRangeFrom = new Date(Date.UTC(months[0].year, months[0].month0, 1))
  const fullRangeTo = new Date(Date.UTC(currentY, currentM + 1, 1))
  const startOfPeriod = fullRangeFrom.toISOString()
  const fullRangeFromDate = fullRangeFrom.toISOString().slice(0, 10)
  const fullRangeToDate = fullRangeTo.toISOString().slice(0, 10)

  const [
    { data: paidAppts },
    { data: expensesData },
    { data: priorR },
    { data: priorD },
  ] = await Promise.all([
    sb
      .from('appointments')
      .select('paid_at, total_price, payment_method')
      .eq('business_id', business.id)
      .gte('paid_at', fullRangeFrom.toISOString())
      .lt('paid_at', fullRangeTo.toISOString())
      .not('paid_at', 'is', null),
    sb
      .from('expenses')
      .select('occurred_at, amount, category')
      .eq('business_id', business.id)
      .gte('occurred_at', fullRangeFromDate)
      .lt('occurred_at', fullRangeToDate),
    sb
      .from('appointments')
      .select('total_price')
      .eq('business_id', business.id)
      .lt('paid_at', startOfPeriod)
      .not('paid_at', 'is', null),
    sb
      .from('expenses')
      .select('amount')
      .eq('business_id', business.id)
      .lt('occurred_at', fullRangeFromDate),
  ])

  const priorReceitas = (priorR ?? []).reduce((s, a) => s + Number(a.total_price ?? 0), 0)
  const priorDespesas = (priorD ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const saldoAcumulado = priorReceitas - priorDespesas

  // Inicializa map por mês
  const data: Record<string, CashMonth> = {}
  for (const m of months) {
    data[m.key] = {
      saldoInicial: 0,
      receitasByMethod: {},
      receitasTotal: 0,
      despesasByCategory: {},
      despesasTotal: 0,
      resultado: 0,
      saldoFinal: 0,
    }
  }

  // Receitas por mês + método
  for (const a of paidAppts ?? []) {
    if (!a.paid_at) continue
    const d = new Date(a.paid_at)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const row = data[key]
    if (!row) continue
    const method = (a.payment_method as string | null) ?? 'other'
    const amt = Number(a.total_price ?? 0)
    row.receitasByMethod[method] = (row.receitasByMethod[method] ?? 0) + amt
    row.receitasTotal += amt
  }

  // Despesas por mês + categoria
  for (const e of expensesData ?? []) {
    if (!e.occurred_at) continue
    const d = new Date(e.occurred_at + 'T00:00:00')
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const row = data[key]
    if (!row) continue
    const cat = (e.category as string | null) ?? 'other'
    const amt = Number(e.amount ?? 0)
    row.despesasByCategory[cat] = (row.despesasByCategory[cat] ?? 0) + amt
    row.despesasTotal += amt
  }

  // Calcula saldo encadeado
  let acc = saldoAcumulado
  for (const m of months) {
    const row = data[m.key]
    row.saldoInicial = acc
    row.resultado = row.receitasTotal - row.despesasTotal
    row.saldoFinal = row.saldoInicial + row.resultado
    acc = row.saldoFinal
  }

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <div className="relative">
        <SubPageHeader title="Fluxo de Caixa" subtitle={business.name} back="/admin/financeiro" />
        <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-7xl lg:px-8">
          {/* Toggle de visão · só Mensal por enquanto */}
          <div className="mb-4">
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-70"
              style={{
                background: 'var(--admin-surface)',
                color: 'var(--admin-text)',
                border: '1px solid var(--admin-border)',
              }}
              title="Visão Diária · Semanal · Anual vêm na próxima etapa"
            >
              Visão Mensal
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          <FluxoCaixaTable
            months={months}
            data={data}
            methodLabels={METHOD_LABELS}
            categoryLabels={CATEGORY_LABELS}
          />

          {/* Hint */}
          <p className="text-[11px] mt-3 text-center" style={{ color: 'var(--admin-text-faded)' }}>
            Clica em <b>Receitas</b> ou <b>Despesas</b> pra ver breakdown por método/categoria · Saldo Inicial = Saldo Final do mês anterior
          </p>
        </div>
      </div>
    </main>
  )
}
