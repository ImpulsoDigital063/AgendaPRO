import Link from 'next/link'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { IconArrowLeft, IconArrowRight } from '@/components/ui/Icon'

/**
 * Card de Relatório Financeiro · Home (coluna esquerda).
 * Inspirado no Salão99 mas com nosso visual + breakdown completo.
 *
 * Conteúdo:
 * - 3 KPIs (Valor recebido / Despesas pagas / Lucro líquido) com comparativo
 *   % vs mês anterior + seta direcional
 * - Breakdown "Formas de Pagamento" em barras horizontais coloridas
 *
 * Filtro: mês corrente · período padrão (sem seletor inline pra MVP · usa
 * /admin/financeiro/fluxo-caixa pra detalhes).
 */

type Props = {
  businessId: string
}

const METHOD_COLORS: Record<string, string> = {
  card: '#3B82F6',        // azul (cartão genérico)
  credit_card: '#3B82F6', // azul (crédito)
  debit_card: '#EC4899',  // rosa (débito)
  pix: '#F59E0B',         // laranja
  cash: '#10B981',        // verde
  transfer: '#8B5CF6',    // roxo
  other: '#94A3B8',       // cinza
}

const METHOD_LABELS: Record<string, string> = {
  card: 'Cartão',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  pix: 'Pix',
  cash: 'Dinheiro',
  transfer: 'Transferência',
  other: 'Outros',
}

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function brlShort(n: number) {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `R$ ${(n / 1000).toFixed(1)}k`
  return brl(n)
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

  // Mês atual + mês anterior em paralelo
  const [
    { data: apptsCurr },
    { data: apptsPrev },
    { data: salesCurr },
    { data: salesPrev },
    { data: expensesCurr },
    { data: expensesPrev },
  ] = await Promise.all([
    sb
      .from('appointments')
      .select('total_price, payment_method, payment_card_type')
      .eq('business_id', businessId)
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('paid_at', startCurr.toISOString())
      .lt('paid_at', endCurr.toISOString())
      .not('paid_at', 'is', null),
    sb
      .from('appointments')
      .select('total_price')
      .eq('business_id', businessId)
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('paid_at', startPrev.toISOString())
      .lt('paid_at', endPrev.toISOString())
      .not('paid_at', 'is', null),
    sb
      .from('sales')
      .select('total, payment_method')
      .eq('business_id', businessId)
      .eq('type', 'product_sale')
      .eq('status', 'paid')
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('paid_at', startCurr.toISOString())
      .lt('paid_at', endCurr.toISOString())
      .not('paid_at', 'is', null),
    sb
      .from('sales')
      .select('total')
      .eq('business_id', businessId)
      .eq('type', 'product_sale')
      .eq('status', 'paid')
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('paid_at', startPrev.toISOString())
      .lt('paid_at', endPrev.toISOString())
      .not('paid_at', 'is', null),
    sb
      .from('expenses')
      .select('amount')
      .eq('business_id', businessId)
      .gte('occurred_at', startCurr.toISOString().slice(0, 10))
      .lt('occurred_at', endCurr.toISOString().slice(0, 10)),
    sb
      .from('expenses')
      .select('amount')
      .eq('business_id', businessId)
      .gte('occurred_at', startPrev.toISOString().slice(0, 10))
      .lt('occurred_at', endPrev.toISOString().slice(0, 10)),
  ])

  // Totais
  const receitaApptsCurr = (apptsCurr ?? []).reduce((s, a) => s + Number(a.total_price ?? 0), 0)
  const receitaSalesCurr = (salesCurr ?? []).reduce((s, a) => s + Number(a.total ?? 0), 0)
  const receitaCurr = receitaApptsCurr + receitaSalesCurr

  const receitaPrev = (apptsPrev ?? []).reduce((s, a) => s + Number(a.total_price ?? 0), 0)
    + (salesPrev ?? []).reduce((s, a) => s + Number(a.total ?? 0), 0)

  const despesaCurr = (expensesCurr ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const despesaPrev = (expensesPrev ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0)

  const lucroCurr = receitaCurr - despesaCurr
  const lucroPrev = receitaPrev - despesaPrev

  // Breakdown receitas por método (mês atual)
  const byMethod: Record<string, number> = {}
  for (const a of apptsCurr ?? []) {
    const raw = (a.payment_method as string | null) ?? 'other'
    let key = raw
    if (raw === 'card') {
      const ct = a.payment_card_type as string | null
      if (ct === 'credit') key = 'credit_card'
      else if (ct === 'debit') key = 'debit_card'
    }
    byMethod[key] = (byMethod[key] ?? 0) + Number(a.total_price ?? 0)
  }
  for (const s of salesCurr ?? []) {
    const key = (s.payment_method as string | null) ?? 'other'
    byMethod[key] = (byMethod[key] ?? 0) + Number(s.total ?? 0)
  }

  // Ordena por valor desc · top 5
  const methodEntries = Object.entries(byMethod)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const maxValue = methodEntries.length > 0 ? methodEntries[0][1] : 0
  const isEmpty = receitaCurr === 0 && despesaCurr === 0 && methodEntries.length === 0

  if (isEmpty) return null

  return (
    <section
      className="rounded-2xl p-5"
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <header className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
            Relatório Financeiro
          </h3>
          <p className="text-[11px] capitalize mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
            {monthLabel(now)}
          </p>
        </div>
        <Link
          href="/admin/financeiro"
          className="text-xs font-semibold"
          style={{ color: 'var(--admin-accent)' }}
        >
          Ver tudo →
        </Link>
      </header>

      {/* 3 KPIs */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <KpiBox label="Recebido" value={receitaCurr} prev={receitaPrev} color="#10B981" />
        <KpiBox label="Despesas" value={despesaCurr} prev={despesaPrev} color="#EF4444" inverted />
        <KpiBox label="Lucro líquido" value={lucroCurr} prev={lucroPrev} color="var(--admin-accent)" highlight />
      </div>

      {/* Formas de Pagamento */}
      {methodEntries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
              Formas de Pagamento
            </p>
            <Link
              href="/admin/financeiro/fluxo-caixa"
              className="text-[11px] font-semibold"
              style={{ color: 'var(--admin-accent)' }}
            >
              Detalhes →
            </Link>
          </div>
          <div className="space-y-3">
            {methodEntries.map(([key, value]) => {
              const pct = maxValue > 0 ? (value / maxValue) * 100 : 0
              const color = METHOD_COLORS[key] ?? METHOD_COLORS.other
              const label = METHOD_LABELS[key] ?? key
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: 'var(--admin-text)' }}>{label}</span>
                    <span className="font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                      {brl(value)}
                    </span>
                  </div>
                  <div
                    className="rounded-full h-1.5 overflow-hidden"
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

function KpiBox({
  label,
  value,
  prev,
  color,
  highlight,
  inverted,
}: {
  label: string
  value: number
  prev: number
  color: string
  highlight?: boolean
  /** Pra despesas: aumentar é RUIM · inverte cor da seta. */
  inverted?: boolean
}) {
  const delta = prev !== 0 ? ((value - prev) / Math.abs(prev)) * 100 : null
  const arrow = delta == null ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  const isGoodChange = arrow === 'flat' ? null : inverted ? arrow === 'down' : arrow === 'up'
  const arrowColor = isGoodChange == null ? 'var(--admin-text-faded)' : isGoodChange ? '#10B981' : '#EF4444'

  return (
    <div
      className="rounded-xl p-2.5"
      style={{
        background: highlight
          ? `linear-gradient(135deg, color-mix(in srgb, ${color} 12%, var(--admin-surface)) 0%, var(--admin-surface) 80%)`
          : 'var(--admin-surface-hi)',
        border: `1px solid ${highlight ? `color-mix(in srgb, ${color} 30%, transparent)` : 'var(--admin-border)'}`,
      }}
    >
      <p className="text-[9px] font-bold uppercase tracking-widest truncate" style={{ color: 'var(--admin-text-faded)' }}>
        {label}
      </p>
      <p className="text-base font-bold tabular-nums mt-1 truncate" style={{ color }}>
        {brlShort(value)}
      </p>
      {delta != null && (
        <p className="text-[10px] mt-1 inline-flex items-center gap-1 tabular-nums" style={{ color: arrowColor }}>
          {arrow === 'up' && <IconArrowRight size={9} />}
          {arrow === 'down' && <IconArrowLeft size={9} />}
          {Math.abs(delta).toFixed(1)}% mês ant.
        </p>
      )}
    </div>
  )
}
