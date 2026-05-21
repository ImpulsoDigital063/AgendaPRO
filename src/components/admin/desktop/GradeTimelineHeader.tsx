'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { IconChevronLeft, IconChevronRight, IconPlus, IconDollar, IconCheck, IconClock } from '@/components/ui/Icon'

type Props = {
  date: string // YYYY-MM-DD
  totalAppts: number
  /** Recebido hoje (R$) · soma dos paid_at != null */
  recebidoHoje?: number
  /** A receber hoje (R$) · soma dos confirmed/completed sem paid_at */
  aReceberHoje?: number
  /** Pendentes hoje (count) · status = pending */
  pendentesHoje?: number
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
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

export default function GradeTimelineHeader({
  date,
  totalAppts,
  recebidoHoje = 0,
  aReceberHoje = 0,
  pendentesHoje = 0,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function navigateTo(newDate: string) {
    const params = new URLSearchParams(searchParams)
    params.set('date', newDate)
    router.push(`/admin?${params.toString()}`)
  }

  return (
    <div className="mb-4 space-y-3">
      {/* Mini KPIs do dia · padrão 3D premium · só renderiza se for HOJE */}
      {isToday(date) && (
        <div className="grid grid-cols-3 gap-2">
          <MiniKPI
            label="Recebido"
            value={formatBRL(recebidoHoje)}
            color="#10B981"
            colorDark="#059669"
            Icon={IconDollar}
          />
          <MiniKPI
            label="A receber"
            value={formatBRL(aReceberHoje)}
            color="#1AA9A8"
            colorDark="#0E7C7B"
            Icon={IconCheck}
          />
          <MiniKPI
            label="Pendentes"
            value={pendentesHoje.toString()}
            color="#F59E0B"
            colorDark="#D97706"
            Icon={IconClock}
            pulse={pendentesHoje > 0}
          />
        </div>
      )}

      {/* Linha de controles · navegação + título + botão Agendar */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigateTo(new Date().toISOString().slice(0, 10))}
            className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all hover:-translate-y-px"
            style={
              isToday(date)
                ? {
                    background: 'linear-gradient(180deg, var(--brand-primary, #1AA9A8) 0%, color-mix(in srgb, var(--brand-primary, #1AA9A8) 75%, black) 100%)',
                    color: '#fff',
                    borderTop: '1px solid rgba(255,255,255,0.25)',
                    boxShadow: '0 4px 12px -2px color-mix(in srgb, var(--brand-primary, #1AA9A8) 40%, transparent)',
                  }
                : {
                    background: 'var(--admin-surface)',
                    color: 'var(--admin-text-mute)',
                    border: '1px solid var(--admin-border)',
                  }
            }
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

        {/* Botão Agendar · padrão B-híbrido premium turquesa Palace */}
        <Link
          href="/admin/marcar"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-px"
          style={{
            background: 'linear-gradient(180deg, var(--brand-primary, #1AA9A8) 0%, color-mix(in srgb, var(--brand-primary, #1AA9A8) 70%, black) 100%)',
            color: '#fff',
            borderTop: '1px solid rgba(255,255,255,0.25)',
            boxShadow: '0 8px 22px -8px color-mix(in srgb, var(--brand-primary, #1AA9A8) 55%, transparent), 0 2px 4px rgba(0,0,0,0.08)',
          }}
        >
          <IconPlus size={14} /> Agendar
        </Link>
      </div>
    </div>
  )
}

/**
 * Mini KPI card · padrão B-híbrido premium 3D.
 * Gradient sutil interno + border-top highlight + shadow longa colorida + hover lift.
 */
function MiniKPI({
  label,
  value,
  color,
  colorDark,
  Icon,
  pulse = false,
}: {
  label: string
  value: string
  color: string
  colorDark: string
  Icon: React.ComponentType<{ size?: number }>
  pulse?: boolean
}) {
  return (
    <div
      className="rounded-2xl px-3 py-2.5 flex items-center gap-2.5 transition-all hover:-translate-y-px"
      style={{
        background: `linear-gradient(180deg, color-mix(in srgb, ${color} 8%, var(--admin-surface)) 0%, color-mix(in srgb, ${color} 14%, var(--admin-surface)) 100%)`,
        border: `1px solid color-mix(in srgb, ${color} 25%, var(--admin-border))`,
        borderTopColor: 'rgba(255,255,255,0.4)',
        boxShadow: `0 8px 22px -10px color-mix(in srgb, ${color} 35%, transparent), 0 2px 4px rgba(0,0,0,0.04)`,
      }}
    >
      <span
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${pulse ? 'admin-pulse-warn' : ''}`}
        style={{
          background: `linear-gradient(135deg, ${color} 0%, ${colorDark} 100%)`,
          color: '#fff',
          boxShadow: `0 4px 8px -2px color-mix(in srgb, ${colorDark} 45%, transparent), inset 0 1px 0 rgba(255,255,255,0.3)`,
        }}
      >
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider leading-none" style={{ color: 'var(--admin-text-mute)' }}>
          {label}
        </p>
        <p className="text-base font-extrabold tabular-nums leading-tight mt-0.5" style={{ color: 'var(--admin-text)' }}>
          {value}
        </p>
      </div>
    </div>
  )
}
