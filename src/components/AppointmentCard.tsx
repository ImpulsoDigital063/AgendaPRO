'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { IconWhatsapp, IconCheck, IconClose, IconClock } from '@/components/ui/Icon'

type Props = {
  appointment: {
    id: string
    client_name: string
    client_phone: string
    client_email?: string | null
    start_time: string
    end_time: string
    appointment_date: string
    status: string
    service_name?: string | null
    total_price?: number | null
    professional?: { name: string } | null
  }
  showDate?: boolean
}

const STATUS_CONFIG: Record<string, { label: string; border: string; dot: string; chipBg: string; chipColor: string }> = {
  pending: {
    label: 'Pendente',
    border: 'var(--admin-warn)',
    dot: 'var(--admin-warn)',
    chipBg: 'rgba(245,158,11,0.12)',
    chipColor: 'var(--admin-warn)',
  },
  confirmed: {
    label: 'Confirmado',
    border: 'var(--admin-accent)',
    dot: 'var(--admin-accent)',
    chipBg: 'var(--admin-accent-bg)',
    chipColor: 'var(--admin-accent)',
  },
  cancelled: {
    label: 'Cancelado',
    border: 'var(--admin-text-faded)',
    dot: 'var(--admin-text-faded)',
    chipBg: 'rgba(148,163,184,0.12)',
    chipColor: 'var(--admin-text-faded)',
  },
}

export default function AppointmentCard({ appointment, showDate }: Props) {
  const [status, setStatus] = useState(appointment.status)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending

  async function updateStatus(newStatus: 'confirmed' | 'cancelled') {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('appointments').update({ status: newStatus }).eq('id', appointment.id)
    setStatus(newStatus)
    fetch('/api/notify-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: appointment.id, status: newStatus }),
    }).catch(() => {})
    setLoading(false)
    router.refresh()
  }

  const dateFormatted = showDate
    ? new Date(appointment.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR', {
        weekday: 'short', day: 'numeric', month: 'short',
      })
    : null

  return (
    <div
      className="rounded-2xl overflow-hidden admin-card"
      style={{
        borderLeft: `3px solid ${config.border}`,
      }}
    >
      <div className="p-4">
        {/* Horário + nome + badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div
              className="text-center min-w-[52px] rounded-xl py-1.5 px-1"
              style={{
                background: 'var(--admin-accent-bg)',
                border: '1px solid var(--admin-accent-border)',
              }}
            >
              <p className="font-bold text-base leading-none" style={{ color: 'var(--admin-accent)' }}>
                {appointment.start_time.slice(0, 5)}
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                <IconClock size={10} className="inline mr-0.5" />
                {appointment.end_time.slice(0, 5)}
              </p>
            </div>
            <div>
              <p className="font-semibold leading-tight" style={{ color: 'var(--admin-text)' }}>
                {appointment.client_name}
              </p>
              {dateFormatted && (
                <p className="text-xs capitalize mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                  {dateFormatted}
                </p>
              )}
            </div>
          </div>
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 inline-flex items-center gap-1.5"
            style={{
              background: config.chipBg,
              color: config.chipColor,
              border: `1px solid ${config.dot}30`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.dot }} />
            {config.label}
          </span>
        </div>

        {/* Serviço + preço */}
        <div className="flex items-center justify-between pl-[64px] mb-2 gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {appointment.service_name && (
              <span
                className="text-xs px-2 py-0.5 rounded-full truncate"
                style={{
                  background: 'var(--admin-surface-hi)',
                  color: 'var(--admin-text-2)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                {appointment.service_name}
              </span>
            )}
            {appointment.professional?.name && (
              <span className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
                · {appointment.professional.name}
              </span>
            )}
          </div>
          {appointment.total_price != null && appointment.total_price > 0 && (
            <p className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--admin-text)' }}>
              {appointment.total_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          )}
        </div>

        {/* WhatsApp */}
        <div className="pl-[64px] mb-3">
          <a
            href={`https://wa.me/55${appointment.client_phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium inline-flex items-center gap-1.5 transition-opacity hover:opacity-80"
            style={{ color: 'var(--admin-success)' }}
          >
            <IconWhatsapp size={14} />
            {appointment.client_phone}
          </a>
        </div>

        {/* Ações */}
        {status === 'pending' && (
          <div className="flex gap-2 pl-[64px]">
            <button
              onClick={() => updateStatus('confirmed')}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 inline-flex items-center justify-center gap-1.5 hover:translate-y-[-1px]"
              style={{
                background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                color: '#fff',
                boxShadow: '0 8px 20px rgba(59,130,246,0.35)',
              }}
            >
              <IconCheck size={14} /> Confirmar
            </button>
            <button
              onClick={() => updateStatus('cancelled')}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
              style={{
                background: 'var(--admin-surface-hi)',
                color: 'var(--admin-text-mute)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <IconClose size={14} /> Cancelar
            </button>
          </div>
        )}

        {status === 'confirmed' && (
          <div className="pl-[64px]">
            <button
              onClick={() => updateStatus('cancelled')}
              disabled={loading}
              className="w-full py-2 rounded-xl text-xs transition-colors disabled:opacity-40"
              style={{
                background: 'var(--admin-surface-hi)',
                color: 'var(--admin-text-faded)',
                border: '1px solid var(--admin-border)',
              }}
            >
              Cancelar agendamento
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
