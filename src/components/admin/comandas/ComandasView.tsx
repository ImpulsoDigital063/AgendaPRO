'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconSearch, IconChevronLeft, IconChevronRight, IconCalendar } from '@/components/ui/Icon'
import { getAreaPrefix } from '@/lib/area-prefix'

export type InvoiceListItem = {
  id: string
  invoice_number: number
  status: 'open' | 'closed' | 'cancelled'
  total: number
  created_at: string
  closed_at: string | null
  /** Data efetiva (YYYY-MM-DD): dia do atendimento se ligada, senão criação. */
  ref_date: string
  customer_name: string | null
  items_count: number
  has_service: boolean
  has_product: boolean
}

// Data local (fuso do navegador = do dono) em YYYY-MM-DD
function localToday() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}
function shiftDate(ymd: string, days: number) {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
function fmtDayLabel(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}
function fmtRef(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${String(y).slice(2)}`
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

function isToday(iso: string) {
  const d = new Date(iso)
  const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

export default function ComandasView({ initialInvoices }: { initialInvoices: InvoiceListItem[] }) {
  const pathname = usePathname()
  const areaPrefix = getAreaPrefix(pathname)
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceListItem['status']>('all')
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(localToday())

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

  // Busca (por # ou cliente) varre TODOS os dias · ignora o filtro de data.
  // Sem busca, mostra só as comandas do dia selecionado (ref_date).
  const searching = search.trim().length > 0
  const base = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q) {
      const asNum = Number(q)
      return initialInvoices.filter((i) =>
        (Number.isFinite(asNum) && i.invoice_number === asNum) ||
        (i.customer_name ?? '').toLowerCase().includes(q),
      )
    }
    return initialInvoices.filter((i) => (i.ref_date ?? '') === selectedDate)
  }, [initialInvoices, search, selectedDate])

  const filtered = useMemo(
    () => (statusFilter === 'all' ? base : base.filter((i) => i.status === statusFilter)),
    [base, statusFilter],
  )

  const countByStatus = useMemo(() => ({
    all: base.length,
    open: base.filter((i) => i.status === 'open').length,
    closed: base.filter((i) => i.status === 'closed').length,
    cancelled: base.filter((i) => i.status === 'cancelled').length,
  }), [base])

  const dayTotal = useMemo(() => base.filter((i) => i.status !== 'cancelled').reduce((s, i) => s + i.total, 0), [base])

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

      {/* Navegador de dia · default hoje · calendário abre outros dias.
          Some quando está buscando (busca varre todos os dias). */}
      {!searching && (
        <div className="flex items-center gap-2 flex-wrap rounded-2xl p-2.5" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
          <button
            type="button"
            onClick={() => setSelectedDate((d) => shiftDate(d, -1))}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
            aria-label="Dia anterior"
          >
            <IconChevronLeft size={16} />
          </button>
          <label className="relative flex items-center gap-2 px-3 h-9 rounded-xl cursor-pointer" style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}>
            <IconCalendar size={15} />
            <span className="text-sm font-semibold capitalize" style={{ color: 'var(--admin-text)' }}>{fmtDayLabel(selectedDate)}</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value || localToday())}
              className="absolute inset-0 opacity-0 cursor-pointer"
              aria-label="Escolher data"
            />
          </label>
          <button
            type="button"
            onClick={() => setSelectedDate((d) => shiftDate(d, 1))}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
            aria-label="Próximo dia"
          >
            <IconChevronRight size={16} />
          </button>
          {selectedDate !== localToday() && (
            <button
              type="button"
              onClick={() => setSelectedDate(localToday())}
              className="px-3 h-9 rounded-xl text-xs font-bold"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              Hoje
            </button>
          )}
          <span className="ml-auto text-xs font-semibold tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>
            {base.length} comanda{base.length === 1 ? '' : 's'} · {brl(dayTotal)}
          </span>
        </div>
      )}

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
            {searching ? 'Nenhuma comanda encontrada' : `Nenhuma comanda em ${fmtRef(selectedDate)}`}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
            {searching ? 'Tente outro # ou nome.' : 'Use as setas ou o calendário pra ver outro dia · ou fature um atendimento.'}
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
                    href={`${areaPrefix}/comandas/${inv.id}`}
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
                      {fmtRef(inv.ref_date)}
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
