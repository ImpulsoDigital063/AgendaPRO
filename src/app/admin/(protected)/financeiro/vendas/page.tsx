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
  searchParams: Promise<{
    q?: string
    status?: string
    type?: string
    offset?: string
    from?: string
    to?: string
    prof?: string
  }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect('/cadastro')

  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const status = sp.status ?? 'all'
  const from = sp.from ?? ''
  const to = sp.to ?? ''
  const profFilter = sp.prof ?? ''
  const offset = Math.max(0, parseInt(sp.offset ?? '0', 10) || 0)

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const today = new Date().toISOString().slice(0, 10)
  // Se usuário definiu range, "to" prevalece sobre "today". Se só "from",
  // mantém today como upper bound (não faz sentido exportar futuro).
  const upperBound = to || today

  // Lista de profissionais ativos pro select de filtro
  const { data: professionals } = await sb
    .from('professionals')
    .select('id, name')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('name')

  // Query base · só vendas realizadas (passado + hoje · respeitando range)
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
    .lte('appointment_date', upperBound)

  let countQuery = sb
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', business.id)
    .lte('appointment_date', upperBound)

  if (from) {
    listQuery = listQuery.gte('appointment_date', from)
    countQuery = countQuery.gte('appointment_date', from)
  }

  if (profFilter) {
    listQuery = listQuery.eq('professional_id', profFilter)
    countQuery = countQuery.eq('professional_id', profFilter)
  }

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
  const apptSales = (appts ?? []) as unknown as SaleRow[]

  // ── Vendas avulsas de produto (sales type=product_sale) ───────────────
  // Unifica na mesma listagem · cada sale vira uma "row" com descrição dos
  // produtos vendidos juntados por "+". appointment_date = sale_date.
  let productSalesQuery = sb
    .from('sales')
    .select(`
      id, business_id, sale_date, created_at,
      client_name, client_phone, customer_id,
      total, status, paid_at, payment_method, invoice_id, professional_id,
      appointment_id,
      professional:professionals(name),
      appointment:appointments(start_time),
      sale_items(product_name, quantity)
    `)
    .eq('business_id', business.id)
    .eq('type', 'product_sale')
    .lte('sale_date', upperBound)
    .order('sale_date', { ascending: false })
    .limit(PAGE_SIZE * 2)

  if (from) productSalesQuery = productSalesQuery.gte('sale_date', from)
  if (profFilter) productSalesQuery = productSalesQuery.eq('professional_id', profFilter)
  if (status === 'pending') productSalesQuery = productSalesQuery.eq('status', 'pending')
  else if (status === 'paid') productSalesQuery = productSalesQuery.eq('status', 'paid').is('invoice_id', null)
  else if (status === 'invoiced') productSalesQuery = productSalesQuery.not('invoice_id', 'is', null)
  else if (status === 'cancelled') productSalesQuery = productSalesQuery.eq('status', 'cancelled')

  if (q) {
    const term = q.replace(/[%_]/g, '\\$&')
    productSalesQuery = productSalesQuery.ilike('client_name', `%${term}%`)
  }

  const { data: rawProductSales } = await productSalesQuery

  type ProductSaleRow = {
    id: string
    business_id: string
    sale_date: string
    created_at: string
    client_name: string | null
    client_phone: string | null
    customer_id: string | null
    total: number | null
    status: string
    paid_at: string | null
    payment_method: string | null
    invoice_id: string | null
    professional_id: string | null
    appointment_id: string | null
    professional: { name: string } | { name: string }[] | null
    appointment: { start_time: string } | { start_time: string }[] | null
    sale_items: { product_name: string; quantity: number }[] | null
  }

  const productRows: SaleRow[] = ((rawProductSales ?? []) as ProductSaleRow[]).map((s) => {
    const prof = Array.isArray(s.professional) ? s.professional[0] : s.professional
    const appt = Array.isArray(s.appointment) ? s.appointment[0] : s.appointment
    const items = s.sale_items ?? []
    const desc = items.length === 0
      ? 'Venda de produto'
      : items.map((it) => `${it.product_name}${Number(it.quantity) > 1 ? ` (${it.quantity})` : ''}`).join(' + ')
    // Horário: prioriza start_time do appointment vinculado (faz a linha
    // do produto ficar grudada na linha do serviço na mesma comanda).
    // Fallback: created_at da sale.
    const apptHHMM = appt?.start_time ? appt.start_time.slice(0, 5) : null
    const fallbackHHMM = new Date(s.created_at).toISOString().slice(11, 16)
    const hh = apptHHMM ?? fallbackHHMM
    return {
      id: s.id,
      business_id: s.business_id,
      appointment_date: s.sale_date,
      start_time: `${hh}:00`,
      end_time: null,
      client_name: s.client_name,
      client_phone: s.client_phone,
      customer_id: s.customer_id,
      service_name: desc,
      total_price: Number(s.total ?? 0),
      status: s.status === 'paid' ? 'completed' : s.status,
      paid_at: s.paid_at,
      payment_method: s.payment_method,
      // sales não tem invoice_item_id; mas tem invoice_id · pra a tabela
      // mostrar chip de "#NN" precisamos resolver o invoice abaixo
      invoice_item_id: s.invoice_id, // reaproveita o slot pra lookup
      professional: prof ?? null,
    }
  })

  // Merge ordenado por (data desc, hora desc) · slice no PAGE_SIZE
  const merged = [...apptSales, ...productRows].sort((a, b) => {
    if (a.appointment_date !== b.appointment_date) return a.appointment_date > b.appointment_date ? -1 : 1
    return a.start_time > b.start_time ? -1 : 1
  })
  const sales = merged.slice(0, PAGE_SIZE)

  // Carrega invoices vinculadas (pra status #NNNN) · agora aceita 2 fontes:
  // - appointments.invoice_item_id (slot original)
  // - sales.invoice_id (reaproveitado · busca invoice direto por id)
  const apptInvoiceItemIds = apptSales.map((s) => s.invoice_item_id).filter(Boolean) as string[]
  const productInvoiceIds = productRows.map((s) => s.invoice_item_id).filter(Boolean) as string[]
  const invoiceItemIds = apptInvoiceItemIds
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
  // Pra sales (produto avulso), o slot invoice_item_id contém invoice.id direto
  if (productInvoiceIds.length > 0) {
    const { data: invs } = await sb
      .from('invoices')
      .select('id, invoice_number, status')
      .in('id', productInvoiceIds)
    for (const inv of invs ?? []) {
      invoicesById[inv.id as string] = {
        id: inv.id as string,
        invoice: {
          id: inv.id as string,
          invoice_number: inv.invoice_number as number,
          status: inv.status as string,
        },
      }
    }
  }

  // totalCount agora soma appointments + sales · aproximação suficiente p/ paginação V1
  const totalCountUnified = (totalCount ?? 0) + productRows.length
  const showingFrom = sales.length > 0 ? offset + 1 : 0
  const showingTo = offset + sales.length

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <div className="relative">
        <SubPageHeader
          title="Vendas"
          subtitle={business.name}
          back="/admin/financeiro"
          right={
            <a
              href="/admin/produtos/vender"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:-translate-y-px"
              style={{
                background: 'linear-gradient(180deg, var(--brand-primary, #3B82F6) 0%, color-mix(in srgb, var(--brand-primary, #3B82F6) 70%, black) 100%)',
                color: '#fff',
                borderTop: '1px solid rgba(255,255,255,0.25)',
                boxShadow: '0 4px 12px -4px color-mix(in srgb, var(--brand-primary, #3B82F6) 50%, transparent)',
              }}
            >
              + Nova venda
            </a>
          }
        />
        <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-7xl lg:px-8">
          <VendasFilters professionals={professionals ?? []} />

          {/* Contador */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
              {totalCountUnified === 0
                ? 'Nenhuma venda encontrada'
                : `Exibindo ${showingFrom}–${showingTo} de ${totalCountUnified} ${totalCountUnified === 1 ? 'venda' : 'vendas'}`}
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
            totalCount={totalCountUnified}
            pageSize={PAGE_SIZE}
          />
        </div>
      </div>
    </main>
  )
}
