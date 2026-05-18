import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'
import SubPageHeader from '@/components/admin/SubPageHeader'

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

export default async function VendasPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect('/cadastro')

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Últimos 100 atendimentos do business · ordenados desc
  const { data: appts } = await sb
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
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false })
    .limit(100)

  const sales = (appts ?? []) as unknown as SaleRow[]

  // Carrega invoices dos invoice_item_id presentes (pra mostrar #NNNN · status)
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

  // Contagem total · pra mostrar "X de Y"
  const { count: totalCount } = await sb
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', business.id)

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <div className="relative">
        <SubPageHeader title="Vendas" subtitle={business.name} back="/admin/financeiro" />
        <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-7xl lg:px-8">
          {/* Header com contagem */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
              Exibindo {sales.length} {sales.length === 1 ? 'venda' : 'vendas'} mais recentes
              {totalCount != null && totalCount > sales.length && ` de ${totalCount} totais`}
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
                  Nenhuma venda registrada
                </p>
                <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                  As vendas vão aparecer aqui conforme atendimentos forem criados.
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
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                        Data
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                        Cliente
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                        Descrição
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                        Profissional
                      </th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                        Valor
                      </th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                        Situação
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((s, idx) => {
                      const status = describeStatus(s, invoicesById)
                      const toneColor = {
                        pending: 'var(--admin-text-mute)',
                        paid: '#10B981',
                        invoiced: 'var(--admin-accent)',
                        cancelled: 'var(--admin-danger,#EF4444)',
                      }[status.tone]
                      return (
                        <tr
                          key={s.id}
                          style={{
                            borderBottom: idx < sales.length - 1 ? '1px solid var(--admin-divider)' : 'none',
                          }}
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
                            <span
                              className="inline-flex items-center gap-1 text-xs font-semibold"
                              style={{ color: toneColor }}
                            >
                              {status.label}
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
        </div>
      </div>
    </main>
  )
}
