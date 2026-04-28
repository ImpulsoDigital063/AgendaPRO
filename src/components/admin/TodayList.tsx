'use client'

import { useState } from 'react'
import AppointmentCard from '@/components/AppointmentCard'
import { IconChevronRight } from '@/components/ui/Icon'

type Appointment = React.ComponentProps<typeof AppointmentCard>['appointment']

type Props = {
  active: Appointment[]
  archived: Appointment[]
  punctualityBonus?: number
}

export default function TodayList({ active, archived, punctualityBonus }: Props) {
  const [showArchived, setShowArchived] = useState(false)

  const cancelledCount = archived.filter((a) => a.status === 'cancelled').length
  const noShowCount = archived.filter((a) => a.status === 'no_show').length

  const archivedLabel = [
    cancelledCount > 0 && `${cancelledCount} cancelado${cancelledCount > 1 ? 's' : ''}`,
    noShowCount > 0 && `${noShowCount} não veio`,
  ]
    .filter(Boolean)
    .join(' · ')

  // O "próximo" é o primeiro confirmado/pendente na lista — recebe dot pulsante no chip
  const nextUpId = active.find((a) => a.status === 'confirmed' || a.status === 'pending')?.id

  return (
    <div className="space-y-3">
      {active.map((a, i) => (
        <div
          key={a.id}
          className="admin-enter"
          style={{ ['--enter-delay' as string]: `${Math.min(i, 8) * 60}ms` }}
        >
          <AppointmentCard appointment={a} nextUp={a.id === nextUpId} punctualityBonus={punctualityBonus} />
        </div>
      ))}

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
                <AppointmentCard key={a.id} appointment={a} punctualityBonus={punctualityBonus} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
