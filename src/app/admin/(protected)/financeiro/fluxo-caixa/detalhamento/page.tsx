import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'
import SubPageHeader from '@/components/admin/SubPageHeader'

type SearchParams = {
  month?: string // YYYY-MM
  type?: 'receitas' | 'despesas'
  method?: string
  category?: string
}

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
  utilities: 'Contas',
  marketing: 'Marketing',
  taxes: 'Impostos',
  other: 'Outros',
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
}

function monthLabel(year: number, month0: number): string {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  return `${months[month0]}/${year}`
}

type Row = {
  date: string
  description: string
  amount: number
  invoice_number?: number | null
  invoice_id?: string | null
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
  const monthStr = sp.month ?? new Date().toISOString().slice(0, 7)
  const type = sp.type ?? 'receitas'

  const [yStr, mStr] = monthStr.split('-')
  const year = parseInt(yStr, 10)
  const month0 = parseInt(mStr, 10) - 1
  const from = new Date(Date.UTC(year, month0, 1))
  const to = new Date(Date.UTC(year, month0 + 1, 1))

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  let rows: Row[] = []

  if (type === 'receitas') {
    let q = sb
      .from('appointments')
      .select(`
        id,
        paid_at,
        total_price,
        service_name,
        client_name,
        payment_method,
        invoice_item:invoice_items(invoice:invoices(id, invoice_number))
      `)
      .eq('business_id', business.id)
      .gte('paid_at', from.toISOString())
      .lt('paid_at', to.toISOString())
      .not('paid_at', 'is', null)
      .order('paid_at', { ascending: false })

    if (sp.method) {
      q = q.eq('payment_method', sp.method)
    }

    const { data } = await q

    rows = (data ?? []).map((a) => {
      const row = a as unknown as {
        paid_at: string
        total_price: number | null
        service_name: string | null
        client_name: string | null
        payment_method: string | null
        invoice_item: { invoice: { id: string; invoice_number: number } | null } | { invoice: { id: string; invoice_number: number } | null }[] | null
      }
      const invItem = Array.isArray(row.invoice_item) ? row.invoice_item[0] : row.invoice_item
      const inv = invItem?.invoice
      const invObj = Array.isArray(inv) ? inv[0] : inv
      return {
        date: row.paid_at,
        description: `${row.service_name ?? 'Atendimento'} · ${row.client_name ?? '—'}${row.payment_method ? ` · ${METHOD_LABELS[row.payment_method] ?? row.payment_method}` : ''}`,
        amount: Number(row.total_price ?? 0),
        invoice_number: invObj?.invoice_number ?? null,
        invoice_id: invObj?.id ?? null,
      }
    })
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
        description: `${row.description ?? '—'}${row.category ? ` · ${CATEGORY_LABELS[row.category] ?? row.category}` : ''}`,
        amount: Number(row.amount ?? 0),
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

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <div className="relative">
        <SubPageHeader title="Detalhamento" subtitle={`${title}${filterLabel} · ${monthLabel(year, month0)}`} back="/admin/financeiro/fluxo-caixa" />
        <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-7xl lg:px-8">
          {/* Resumo topo */}
          <div
            className="rounded-2xl p-5 mb-4 flex items-center justify-between"
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
                Sem {title.toLowerCase()} registradas em {monthLabel(year, month0)}{filterLabel}.
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
              <div className="overflow-x-auto">
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
                          {r.invoice_number && (
                            <>
                              {' '}
                              <Link
                                href={`/admin/financeiro/vendas?status=invoiced`}
                                className="text-xs font-semibold ml-1"
                                style={{ color: 'var(--admin-accent)' }}
                              >
                                · Comanda #{r.invoice_number}
                              </Link>
                            </>
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
                      <td colSpan={2} className="px-4 py-3 font-bold" style={{ color: 'var(--admin-text)' }}>
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
