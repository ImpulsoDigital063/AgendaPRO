'use client'

import { useState } from 'react'
import { initialsFor, avatarGradient } from '@/lib/client-display'
import { statusOf, isArchived } from '@/lib/appointment-status'
import { IconChevronRight } from '@/components/ui/Icon'

export type FinanceRow = {
  id: string
  client_name: string
  appointment_date: string
  start_time: string
  status: string
  service_name: string | null
  total_price: number | null
  professional_name?: string | null
}

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  })
}

function Row({ a }: { a: FinanceRow }) {
  const status = statusOf(a.status)
  const archived = isArchived(a.status)
  return (
    <div
      className="admin-card p-3 flex items-center gap-3"
      style={archived ? { opacity: 0.65 } : undefined}
    >
      <span
        aria-hidden
        className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
        style={{
          background: avatarGradient(a.client_name),
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 10px -4px rgba(0,0,0,0.25)',
        }}
      >
        {initialsFor(a.client_name)}
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight truncate" style={{ color: 'var(--admin-text)' }}>
          {a.client_name}
        </p>
        <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--admin-text-faded)' }}>
          {formatDate(a.appointment_date)} · {a.start_time.slice(0, 5)}
          {a.service_name ? ` · ${a.service_name}` : ''}
          {a.professional_name ? ` · ${a.professional_name}` : ''}
        </p>
      </div>

      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
        {a.total_price ? (
          <p
            className="font-bold text-sm leading-none"
            style={{
              color: archived ? 'var(--admin-text-faded)' : 'var(--admin-text)',
              textDecoration: archived ? 'line-through' : 'none',
            }}
          >
            {formatPrice(a.total_price)}
          </p>
        ) : (
          <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>—</p>
        )}
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
          style={{ background: status.bg, color: status.color }}
        >
          <span className="w-1 h-1 rounded-full" style={{ background: status.dot }} />
          {status.label}
        </span>
      </div>
    </div>
  )
}

export default function FinanceAppointmentList({ items }: { items: FinanceRow[] }) {
  const [showArchived, setShowArchived] = useState(false)

  const ativos = items.filter((a) => !isArchived(a.status))
  const archived = items.filter((a) => isArchived(a.status))

  if (items.length === 0) {
    return (
      <div className="admin-card p-8 text-center">
        <p className="text-sm font-medium" style={{ color: 'var(--admin-text-2)' }}>
          Nenhum agendamento neste período
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>
          Os atendimentos aparecem aqui assim que forem feitos
        </p>
      </div>
    )
  }

  const cancelledCount = archived.filter((a) => a.status === 'cancelled').length
  const noShowCount = archived.filter((a) => a.status === 'no_show').length
  const archivedLabel = [
    cancelledCount > 0 && `${cancelledCount} cancelado${cancelledCount > 1 ? 's' : ''}`,
    noShowCount > 0 && `${noShowCount} não veio`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="space-y-2">
      {ativos.map((a, i) => (
        <div
          key={a.id}
          className="admin-enter"
          style={{ ['--enter-delay' as string]: `${Math.min(i, 8) * 50}ms` }}
        >
          <Row a={a} />
        </div>
      ))}

      {archived.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowArchived((s) => !s)}
            className="w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 transition-opacity hover:opacity-90"
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-divider)',
            }}
          >
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--admin-text-faded)' }}
            >
              {showArchived ? 'Ocultar' : 'Mostrar'} {archivedLabel}
            </span>
            <span
              style={{
                color: 'var(--admin-text-faded)',
                transform: showArchived ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            >
              <IconChevronRight size={16} />
            </span>
          </button>

          {showArchived && (
            <div className="space-y-2 mt-2">
              {archived.map((a) => (
                <Row key={a.id} a={a} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
