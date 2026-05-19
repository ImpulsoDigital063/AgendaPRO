'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect, useTransition } from 'react'
import { IconSearch } from '@/components/ui/Icon'

type StatusFilter = 'all' | 'pending' | 'paid' | 'invoiced' | 'cancelled'

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Sem Fatura · Pendente' },
  { value: 'paid', label: 'Pago' },
  { value: 'invoiced', label: 'Fatura Fechada' },
  { value: 'cancelled', label: 'Canceladas' },
]

const TYPE_OPTIONS = [
  { value: 'all', label: 'Exibir Todos', disabled: false },
  { value: 'appointment', label: 'Atendimento', disabled: false },
  { value: 'product', label: 'Venda de Produto · Em breve', disabled: true },
  { value: 'package', label: 'Venda de Pacote · Em breve', disabled: true },
  { value: 'credit', label: 'Crédito Avulso · Em breve', disabled: true },
]

type Prof = { id: string; name: string }

type Props = {
  professionals?: Prof[]
}

export default function VendasFilters({ professionals = [] }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const currentStatus = (searchParams.get('status') as StatusFilter) ?? 'all'
  const currentType = searchParams.get('type') ?? 'all'
  const currentQ = searchParams.get('q') ?? ''
  const currentFrom = searchParams.get('from') ?? ''
  const currentTo = searchParams.get('to') ?? ''
  const currentProf = searchParams.get('prof') ?? ''

  const [search, setSearch] = useState(currentQ)

  useEffect(() => {
    if (search === currentQ) return
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams)
      if (search) params.set('q', search)
      else params.delete('q')
      params.delete('offset')
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`)
      })
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function applyFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams)
    if (!value || value === 'all') params.delete(key)
    else params.set(key, value)
    params.delete('offset')
    router.push(`${pathname}?${params.toString()}`)
  }

  function clearFilters() {
    setSearch('')
    router.push(pathname)
  }

  function exportCSV() {
    const params = new URLSearchParams(searchParams)
    window.location.href = `/api/admin/sales/export?${params.toString()}`
  }

  const hasFilters = !!(currentQ || currentStatus !== 'all' || currentType !== 'all' || currentFrom || currentTo || currentProf)

  return (
    <div className="mb-4 space-y-2">
      {/* Linha 1 · Busca + filtros principais + exportar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--admin-text-faded)' }}
          >
            <IconSearch size={16} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar por cliente ou serviço..."
            className="admin-input w-full pl-9 pr-3 py-2.5 text-sm"
          />
        </div>

        <select
          value={currentType}
          onChange={(e) => applyFilter('type', e.target.value)}
          className="admin-input text-sm py-2.5 px-3"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={currentStatus}
          onChange={(e) => applyFilter('status', e.target.value)}
          className="admin-input text-sm py-2.5 px-3"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={exportCSV}
          className="px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            color: 'var(--admin-text)',
          }}
          title="Exportar resultado atual em CSV"
        >
          Exportar CSV
        </button>
      </div>

      {/* Linha 2 · Datas + profissional + limpar */}
      <div className="flex flex-wrap gap-2 items-center">
        <DateField
          label="De"
          value={currentFrom}
          onChange={(v) => applyFilter('from', v)}
        />
        <DateField
          label="Até"
          value={currentTo}
          onChange={(v) => applyFilter('to', v)}
        />

        {professionals.length > 0 && (
          <select
            value={currentProf}
            onChange={(e) => applyFilter('prof', e.target.value)}
            className="admin-input text-sm py-2.5 px-3"
          >
            <option value="">Todos os profissionais</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors"
            style={{
              background: 'transparent',
              color: 'var(--admin-text-mute)',
              border: '1px solid var(--admin-border)',
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  )
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label
      className="flex items-center gap-2 rounded-xl px-3 py-1 text-sm"
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent border-none outline-none text-sm py-1.5"
        style={{ color: 'var(--admin-text)' }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-xs"
          style={{ color: 'var(--admin-text-faded)' }}
          aria-label="Limpar"
        >
          ✕
        </button>
      )}
    </label>
  )
}
