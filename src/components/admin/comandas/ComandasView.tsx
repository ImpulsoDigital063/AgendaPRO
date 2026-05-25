'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { IconSearch } from '@/components/ui/Icon'

export type InvoiceListItem = {
  id: string
  invoice_number: number
  status: 'open' | 'closed' | 'cancelled'
  total: number
  created_at: string
  closed_at: string | null
  customer_name: string | null
  items_count: number
  has_service: boolean
  has_product: boolean
}

const STATUS_LABEL: Record<InvoiceListItem['status'], string> = {
  open: 'Aberta',
  closed: 'Paga',
  cancelled: 'Cancelada',
}

const STATUS_COLOR: Record<InvoiceListItem['status'], { bg: string; fg: string }> = {
  open: { bg: '#FEF3C7', fg: '#B45309' },
  closed: { bg: '#DCFCE7', fg: '#166534' },
  cancelled: { bg: '#FEE2E2', fg: '#991B1B' },
}

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function isToday(iso: string) {
  const d = new Date(iso)
  const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

export default function ComandasView({ initialInvoices }: { initialInvoices: InvoiceListItem[] }) {
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceListItem['status']>('all')
  const [search, setSearch] = useState('')

  const kpis = useMemo(() => {
    const hojePago = initialInvoices
      .filter((i) => i.status === 'closed' && i.closed_at && isToday(i.closed_at))
      .reduce((s, i) => s + i.total, 0)
    const abertas = initialInvoices.filter((i) => i.status === 'open').length
    const mes = initialInvoices
      .filter((i) => i.status === 'closed' && i.closed_at && new Date(i.closed_at).getMonth() === new Date().getMonth())
      .reduce((s, i) => s + i.total, 0)
    return { hojePago, abertas, mes }
  }, [initialInvoices])

  const filtered = useMemo(() => {
    let list = initialInvoices
    if (statusFilter !== 'all') list = list.filter((i) => i.status === statusFilter)
    const q = search.trim().toLowerCase()
    if (q) {
      const asNum = Number(q)
      list = list.filter((i) => {
        if (Number.isFinite(asNum) && i.invoice_number === asNum) return true
        return (i.customer_name ?? '').toLowerCase().includes(q)
      })
    }
    return list
  }, [initialInvoices, statusFilter, search])

  const countByStatus = useMemo(() => ({
    all: initialInvoices.length,
    open: initialInvoices.filter((i) => i.status === 'open').length,
    closed: initialInvoices.filter((i) => i.status === 'closed').length,
    cancelled: initialInvoices.filter((i) => i.status === 'cancelled').length,
  }), [initialInvoices])

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
            Financeiro
          </p>
          <h1 className="text-2xl font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
            Comandas
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
            Cada visita do cliente vira uma comanda · serviço + produto na mesma conta
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Recebido hoje" value={brl(kpis.hojePago)} hint="Comandas pagas hoje" />
        <KpiCard label="Comandas abertas" value={String(kpis.abertas)} hint="Aguardam pagamento" />
        <KpiCard label="Recebido no mês" value={brl(kpis.mes)} hint="Comandas pagas no mês" />
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
            Todas <Count>{countByStatus.all}</Count>
          </FilterChip>
          <FilterChip active={statusFilter === 'open'} onClick={() => setStatusFilter('open')}>
            Abertas <Count>{countByStatus.open}</Count>
          </FilterChip>
          <FilterChip active={statusFilter === 'closed'} onClick={() => setStatusFilter('closed')}>
            Pagas <Count>{countByStatus.closed}</Count>
          </FilterChip>
          <FilterChip active={statusFilter === 'cancelled'} onClick={() => setStatusFilter('cancelled')}>
            Canceladas <Count>{countByStatus.cancelled}</Count>
          </FilterChip>
        </div>

        <div className="flex-1 min-w-[200px] relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--admin-text-faded)' }}>
            <IconSearch size={14} />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por # ou cliente"
            className="admin-input w-full pl-9 pr-3 py-2 rounded-xl text-sm"
          />
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--admin-surface)', border: '1px dashed var(--admin-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Nenhuma comanda {statusFilter === 'all' ? 'ainda' : 'nesse filtro'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
            Aperte FATURAR no atendimento da agenda pra criar a primeira.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
          {/* Header tabela · desktop */}
          <div className="hidden sm:grid items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest" style={{ gridTemplateColumns: '80px 1fr 100px 120px 1fr 110px 110px', color: 'var(--admin-text-faded)', borderBottom: '1px solid var(--admin-divider)' }}>
            <span>#</span>
            <span>Cliente</span>
            <span>Itens</span>
            <span>Composição</span>
            <span>Data</span>
            <span className="text-right">Total</span>
            <span className="text-right">Status</span>
          </div>

          <ul className="divide-y" style={{ borderColor: 'var(--admin-divider)' }}>
            {filtered.map((inv) => {
              const color = STATUS_COLOR[inv.status]
              const composicao = [
                inv.has_service ? 'Serviço' : null,
                inv.has_product ? 'Produto' : null,
              ].filter(Boolean).join(' + ') || '—'
              return (
                <li key={inv.id} style={{ borderColor: 'var(--admin-divider)' }}>
                  <Link
                    href={`/admin/comandas/${inv.id}`}
                    className="grid sm:grid-cols-[80px_1fr_100px_120px_1fr_110px_110px] grid-cols-1 items-center gap-3 px-4 py-3 hover:bg-[color-mix(in_srgb,var(--admin-accent)_4%,transparent)] transition-colors"
                  >
                    <span className="font-bold tabular-nums text-sm" style={{ color: 'var(--admin-text)' }}>
                      #{inv.invoice_number}
                    </span>
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--admin-text)' }}>
                      {inv.customer_name ?? <span style={{ color: 'var(--admin-text-faded)', fontStyle: 'italic', fontWeight: 400 }}>sem cliente</span>}
                    </span>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>
                      {inv.items_count} {inv.items_count === 1 ? 'item' : 'itens'}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                      {composicao}
                    </span>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>
                      {fmtDate(inv.created_at)}
                    </span>
                    <span className="text-sm font-bold tabular-nums sm:text-right" style={{ color: 'var(--admin-text)' }}>
                      {brl(inv.total)}
                    </span>
                    <span className="sm:text-right">
                      <span
                        className="inline-block px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: color.bg, color: color.fg }}
                      >
                        {STATUS_LABEL[inv.status]}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
        borderTop: '2px solid color-mix(in srgb, var(--admin-accent) 60%, transparent)',
        boxShadow: '0 6px 16px -8px color-mix(in srgb, var(--admin-accent) 25%, transparent)',
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums mt-0.5" style={{ color: 'var(--admin-text)' }}>{value}</p>
      <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-mute)' }}>{hint}</p>
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
      style={{
        background: active ? 'var(--admin-accent)' : 'var(--admin-surface)',
        color: active ? '#fff' : 'var(--admin-text)',
        border: `1px solid ${active ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
      }}
    >
      {children}
    </button>
  )
}

function Count({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[10px] font-bold tabular-nums px-1.5 rounded-full"
      style={{ background: 'rgba(0,0,0,0.18)', color: 'inherit' }}
    >
      {children}
    </span>
  )
}
