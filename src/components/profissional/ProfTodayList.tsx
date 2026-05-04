'use client'

import { useState } from 'react'
import ProfAppointmentCard from '@/components/profissional/ProfAppointmentCard'
import { IconChevronRight } from '@/components/ui/Icon'

type Appointment = React.ComponentProps<typeof ProfAppointmentCard>['appointment']

type Props = {
  active: Appointment[]
  archived: Appointment[]
  punctualityBonus?: number
  showDate?: boolean
}

/** Quantos atendimentos mostrar antes do "Ver mais". Pensado pra
 *  profissional movimentado (até 30/dia em barbearia popular). */
const VISIBLE_LIMIT = 10

export default function ProfTodayList({ active, archived, punctualityBonus, showDate }: Props) {
  const [showArchived, setShowArchived] = useState(false)
  const [showAllActive, setShowAllActive] = useState(false)

  const cancelledCount = archived.filter((a) => a.status === 'cancelled').length
  const noShowCount = archived.filter((a) => a.status === 'no_show').length
  const archivedLabel = [
    cancelledCount > 0 && `${cancelledCount} cancelado${cancelledCount > 1 ? 's' : ''}`,
    noShowCount > 0 && `${noShowCount} não veio`,
  ]
    .filter(Boolean)
    .join(' · ')

  const visibleActive = showAllActive ? active : active.slice(0, VISIBLE_LIMIT)
  const hiddenCount = active.length - visibleActive.length

  return (
    <div className="space-y-3">
      {visibleActive.map((a) => (
        <ProfAppointmentCard
          key={a.id}
          appointment={a}
          punctualityBonus={punctualityBonus}
          showDate={showDate}
        />
      ))}

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAllActive(true)}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 transition-opacity hover:opacity-90 text-sm font-semibold"
          style={{
            background: 'var(--admin-surface)',
            color: 'var(--admin-accent)',
            border: '1px solid var(--admin-divider)',
          }}
        >
          Ver mais {hiddenCount} {hiddenCount === 1 ? 'agendamento' : 'agendamentos'}
          <IconChevronRight size={14} />
        </button>
      )}

      {archived.length > 0 && (
        <div className="pt-1">
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
            <div className="space-y-3 mt-3">
              {archived.map((a) => (
                <ProfAppointmentCard key={a.id} appointment={a} punctualityBonus={punctualityBonus} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
