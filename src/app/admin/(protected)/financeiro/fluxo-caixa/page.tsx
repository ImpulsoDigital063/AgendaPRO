import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'
import SubPageHeader from '@/components/admin/SubPageHeader'
import FluxoCaixaTable, { type CashMonth, type MonthCol } from '@/components/admin/financeiro/FluxoCaixaTable'
import FluxoCaixaViewSelector from '@/components/admin/financeiro/FluxoCaixaViewSelector'

// Source of truth do breakdown:
// - invoice_payments cobre split + comanda (cada linha = 1 método com amount próprio)
// - appointments DIRETOS (invoice_item_id IS NULL) cobrem pagamento direto da timeline
// - sales DIRETAS (invoice_id IS NULL) cobrem venda avulsa de produto
// Antes a query usava só appointments.payment_method, que perdia o cartão em split
// (a rota /invoices/[id]/pay propaga só o MAIOR método pro appointment).

const METHOD_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  card: 'Cartão',
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
  payment_fee: 'Taxa de Maquininha',
}

type ViewKind = 'daily' | 'weekly' | 'monthly' | 'yearly'

function isViewKind(v: string | undefined | null): v is ViewKind {
  return v === 'daily' || v === 'weekly' || v === 'monthly' || v === 'yearly'
}

function buildColumns(view: ViewKind, now: Date): MonthCol[] {
  const cols: MonthCol[] = []
  if (view === 'daily') {
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const dateLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      cols.push({
        year: d.getFullYear(),
        month0: d.getMonth(),
        label: dateLabel,
        key: `d:${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
      })
    }
    return cols
  }
  if (view === 'weekly') {
    const monday = new Date(now)
    const day = monday.getDay()
    const diff = day === 0 ? -6 : 1 - day
    monday.setDate(monday.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
    for (let i = 11; i >= 0; i--) {
      const start = new Date(monday)
      start.setDate(start.getDate() - i * 7)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      const label = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}–${String(end.getDate()).padStart(2, '0')}/${String(end.getMonth() + 1).padStart(2, '0')}`
      cols.push({
        year: start.getFullYear(),
        month0: start.getMonth(),
        label,
        key: `w:${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`,
      })
    }
    return cols
  }
  if (view === 'yearly') {
    for (let i = 3; i >= 0; i--) {
      const y = now.getFullYear() - i
      cols.push({ year: y, month0: 0, label: String(y), key: `y:${y}` })
    }
    return cols
  }
  // monthly
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  for (let i = 3; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    cols.push({
      year: d.getFullYear(),
      month0: d.getMonth(),
      label: `${months[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      key: `m:${d.getFullYear()}-${d.getMonth()}`,
    })
  }
  return cols
}

function buildRange(view: ViewKind, cols: MonthCol[], now: Date): { from: Date; to: Date } {
  if (view === 'daily') {
    const first = new Date(cols[0].year, cols[0].month0, parseInt(cols[0].key.split('-')[2]!, 10))
    first.setHours(0, 0, 0, 0)
    const to = new Date(now)
    to.setDate(to.getDate() + 1)
    to.setHours(0, 0, 0, 0)
    return { from: first, to }
  }
  if (view === 'weekly') {
    const firstParts = cols[0].key.split(':')[1]!.split('-').map(Number)
    const first = new Date(firstParts[0], firstParts[1], firstParts[2])
    const to = new Date(cols[cols.length - 1].year, cols[cols.length - 1].month0, parseInt(cols[cols.length - 1].key.split('-')[2]!, 10) + 7)
    return { from: first, to }
  }
  if (view === 'yearly') {
    const from = new Date(cols[0].year, 0, 1)
    const to = new Date(cols[cols.length - 1].year + 1, 0, 1)
    return { from, to }
  }
  // monthly
  const from = new Date(cols[0].year, cols[0].month0, 1)
  const to = new Date(cols[cols.length - 1].year, cols[cols.length - 1].month0 + 1, 1)
  return { from, to }
}

function keyForDate(view: ViewKind, d: Date, cols: MonthCol[]): string | null {
  if (view === 'daily') return `d:${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  if (view === 'monthly') return `m:${d.getFullYear()}-${d.getMonth()}`
  if (view === 'yearly') return `y:${d.getFullYear()}`
  for (const c of cols) {
    const parts = c.key.split(':')[1]!.split('-').map(Number)
    const start = new Date(parts[0], parts[1], parts[2])
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    if (d >= start && d < end) return c.key
  }
  return null
}

function resolveMethodKey(raw: string | null, cardType: string | null): string {
  const method = raw ?? 'other'
  if (method === 'card') {
    if (cardType === 'credit') return 'credit_card'
    if (cardType === 'debit') return 'debit_card'
    return 'card'
  }
  return method
}

export default async function FluxoCaixaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect('/cadastro')

  const sp = await searchParams
  const view: ViewKind = isViewKind(sp.view) ? sp.view : 'monthly'

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const now = new Date()
  const cols = buildColumns(view, now)
  const range = buildRange(view, cols, now)
  const startOfPeriod = range.from.toISOString()
  const fullRangeFromDate = range.from.toISOString().slice(0, 10)
  const fullRangeToDate = range.to.toISOString().slice(0, 10)

  const [
    { data: invPayments },
    { data: apptsDirect },
    { data: salesDirect },
    { data: expensesData },
    // priors (totais só · pra saldo inicial)
    { data: priorInvPay },
    { data: priorApptsDirect },
    { data: priorSalesDirect },
    { data: priorExpenses },
  ] = await Promise.all([
    sb
      .from('invoice_payments')
      .select('payment_method, card_type, amount, fee_percent, paid_at, invoices!inner(business_id)')
      .eq('invoices.business_id', business.id)
      .gte('paid_at', range.from.toISOString())
      .lt('paid_at', range.to.toISOString()),
    sb
      .from('appointments')
      .select('paid_at, total_price, payment_method, payment_card_type, payment_fee_percent')
      .eq('business_id', business.id)
      .is('invoice_item_id', null)
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('paid_at', range.from.toISOString())
      .lt('paid_at', range.to.toISOString())
      .not('paid_at', 'is', null),
    sb
      .from('sales')
      .select('paid_at, total, payment_method')
      .eq('business_id', business.id)
      .eq('type', 'product_sale')
      .eq('status', 'paid')
      .is('invoice_id', null)
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('paid_at', range.from.toISOString())
      .lt('paid_at', range.to.toISOString())
      .not('paid_at', 'is', null),
    sb
      .from('expenses')
      .select('occurred_at, amount, category')
      .eq('business_id', business.id)
      .gte('occurred_at', fullRangeFromDate)
      .lt('occurred_at', fullRangeToDate),
    // priors
    sb
      .from('invoice_payments')
      .select('amount, payment_method, invoices!inner(business_id)')
      .eq('invoices.business_id', business.id)
      .lt('paid_at', startOfPeriod),
    sb
      .from('appointments')
      .select('total_price')
      .eq('business_id', business.id)
      .is('invoice_item_id', null)
      .not('payment_method', 'in', '(courtesy,credit)')
      .lt('paid_at', startOfPeriod)
      .not('paid_at', 'is', null),
    sb
      .from('sales')
      .select('total')
      .eq('business_id', business.id)
      .eq('type', 'product_sale')
      .eq('status', 'paid')
      .is('invoice_id', null)
      .not('payment_method', 'in', '(courtesy,credit)')
      .lt('paid_at', startOfPeriod)
      .not('paid_at', 'is', null),
    sb
      .from('expenses')
      .select('amount')
      .eq('business_id', business.id)
      .lt('occurred_at', fullRangeFromDate),
  ])

  // Prior receitas: invoice_payments (exclui courtesy/credit) + appointments diretos + sales diretas
  const priorInvReceita = (priorInvPay ?? [])
    .filter((p) => {
      const m = (p.payment_method as string | null) ?? 'other'
      return m !== 'courtesy' && m !== 'credit'
    })
    .reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const priorApptReceita = (priorApptsDirect ?? []).reduce((s, a) => s + Number(a.total_price ?? 0), 0)
  const priorSalesReceita = (priorSalesDirect ?? []).reduce((s, p) => s + Number(p.total ?? 0), 0)
  const priorReceitas = priorInvReceita + priorApptReceita + priorSalesReceita
  const priorDespesas = (priorExpenses ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const saldoAcumulado = priorReceitas - priorDespesas

  const data: Record<string, CashMonth> = {}
  for (const c of cols) {
    data[c.key] = {
      saldoInicial: 0,
      receitasByMethod: {},
      receitasTotal: 0,
      despesasByCategory: {},
      despesasTotal: 0,
      resultado: 0,
      saldoFinal: 0,
    }
  }

  // 1. Invoice payments (split + comanda · source of truth pra breakdown)
  for (const p of invPayments ?? []) {
    if (!p.paid_at) continue
    const raw = (p.payment_method as string | null) ?? 'other'
    if (raw === 'courtesy' || raw === 'credit') continue // não é receita real
    const d = new Date(p.paid_at as string)
    const key = keyForDate(view, d, cols)
    if (!key || !data[key]) continue
    const methodKey = resolveMethodKey(raw, p.card_type as string | null)
    const amt = Number(p.amount ?? 0)
    data[key].receitasByMethod[methodKey] = (data[key].receitasByMethod[methodKey] ?? 0) + amt
    data[key].receitasTotal += amt
    // Taxa de maquininha · fee_percent direto do pagamento
    if (raw === 'card') {
      const fee = Number(p.fee_percent ?? 0)
      if (fee > 0) {
        const feeAmt = (amt * fee) / 100
        data[key].despesasByCategory.payment_fee = (data[key].despesasByCategory.payment_fee ?? 0) + feeAmt
        data[key].despesasTotal += feeAmt
      }
    }
  }

  // 2. Appointments DIRETOS (sem invoice · pago via PaymentMethodModal direto)
  for (const a of apptsDirect ?? []) {
    if (!a.paid_at) continue
    const d = new Date(a.paid_at)
    const key = keyForDate(view, d, cols)
    if (!key || !data[key]) continue
    const raw = (a.payment_method as string | null) ?? 'other'
    const methodKey = resolveMethodKey(raw, a.payment_card_type as string | null)
    const amt = Number(a.total_price ?? 0)
    data[key].receitasByMethod[methodKey] = (data[key].receitasByMethod[methodKey] ?? 0) + amt
    data[key].receitasTotal += amt
    if (raw === 'card') {
      const fee = Number(a.payment_fee_percent ?? 0)
      if (fee > 0) {
        const feeAmt = (amt * fee) / 100
        data[key].despesasByCategory.payment_fee = (data[key].despesasByCategory.payment_fee ?? 0) + feeAmt
        data[key].despesasTotal += feeAmt
      }
    }
  }

  // 3. Sales DIRETAS (sem invoice · venda avulsa)
  for (const s of salesDirect ?? []) {
    if (!s.paid_at) continue
    const d = new Date(s.paid_at as string)
    const key = keyForDate(view, d, cols)
    if (!key || !data[key]) continue
    const method = (s.payment_method as string | null) ?? 'other'
    const amt = Number(s.total ?? 0)
    data[key].receitasByMethod[method] = (data[key].receitasByMethod[method] ?? 0) + amt
    data[key].receitasTotal += amt
  }

  for (const e of expensesData ?? []) {
    if (!e.occurred_at) continue
    const d = new Date(e.occurred_at + 'T00:00:00')
    const key = keyForDate(view, d, cols)
    if (!key || !data[key]) continue
    const cat = (e.category as string | null) ?? 'other'
    const amt = Number(e.amount ?? 0)
    data[key].despesasByCategory[cat] = (data[key].despesasByCategory[cat] ?? 0) + amt
    data[key].despesasTotal += amt
  }

  let acc = saldoAcumulado
  for (const c of cols) {
    const row = data[c.key]
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
          <FluxoCaixaViewSelector current={view} />

          <FluxoCaixaTable
            months={cols}
            data={data}
            methodLabels={METHOD_LABELS}
            categoryLabels={CATEGORY_LABELS}
          />

          <p className="text-[11px] mt-3 text-center" style={{ color: 'var(--admin-text-faded)' }}>
            Clica em <b>Receitas</b> ou <b>Despesas</b> pra ver breakdown por método/categoria · Saldo Inicial = Saldo Final do período anterior
          </p>
        </div>
      </div>
    </main>
  )
}
