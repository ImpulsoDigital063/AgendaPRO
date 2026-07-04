import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'
import SubPageHeader from '@/components/admin/SubPageHeader'
import ExportCSVButton from '@/components/admin/financeiro/ExportCSVButton'
import { startOfDayBR, todayBR } from '@/lib/date-br'

type SearchParams = {
  month?: string // YYYY-MM (legado · ainda aceito)
  from?: string  // YYYY-MM-DD
  to?: string    // YYYY-MM-DD (exclusivo)
  type?: 'receitas' | 'despesas'
  method?: string
  category?: string
}

// Cartão SEMPRE Crédito/Débito · sem "Cartão" genérico (Salão99 pattern)
const METHOD_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  transfer: 'Transferência Bancária',
  other: 'Outro',
}

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Aluguel',
  products: 'Produtos',
  salary: 'Salários',
  utilities: 'Contas',
  marketing: 'Marketing',
  taxes: 'Impostos',
  other: 'Outros',
  payment_fee: 'Taxa de Maquininha',
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
}

function rangeLabel(from: Date, to: Date): string {
  const diffMs = to.getTime() - from.getTime()
  const days = Math.round(diffMs / 86400000)
  // 1 dia
  if (days === 1) return from.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  // 7 dias = semana
  if (days === 7) {
    const last = new Date(to)
    last.setDate(last.getDate() - 1)
    return `${from.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} → ${last.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
  }
  // mês exato (do dia 1 ao primeiro do próximo)
  if (from.getDate() === 1 && to.getDate() === 1 && to.getMonth() === from.getMonth() + 1 && to.getFullYear() === from.getFullYear()) {
    return from.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }
  // ano exato (Jan 1 → Jan 1 do próximo)
  if (from.getMonth() === 0 && from.getDate() === 1 && to.getMonth() === 0 && to.getDate() === 1 && to.getFullYear() === from.getFullYear() + 1) {
    return String(from.getFullYear())
  }
  // genérico
  const last = new Date(to)
  last.setDate(last.getDate() - 1)
  return `${from.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })} → ${last.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
}

type Row = {
  date: string
  description: string
  amount: number
  /** Texto curto da origem (ex: "Comanda #12", "Atendimento direto", "Venda avulsa") */
  origin_label?: string | null
  /** Se aplicável, link pra abrir a origem (ex: /admin/comandas/[id]) */
  origin_href?: string | null
}

function resolveMethodFilter(method: string): string[] {
  // O filtro do usuário usa credit_card/debit_card mas no DB é 'card' + card_type
  if (method === 'credit_card' || method === 'debit_card') return ['card']
  return [method]
}

function cardTypeForFilter(method: string): 'credit' | 'debit' | null {
  if (method === 'credit_card') return 'credit'
  if (method === 'debit_card') return 'debit'
  return null
}

export default async function DetalhamentoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect('/cadastro')

  const sp = await searchParams
  const type = sp.type ?? 'receitas'

  // Resolve range: from/to tem prioridade · senão deriva do month
  let from: Date
  let to: Date
  if (sp.from && sp.to) {
    from = new Date(sp.from + 'T00:00:00')
    to = new Date(sp.to + 'T00:00:00')
  } else {
    const monthStr = sp.month ?? todayBR().slice(0, 7) // λ.fuso: mês default em BR
    const [yStr, mStr] = monthStr.split('-')
    const year = parseInt(yStr, 10)
    const month0 = parseInt(mStr, 10) - 1
    from = new Date(year, month0, 1)
    to = new Date(year, month0 + 1, 1)
  }

  // λ.fuso: bounds de paid_at em MEIA-NOITE BR (−03:00) · consistente com o
  // motor do fluxo-caixa. from/to (Date) seguem só pro rótulo e pro occorred_at
  // (coluna DATE) da despesa.
  const pad2 = (n: number) => String(n).padStart(2, '0')
  const fromYmd = sp.from && sp.to ? sp.from : `${from.getFullYear()}-${pad2(from.getMonth() + 1)}-${pad2(from.getDate())}`
  const toYmd = sp.from && sp.to ? sp.to : `${to.getFullYear()}-${pad2(to.getMonth() + 1)}-${pad2(to.getDate())}`
  const fromISO = startOfDayBR(fromYmd)
  const toISO = startOfDayBR(toYmd)

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  let rows: Row[] = []

  if (type === 'receitas') {
    const methodFilter = sp.method ?? null
    const dbMethods = methodFilter ? resolveMethodFilter(methodFilter) : null
    const cardTypeFilter = methodFilter ? cardTypeForFilter(methodFilter) : null

    // 1. Invoice payments (split + comanda · source of truth)
    let qInv = sb
      .from('invoice_payments')
      .select(`
        paid_at,
        amount,
        payment_method,
        card_type,
        invoice:invoices!inner(id, invoice_number, business_id, customer:customers(name))
      `)
      .eq('invoice.business_id', business.id)
      .gte('paid_at', fromISO)
      .lt('paid_at', toISO)
      .not('payment_method', 'in', '(courtesy,credit)')

    if (dbMethods) qInv = qInv.in('payment_method', dbMethods)
    if (cardTypeFilter) qInv = qInv.eq('card_type', cardTypeFilter)

    const { data: invData } = await qInv

    for (const p of invData ?? []) {
      type InvShape = { id: string; invoice_number: number; customer: { name: string | null } | { name: string | null }[] | null }
      const row = p as unknown as {
        paid_at: string
        amount: number | null
        payment_method: string | null
        card_type: string | null
        invoice: InvShape | InvShape[] | null
      }
      const inv = Array.isArray(row.invoice) ? row.invoice[0] : row.invoice
      if (!inv) continue
      const cust = Array.isArray(inv.customer) ? inv.customer[0] : inv.customer
      const customerName = cust?.name ?? '—'
      const methodLabel = row.payment_method === 'card'
        ? (row.card_type === 'credit' ? 'Cartão de Crédito' : row.card_type === 'debit' ? 'Cartão de Débito' : 'Cartão')
        : (METHOD_LABELS[row.payment_method ?? 'other'] ?? row.payment_method ?? '—')
      rows.push({
        date: row.paid_at,
        description: `${customerName} · ${methodLabel}`,
        amount: Number(row.amount ?? 0),
        origin_label: `Comanda #${inv.invoice_number}`,
        origin_href: `/admin/comandas/${inv.id}`,
      })
    }

    // 2. Appointments DIRETOS (sem invoice_item_id · pago direto pela timeline)
    let qAppt = sb
      .from('appointments')
      .select(`
        id,
        paid_at,
        total_price,
        service_name,
        client_name,
        payment_method,
        payment_card_type
      `)
      .eq('business_id', business.id)
      .is('invoice_item_id', null)
      .gte('paid_at', fromISO)
      .lt('paid_at', toISO)
      .not('paid_at', 'is', null)
      .not('payment_method', 'in', '(courtesy,credit)')

    if (dbMethods) qAppt = qAppt.in('payment_method', dbMethods)
    if (cardTypeFilter) qAppt = qAppt.eq('payment_card_type', cardTypeFilter)

    const { data: apptData } = await qAppt

    for (const a of apptData ?? []) {
      const row = a as unknown as {
        paid_at: string
        total_price: number | null
        service_name: string | null
        client_name: string | null
        payment_method: string | null
        payment_card_type: string | null
      }
      const methodLabel = row.payment_method === 'card'
        ? (row.payment_card_type === 'credit' ? 'Cartão de Crédito' : row.payment_card_type === 'debit' ? 'Cartão de Débito' : 'Cartão')
        : (METHOD_LABELS[row.payment_method ?? 'other'] ?? row.payment_method ?? '—')
      rows.push({
        date: row.paid_at,
        description: `${row.service_name ?? 'Atendimento'} · ${row.client_name ?? '—'} · ${methodLabel}`,
        amount: Number(row.total_price ?? 0),
        origin_label: 'Atendimento direto',
      })
    }

    // 3. Sales DIRETAS (sem invoice_id · venda avulsa de produto)
    // v87: sales agora tem payment_card_type → entra no drilldown de crédito/débito.
    {
      let qSale = sb
        .from('sales')
        .select('paid_at, total, payment_method, payment_card_type, type, customer:customers(name)')
        .eq('business_id', business.id)
        .eq('type', 'product_sale')
        .eq('status', 'paid')
        .is('invoice_id', null)
        .gte('paid_at', fromISO)
        .lt('paid_at', toISO)
        .not('paid_at', 'is', null)
        .not('payment_method', 'in', '(courtesy,credit)')

      if (dbMethods) qSale = qSale.in('payment_method', dbMethods)
      if (cardTypeFilter) qSale = qSale.eq('payment_card_type', cardTypeFilter)

      const { data: saleData } = await qSale

      for (const s of saleData ?? []) {
        const row = s as unknown as { paid_at: string; total: number | null; payment_method: string | null; payment_card_type: string | null; customer: { name: string | null } | { name: string | null }[] | null }
        const sCust = Array.isArray(row.customer) ? row.customer[0] : row.customer
        const methodLabel = row.payment_method === 'card'
          ? (row.payment_card_type === 'credit' ? 'Cartão de Crédito' : row.payment_card_type === 'debit' ? 'Cartão de Débito' : 'Cartão')
          : (METHOD_LABELS[row.payment_method ?? 'other'] ?? row.payment_method)
        rows.push({
          date: row.paid_at,
          description: `${sCust?.name ?? '—'} · ${methodLabel}`,
          amount: Number(row.total ?? 0),
          origin_label: 'Venda avulsa',
        })
      }
    }

    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  } else {
    let q = sb
      .from('expenses')
      .select('occurred_at, amount, description, category')
      .eq('business_id', business.id)
      .gte('occurred_at', from.toISOString().slice(0, 10))
      .lt('occurred_at', to.toISOString().slice(0, 10))
      .order('occurred_at', { ascending: false })

    if (sp.category) {
      q = q.eq('category', sp.category)
    }

    const { data } = await q

    rows = (data ?? []).map((e) => {
      const row = e as unknown as { occurred_at: string; amount: number; description: string | null; category: string | null }
      return {
        date: row.occurred_at,
        description: row.description ?? '—',
        amount: Number(row.amount ?? 0),
        origin_label: row.category ? (CATEGORY_LABELS[row.category] ?? row.category) : null,
      }
    })
  }

  const total = rows.reduce((s, r) => s + r.amount, 0)
  const tone = type === 'receitas' ? '#059669' : 'var(--admin-danger,#EF4444)'
  const title = type === 'receitas' ? 'Receitas' : 'Despesas'
  const filterLabel = sp.method
    ? ` · ${METHOD_LABELS[sp.method] ?? sp.method}`
    : sp.category
      ? ` · ${CATEGORY_LABELS[sp.category] ?? sp.category}`
      : ''
  const periodLabel = rangeLabel(from, to)

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <div className="relative">
        <SubPageHeader title="Detalhamento" subtitle={`${title}${filterLabel} · ${periodLabel}`} back="/admin/financeiro/fluxo-caixa" />
        <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-7xl lg:px-8">
          {/* Resumo topo · Total · Movimentações · Exportar CSV */}
          <div
            className="rounded-2xl p-5 mb-4 flex items-center justify-between gap-3 flex-wrap"
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                Total {title}
              </p>
              <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: tone }}>
                {formatBRL(total)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                Movimentações
              </p>
              <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: 'var(--admin-text)' }}>
                {rows.length}
              </p>
            </div>
            <div className="ml-auto">
              <ExportCSVButton
                rows={rows.map((r) => ({
                  date: r.date,
                  description: r.description,
                  amount: r.amount,
                  origin_label: r.origin_label ?? null,
                }))}
                filename={`fluxo-caixa-${type}-${periodLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                signedAmount={type === 'despesas' ? '-' : ''}
              />
            </div>
          </div>

          {/* Tabela */}
          {rows.length === 0 ? (
            <div
              className="rounded-2xl p-10 text-center"
              style={{
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
                Nenhuma movimentação encontrada
              </p>
              <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                Sem {title.toLowerCase()} registradas em {periodLabel}{filterLabel}.
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
              }}
            >
              {/* Mobile · lista de cards empilhados · evita scroll horizontal feio */}
              <div className="sm:hidden divide-y" style={{ borderColor: 'var(--admin-divider)' }}>
                {rows.map((r, idx) => (
                  <div key={idx} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] uppercase tracking-wider tabular-nums" style={{ color: 'var(--admin-text-faded)' }}>
                        {formatDate(r.date)}
                      </span>
                      <span
                        className="text-sm font-bold tabular-nums flex-shrink-0"
                        style={{ color: tone }}
                      >
                        {type === 'despesas' ? '- ' : ''}{formatBRL(r.amount)}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
                      {r.description}
                    </p>
                    {r.origin_label && (
                      r.origin_href ? (
                        <Link
                          href={r.origin_href}
                          className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                          style={{ color: 'var(--admin-accent)' }}
                        >
                          {r.origin_label}
                        </Link>
                      ) : (
                        <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                          {r.origin_label}
                        </p>
                      )
                    )}
                  </div>
                ))}
                {/* Total rodapé mobile */}
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--admin-surface-hi)' }}>
                  <span className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>Total</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: tone }}>
                    {type === 'despesas' ? '- ' : ''}{formatBRL(total)}
                  </span>
                </div>
              </div>

              {/* Tablet+ · tabela tradicional · ≥640px */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      style={{
                        background: 'var(--admin-surface-hi)',
                        borderBottom: '1px solid var(--admin-border)',
                      }}
                    >
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Data</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Descrição</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Origem</th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: idx < rows.length - 1 ? '1px solid var(--admin-divider)' : 'none' }}>
                        <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--admin-text-2)' }}>
                          {formatDate(r.date)}
                        </td>
                        <td className="px-4 py-3" style={{ color: 'var(--admin-text)' }}>
                          {r.description}
                        </td>
                        <td className="px-4 py-3" style={{ color: 'var(--admin-text-mute)' }}>
                          {r.origin_label && r.origin_href ? (
                            <Link
                              href={r.origin_href}
                              className="text-xs font-semibold inline-flex items-center gap-1 hover:underline"
                              style={{ color: 'var(--admin-accent)' }}
                            >
                              {r.origin_label}
                            </Link>
                          ) : r.origin_label ? (
                            <span className="text-xs">{r.origin_label}</span>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>—</span>
                          )}
                        </td>
                        <td
                          className="px-4 py-3 text-right tabular-nums font-bold"
                          style={{ color: tone }}
                        >
                          {type === 'despesas' ? '- ' : ''}{formatBRL(r.amount)}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--admin-surface-hi)' }}>
                      <td colSpan={3} className="px-4 py-3 font-bold" style={{ color: 'var(--admin-text)' }}>
                        Total
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold" style={{ color: tone }}>
                        {type === 'despesas' ? '- ' : ''}{formatBRL(total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
