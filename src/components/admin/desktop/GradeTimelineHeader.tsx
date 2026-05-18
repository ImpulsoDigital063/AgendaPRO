'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { IconChevronLeft, IconChevronRight, IconPlus } from '@/components/ui/Icon'

type Props = {
  date: string // YYYY-MM-DD
  totalAppts: number
}

function shiftDate(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatDate(date: string): string {
  const d = new Date(date + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

function isToday(date: string): boolean {
  return date === new Date().toISOString().slice(0, 10)
}

export default function GradeTimelineHeader({ date, totalAppts }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function navigateTo(newDate: string) {
    const params = new URLSearchParams(searchParams)
    params.set('date', newDate)
    router.push(`/admin?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4 px-1">
      <div className="flex items-center gap-1">
        <button
          onClick={() => navigateTo(new Date().toISOString().slice(0, 10))}
          className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider"
          style={{
            background: isToday(date) ? 'var(--admin-accent)' : 'var(--admin-surface)',
            color: isToday(date) ? '#fff' : 'var(--admin-text-mute)',
            border: '1px solid var(--admin-border)',
          }}
        >
          Hoje
        </button>
        <button
          onClick={() => navigateTo(shiftDate(date, -1))}
          aria-label="Dia anterior"
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: 'var(--admin-surface)',
            color: 'var(--admin-text-mute)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <IconChevronLeft size={16} />
        </button>
        <button
          onClick={() => navigateTo(shiftDate(date, 1))}
          aria-label="Próximo dia"
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: 'var(--admin-surface)',
            color: 'var(--admin-text-mute)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <IconChevronRight size={16} />
        </button>
      </div>

      <p className="text-sm font-semibold capitalize flex-1 min-w-[200px]" style={{ color: 'var(--admin-text)' }}>
        {formatDate(date)}
        <span className="ml-2 text-xs font-normal" style={{ color: 'var(--admin-text-mute)' }}>
          {totalAppts} {totalAppts === 1 ? 'agendamento' : 'agendamentos'}
        </span>
      </p>

      <Link
        href="/admin/marcar"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold"
        style={{ background: 'var(--admin-accent)', color: '#fff' }}
      >
        <IconPlus size={14} /> Agendar
      </Link>
    </div>
  )
}
