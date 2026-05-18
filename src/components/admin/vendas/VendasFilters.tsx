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

export default function VendasFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const currentStatus = (searchParams.get('status') as StatusFilter) ?? 'all'
  const currentType = searchParams.get('type') ?? 'all'
  const currentQ = searchParams.get('q') ?? ''

  const [search, setSearch] = useState(currentQ)

  // Debounce: 300ms após parar de digitar → atualiza URL
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

  function applyFilter(key: 'status' | 'type', value: string) {
    const params = new URLSearchParams(searchParams)
    if (value === 'all') params.delete(key)
    else params.set(key, value)
    params.delete('offset')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4 items-center">
      {/* Busca */}
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
          placeholder="Procurar por cliente, serviço ou profissional..."
          className="admin-input w-full pl-9 pr-3 py-2.5 text-sm"
        />
      </div>

      {/* Tipo */}
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

      {/* Situação */}
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
    </div>
  )
}
