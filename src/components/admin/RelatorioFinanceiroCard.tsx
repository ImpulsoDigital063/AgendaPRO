import Link from 'next/link'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { IconTrendingUp, IconInfo, IconExternalLink } from '@/components/ui/Icon'

/**
 * Relatório Financeiro · Home (largura total da coluna esquerda).
 * Layout inspirado no Salão99: 3 cards grandes + card "Formas de Pagamento"
 * com barras horizontais coloridas grandes.
 *
 * IMPORTANTE · source of truth do breakdown:
 *  - Quando comanda foi paga via split, appointment.payment_method recebeu
 *    só o MAIOR método (perde o outro). Pra não perder o breakdown, lemos
 *    invoice_payments direto (cada linha = 1 método + 1 amount + paid_at).
 *  - Appointments/Sales SEM invoice_item_id (pagamento direto, não via
 *    comanda) entram do payment_method próprio.
 *  - Soma das fontes = receita total · breakdown vem de cada fonte.
 */

type Props = {
  businessId: string
}

const METHOD_COLORS: Record<string, string> = {
  card: '#3B82F6',
  credit_card: '#3B82F6',
  credit: '#3B82F6',
  debit_card: '#EC4899',
  debit: '#EC4899',
  pix: '#F59E0B',
  cash: '#10B981',
  transfer: '#8B5CF6',
  courtesy: '#94A3B8',
  points: '#A855F7',
  other: '#94A3B8',
}

const METHOD_LABELS: Record<string, string> = {
  card: 'Cartão',
  credit_card: 'Cartão de Crédito',
  credit: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  debit: 'Cartão de Débito',
  pix: 'Pix',
  cash: 'Dinheiro',
  transfer: 'Transferência',
  courtesy: 'Cortesia',
  points: 'Pontos',
  other: 'Outros',
}

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export default async function RelatorioFinanceiroCard({ businessId }: Props) {
  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const now = new Date()
  const startCurr = new Date(now.getFullYear(), now.getMonth(), 1)
  const endCurr = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endPrev = startCurr
  const todayStr = now.toISOString().slice(0, 10)
  const firstDayMonthStr = startCurr.toISOString().slice(0, 10)
  // Recebido HOJE · pra 1º BigKpi do relatório (substitui o KPI deslocado do topo)
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  const [
    // Invoice payments do mês atual (source of truth do breakdown quando há comanda)
    { data: invPaymentsCurr },
    // Appointments do mês atual SEM comanda (pagamento direto · entram no breakdown)
    { data: apptsDirectCurr },
    { data: salesDirectCurr },
    // Mês anterior · só preciso dos totais pra comparativo
    { data: apptsPrev },
    { data: salesPrev },
    { data: invPaymentsPrev },
    // Despesas
    { data: expensesCurr },
    { data: expensesPrev },
    // Recebido HOJE · 3 fontes (mesmo padrão · só do dia)
    { data: invPaymentsToday },
    { data: apptsDirectToday },
    { data: salesDirectToday },
  ] = await Promise.all([
    // invoice_payments do mês atual com filtro pelo business_id via join
    sb
      .from('invoice_payments')
      .select('payment_method, card_type, amount, paid_at, invoices!inner(business_id)')
      .eq('invoices.business_id', businessId)
      .gte('paid_at', startCurr.toISOString())
      .lt('paid_at', endCurr.toISOString()),
    sb
      .from('appointments')
      .select('total_price, payment_method, payment_card_type')
      .eq('business_id', businessId)
      .is('invoice_item_id', null) // não veio de comanda
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('paid_at', startCurr.toISOString())
      .lt('paid_at', endCurr.toISOString())
      .not('paid_at', 'is', null),
    sb
      .from('sales')
      .select('total, payment_method')
      .eq('business_id', businessId)
      .eq('type', 'product_sale')
      .eq('status', 'paid')
      .is('invoice_id', null) // não veio de comanda
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('paid_at', startCurr.toISOString())
      .lt('paid_at', endCurr.toISOString())
      .not('paid_at', 'is', null),
    // Mês anterior (totais só)
    sb
      .from('appointments')
      .select('total_price')
      .eq('business_id', businessId)
      .not('payment_method', 'in', '(courtesy,credit)')
      .is('invoice_item_id', null)
      .gte('paid_at', startPrev.toISOString())
      .lt('paid_at', endPrev.toISOString())
      .not('paid_at', 'is', null),
    sb
      .from('sales')
      .select('total')
      .eq('business_id', businessId)
      .eq('type', 'product_sale')
      .eq('status', 'paid')
      .is('invoice_id', null)
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('paid_at', startPrev.toISOString())
      .lt('paid_at', endPrev.toISOString())
      .not('paid_at', 'is', null),
    sb
      .from('invoice_payments')
      .select('amount, invoices!inner(business_id)')
      .eq('invoices.business_id', businessId)
      .gte('paid_at', startPrev.toISOString())
      .lt('paid_at', endPrev.toISOString()),
    sb
      .from('expenses')
      .select('amount')
      .eq('business_id', businessId)
      .gte('occurred_at', firstDayMonthStr)
      .lte('occurred_at', todayStr),
    sb
      .from('expenses')
      .select('amount')
      .eq('business_id', businessId)
      .gte('occurred_at', startPrev.toISOString().slice(0, 10))
      .lt('occurred_at', firstDayMonthStr),
    // ─── Recebido HOJE · invoice_payments + appts diretos + sales diretas
    sb
      .from('invoice_payments')
      .select('amount, payment_method, invoices!inner(business_id)')
      .eq('invoices.business_id', businessId)
      .gte('paid_at', startToday.toISOString())
      .lt('paid_at', endToday.toISOString()),
    sb
      .from('appointments')
      .select('total_price')
      .eq('business_id', businessId)
      .is('invoice_item_id', null)
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('paid_at', startToday.toISOString())
      .lt('paid_at', endToday.toISOString())
      .not('paid_at', 'is', null),
    sb
      .from('sales')
      .select('total')
      .eq('business_id', businessId)
      .eq('type', 'product_sale')
      .eq('status', 'paid')
      .is('invoice_id', null)
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('paid_at', startToday.toISOString())
      .lt('paid_at', endToday.toISOString())
      .not('paid_at', 'is', null),
  ])

  // ─── Breakdown por método ────────────────────────────────────────
  const byMethod: Record<string, number> = {}

  // 1. Invoice payments (cobre split + cortesia + crédito do cliente)
  for (const p of invPaymentsCurr ?? []) {
    const raw = (p.payment_method as string | null) ?? 'other'
    // cortesia + credit_cliente não contam como receita
    if (raw === 'courtesy' || raw === 'credit') continue
    let key = raw
    if (raw === 'card') {
      const ct = p.card_type as string | null
      if (ct === 'credit') key = 'credit_card'
      else if (ct === 'debit') key = 'debit_card'
    }
    byMethod[key] = (byMethod[key] ?? 0) + Number(p.amount ?? 0)
  }

  // 2. Appointments DIRETOS (sem invoice · pagamento direto via PaymentMethodModal mobile)
  for (const a of apptsDirectCurr ?? []) {
    const raw = (a.payment_method as string | null) ?? 'other'
    let key = raw
    if (raw === 'card') {
      const ct = a.payment_card_type as string | null
      if (ct === 'credit') key = 'credit_card'
      else if (ct === 'debit') key = 'debit_card'
    }
    byMethod[key] = (byMethod[key] ?? 0) + Number(a.total_price ?? 0)
  }

  // 3. Sales DIRETAS (sem invoice)
  for (const s of salesDirectCurr ?? []) {
    const key = (s.payment_method as string | null) ?? 'other'
    byMethod[key] = (byMethod[key] ?? 0) + Number(s.total ?? 0)
  }

  const receitaCurr = Object.values(byMethod).reduce((s, v) => s + v, 0)

  // Mês anterior · só total (sem breakdown · só compara)
  const receitaPrev = (apptsPrev ?? []).reduce((s, a) => s + Number(a.total_price ?? 0), 0)
    + (salesPrev ?? []).reduce((s, p) => s + Number(p.total ?? 0), 0)
    + (invPaymentsPrev ?? [])
        .reduce((s, p) => s + Number(p.amount ?? 0), 0)

  const despesaCurr = (expensesCurr ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const despesaPrev = (expensesPrev ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0)

  const lucroCurr = receitaCurr - despesaCurr
  const lucroPrev = receitaPrev - despesaPrev

  // Recebido HOJE (3 fontes · igual ao mês mas só do dia)
  const recebidoHoje =
    (invPaymentsToday ?? [])
      .filter((p) => {
        const m = (p.payment_method as string | null) ?? 'other'
        return m !== 'courtesy' && m !== 'credit'
      })
      .reduce((s, p) => s + Number(p.amount ?? 0), 0)
    + (apptsDirectToday ?? []).reduce((s, a) => s + Number(a.total_price ?? 0), 0)
    + (salesDirectToday ?? []).reduce((s, p) => s + Number(p.total ?? 0), 0)

  // Ordena breakdown decrescente
  const methodEntries = Object.entries(byMethod)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])

  const maxValue = methodEntries.length > 0 ? methodEntries[0][1] : 0
  const isEmpty = receitaCurr === 0 && despesaCurr === 0

  if (isEmpty) return null

  const periodLabel = `01 ${now.toLocaleDateString('pt-BR', { month: 'short' })} ${now.getFullYear()} · ${String(now.getDate()).padStart(2, '0')} ${now.toLocaleDateString('pt-BR', { month: 'short' })} ${now.getFullYear()}`

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
            Relatório Financeiro
          </h3>
          <p className="text-[11px] capitalize" style={{ color: 'var(--admin-text-mute)' }}>
            {monthLabel(now)} · {periodLabel}
          </p>
        </div>
        <Link
          href="/admin/financeiro"
          className="text-xs font-semibold inline-flex items-center gap-1"
          style={{ color: 'var(--admin-accent)' }}
        >
          Ver tudo <IconExternalLink size={10} />
        </Link>
      </div>

      {/* 4 cards grandes · Recebido hoje virou parte do relatório (antes ficava
          deslocado lá em cima no KPIsRow) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <BigKpi
          label="Recebido hoje"
          value={recebidoHoje}
          color="#10B981"
          help={`Recebido em ${now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} (todos os métodos · sem cortesia/crédito)`}
        />
        <BigKpi
          label="Valor recebido"
          value={receitaCurr}
          prev={receitaPrev}
          color="#10B981"
          help="Total recebido no mês (todos os métodos)"
        />
        <BigKpi
          label="Despesas pagas"
          value={despesaCurr}
          prev={despesaPrev}
          color="#EF4444"
          inverted
          help="Soma das despesas no mês"
        />
        <BigKpi
          label="Lucro líquido"
          value={lucroCurr}
          prev={lucroPrev}
          color="var(--admin-accent)"
          help="Receita − Despesas (do mês)"
        />
      </div>

      {/* Card grande · Formas de Pagamento */}
      {methodEntries.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold inline-flex items-center gap-1.5" style={{ color: 'var(--admin-text)' }}>
              Formas de Pagamento
              <span style={{ color: 'var(--admin-text-faded)' }} title="Breakdown do que foi recebido por método">
                <IconInfo size={11} />
              </span>
            </h4>
            <Link
              href="/admin/financeiro/fluxo-caixa"
              className="text-xs font-semibold inline-flex items-center gap-1 px-3 py-1 rounded-lg"
              style={{ color: 'var(--admin-accent)', border: '1px solid var(--admin-border)' }}
            >
              Detalhes <IconExternalLink size={10} />
            </Link>
          </div>

          <p className="text-[11px] font-semibold mb-1" style={{ color: 'var(--admin-text-mute)' }}>
            Valor recebido
          </p>
          <p className="text-2xl font-bold tabular-nums mb-4" style={{ color: 'var(--admin-text)' }}>
            {brl(receitaCurr)}
          </p>

          <div className="space-y-3">
            {methodEntries.map(([key, value]) => {
              const pct = maxValue > 0 ? (value / maxValue) * 100 : 0
              const color = METHOD_COLORS[key] ?? METHOD_COLORS.other
              const label = METHOD_LABELS[key] ?? key
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span style={{ color: 'var(--admin-text-2)' }}>{label}</span>
                    <span className="font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                      {brl(value)}
                    </span>
                  </div>
                  <div
                    className="rounded-full h-2 overflow-hidden"
                    style={{ background: 'var(--admin-input-bg)' }}
                  >
                    <div
                      className="h-full transition-all"
                      style={{ width: `${Math.max(2, pct)}%`, background: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

function BigKpi({
  label,
  value,
  prev,
  color,
  help,
  inverted,
  breakdown,
}: {
  label: string
  value: number
  /** Quando ausente, não renderiza badge nem % comparativo (ex: Recebido hoje) */
  prev?: number
  color: string
  help: string
  inverted?: boolean
  breakdown?: { label: string; value: number; strong?: boolean }[]
}) {
  const delta = prev != null && prev !== 0 ? ((value - prev) / Math.abs(prev)) * 100 : null
  const arrow = delta == null ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  const isGoodChange = arrow === 'flat' ? null : inverted ? arrow === 'down' : arrow === 'up'
  const badgeColor = isGoodChange == null ? null : isGoodChange ? '#10B981' : '#EF4444'

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <p className="text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
          {label}
        </p>
        <span style={{ color: 'var(--admin-text-faded)' }} title={help}>
          <IconInfo size={11} />
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap mb-1.5">
        <p className="text-xl lg:text-2xl font-bold tabular-nums" style={{ color }}>
          {brl(value)}
        </p>
        {badgeColor && delta != null && Math.abs(delta) >= 1 && (
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white"
            style={{ background: badgeColor }}
          >
            {(inverted ? !isGoodChange : isGoodChange) ? 'Alta' : 'Baixa'}
          </span>
        )}
      </div>
      {delta != null && Math.abs(delta) >= 0.5 && (
        <p className="text-[11px] inline-flex items-center gap-1 tabular-nums" style={{ color: badgeColor ?? 'var(--admin-text-faded)' }}>
          {arrow === 'up' && (
            <span style={{ display: 'inline-block', transform: 'rotate(0deg)' }}>
              <IconTrendingUp size={10} />
            </span>
          )}
          {arrow === 'down' && (
            <span style={{ display: 'inline-block', transform: 'rotate(180deg)' }}>
              <IconTrendingUp size={10} />
            </span>
          )}
          {Math.abs(delta).toFixed(1)}% último mês
        </p>
      )}
      {breakdown && (
        <div className="mt-3 pt-3 space-y-1 text-xs" style={{ borderTop: '1px solid var(--admin-divider)' }}>
          {breakdown.map((b, i) => (
            <div key={i} className="flex justify-between" style={{
              color: b.strong ? 'var(--admin-text)' : 'var(--admin-text-mute)',
              fontWeight: b.strong ? 700 : 400,
            }}>
              <span>{b.label}</span>
              <span className="tabular-nums">{brl(b.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
