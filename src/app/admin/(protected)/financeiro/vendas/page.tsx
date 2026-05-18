import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'
import SubPageHeader from '@/components/admin/SubPageHeader'
import VendasFilters from '@/components/admin/vendas/VendasFilters'
import VendasLoadMore from '@/components/admin/vendas/VendasLoadMore'
import VendasTable from '@/components/admin/vendas/VendasTable'
import type { SaleRow, InvoiceItemRef } from '@/components/admin/vendas/VendasRowPopover'

const PAGE_SIZE = 100

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
      business_id,
      appointment_date,
      start_time,
      end_time,
      client_name,
      client_phone,
      customer_id,
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
  const invoicesById: Record<string, InvoiceItemRef> = {}
  if (invoiceItemIds.length > 0) {
    const { data: items } = await sb
      .from('invoice_items')
      .select(`id, invoice:invoices(id, invoice_number, status)`)
      .in('id', invoiceItemIds)
    for (const item of (items ?? []) as unknown as InvoiceItemRef[]) {
      invoicesById[item.id] = item
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

          {/* Tabela com popover */}
          {sales.length === 0 ? (
            <div
              className="rounded-2xl p-10 text-center"
              style={{
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
              }}
            >
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
            <VendasTable sales={sales} invoicesById={invoicesById} />
          )}

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
