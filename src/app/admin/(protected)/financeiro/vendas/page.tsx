import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'
import SubPageHeader from '@/components/admin/SubPageHeader'
import VendasFilters from '@/components/admin/vendas/VendasFilters'
import VendasLoadMore from '@/components/admin/vendas/VendasLoadMore'

type SaleRow = {
  id: string
  appointment_date: string
  start_time: string
  client_name: string | null
  service_name: string | null
  total_price: number | null
  status: string
  paid_at: string | null
  payment_method: string | null
  invoice_item_id: string | null
  professional: { name: string } | null
}

type InvoiceItemRef = {
  id: string
  invoice: { invoice_number: number; status: string } | null
}

const PAGE_SIZE = 100

function formatBRL(v: number | null): string {
  if (v == null) return 'R$ 0,00'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string): string {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function describeStatus(a: SaleRow, invoicesById: Map<string, InvoiceItemRef>): {
  label: string
  tone: 'pending' | 'paid' | 'invoiced' | 'cancelled'
} {
  if (a.status === 'cancelled') return { label: 'Cancelada', tone: 'cancelled' }
  if (a.invoice_item_id) {
    const inv = invoicesById.get(a.invoice_item_id)
    if (inv?.invoice) {
      if (inv.invoice.status === 'closed') {
        return { label: `#${inv.invoice.invoice_number} · Fatura Fechada`, tone: 'invoiced' }
      }
      if (inv.invoice.status === 'open') {
        return { label: `#${inv.invoice.invoice_number} · Aberta`, tone: 'invoiced' }
      }
    }
  }
  if (a.paid_at) return { label: 'Pago', tone: 'paid' }
  return { label: 'Sem Fatura · Pendente', tone: 'pending' }
}

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string; offset?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect('/cadastro')

  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const status = sp.status ?? 'all'
  const offset = Math.max(0, parseInt(sp.offset ?? '0', 10) || 0)

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const today = new Date().toISOString().slice(0, 10)

  // Query base · só vendas realizadas (passado + hoje)
  let listQuery = sb
    .from('appointments')
    .select(`
      id,
      appointment_date,
      start_time,
      client_name,
      service_name,
      total_price,
      status,
      paid_at,
      payment_method,
      invoice_item_id,
      professional:professionals(name)
    `)
    .eq('business_id', business.id)
    .lte('appointment_date', today)

  let countQuery = sb
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', business.id)
    .lte('appointment_date', today)

  // Filtro status
  if (status === 'pending') {
    listQuery = listQuery.is('paid_at', null).is('invoice_item_id', null).neq('status', 'cancelled')
    countQuery = countQuery.is('paid_at', null).is('invoice_item_id', null).neq('status', 'cancelled')
  } else if (status === 'paid') {
    listQuery = listQuery.not('paid_at', 'is', null).is('invoice_item_id', null).neq('status', 'cancelled')
    countQuery = countQuery.not('paid_at', 'is', null).is('invoice_item_id', null).neq('status', 'cancelled')
  } else if (status === 'invoiced') {
    listQuery = listQuery.not('invoice_item_id', 'is', null)
    countQuery = countQuery.not('invoice_item_id', 'is', null)
  } else if (status === 'cancelled') {
    listQuery = listQuery.eq('status', 'cancelled')
    countQuery = countQuery.eq('status', 'cancelled')
  }

  // Busca · client_name OU service_name (case insensitive)
  if (q) {
    const term = q.replace(/[%_]/g, '\\$&')
    const filter = `client_name.ilike.%${term}%,service_name.ilike.%${term}%`
    listQuery = listQuery.or(filter)
    countQuery = countQuery.or(filter)
  }

  // Ordenação + range
  listQuery = listQuery
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const [{ data: appts }, { count: totalCount }] = await Promise.all([listQuery, countQuery])
  const sales = (appts ?? []) as unknown as SaleRow[]

  // Carrega invoices vinculadas (pra status #NNNN)
  const invoiceItemIds = sales.map((s) => s.invoice_item_id).filter(Boolean) as string[]
  const invoicesById = new Map<string, InvoiceItemRef>()
  if (invoiceItemIds.length > 0) {
    const { data: items } = await sb
      .from('invoice_items')
      .select(`id, invoice:invoices(invoice_number, status)`)
      .in('id', invoiceItemIds)
    for (const item of (items ?? []) as unknown as InvoiceItemRef[]) {
      invoicesById.set(item.id, item)
    }
  }

  const showingFrom = sales.length > 0 ? offset + 1 : 0
  const showingTo = offset + sales.length

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <div className="relative">
        <SubPageHeader title="Vendas" subtitle={business.name} back="/admin/financeiro" />
        <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-7xl lg:px-8">
          <VendasFilters />

          {/* Contador */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
              {totalCount === 0
                ? 'Nenhuma venda encontrada'
                : `Exibindo ${showingFrom}–${showingTo} de ${totalCount ?? sales.length} ${(totalCount ?? sales.length) === 1 ? 'venda' : 'vendas'}`}
            </p>
          </div>

          {/* Tabela */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
            }}
          >
            {sales.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
                  {q || status !== 'all' ? 'Nenhuma venda bate com os filtros' : 'Nenhuma venda registrada'}
                </p>
                <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                  {q || status !== 'all'
                    ? 'Tente limpar a busca ou ajustar o filtro de situação.'
                    : 'As vendas vão aparecer aqui conforme atendimentos forem criados.'}
                </p>
              </div>
            ) : (
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
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Cliente</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Descrição</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Profissional</th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Valor</th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((s, idx) => {
                      const st = describeStatus(s, invoicesById)
                      const toneColor = {
                        pending: 'var(--admin-text-mute)',
                        paid: '#10B981',
                        invoiced: 'var(--admin-accent)',
                        cancelled: 'var(--admin-danger,#EF4444)',
                      }[st.tone]
                      return (
                        <tr
                          key={s.id}
                          style={{ borderBottom: idx < sales.length - 1 ? '1px solid var(--admin-divider)' : 'none' }}
                        >
                          <td className="px-4 py-3 align-top">
                            <p className="font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                              {formatDate(s.appointment_date)}
                            </p>
                            <p className="text-[11px] tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>
                              {s.start_time.slice(0, 5)}
                            </p>
                          </td>
                          <td className="px-4 py-3 align-top" style={{ color: 'var(--admin-text)' }}>
                            {s.client_name ?? '—'}
                          </td>
                          <td className="px-4 py-3 align-top" style={{ color: 'var(--admin-text-2)' }}>
                            {s.service_name ?? '—'}
                          </td>
                          <td className="px-4 py-3 align-top" style={{ color: 'var(--admin-text-2)' }}>
                            {s.professional?.name ?? '—'}
                          </td>
                          <td className="px-4 py-3 align-top text-right tabular-nums font-semibold" style={{ color: 'var(--admin-text)' }}>
                            {formatBRL(s.total_price)}
                          </td>
                          <td className="px-4 py-3 align-top text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: toneColor }}>
                              {st.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <VendasLoadMore
            currentCount={showingTo}
            totalCount={totalCount ?? 0}
            pageSize={PAGE_SIZE}
          />
        </div>
      </div>
    </main>
  )
}
