'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { IconWhatsapp, IconCheck, IconClose } from '@/components/ui/Icon'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'

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
  completed: {
    label: 'Concluído',
    border: 'var(--admin-success)',
    dot: 'var(--admin-success)',
    chipBg: 'rgba(34,197,94,0.12)',
    chipColor: 'var(--admin-success)',
  },
  no_show: {
    label: 'Não veio',
    border: 'var(--admin-text-faded)',
    dot: 'var(--admin-text-faded)',
    chipBg: 'rgba(148,163,184,0.12)',
    chipColor: 'var(--admin-text-faded)',
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
  const [confirm, setConfirm] = useState<null | 'cancelled' | 'no_show'>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending

  useEffect(() => {
    if (!menuOpen) return
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen])

  async function updateStatus(newStatus: 'confirmed' | 'cancelled' | 'no_show' | 'completed') {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('appointments').update({ status: newStatus }).eq('id', appointment.id)
    setStatus(newStatus)
    fetch('/api/notify-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: appointment.id, status: newStatus }),
    }).catch(() => {})
    if (newStatus === 'cancelled') {
      fetch('/api/waitlist/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: appointment.id }),
      }).catch(() => {})
    }
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
              className="text-center min-w-[58px] rounded-xl py-1.5 px-1.5"
              style={{
                background: 'var(--admin-accent-bg)',
                border: '1px solid var(--admin-accent-border)',
              }}
            >
              <p className="font-bold text-base leading-none tabular-nums" style={{ color: 'var(--admin-accent)' }}>
                {appointment.start_time.slice(0, 5)}
              </p>
              <p className="text-[10px] mt-1 tabular-nums" style={{ color: 'var(--admin-text-faded)' }}>
                até {appointment.end_time.slice(0, 5)}
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
              onClick={() => setConfirm('cancelled')}
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
          <div className="pl-[64px] flex items-stretch gap-2">
            <button
              onClick={() => updateStatus('completed')}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 inline-flex items-center justify-center gap-1.5 hover:translate-y-[-1px]"
              style={{
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: '#fff',
                boxShadow: '0 8px 20px rgba(16,185,129,0.3)',
              }}
              title="Atendimento concluído — credita os pontos do cliente"
            >
              <IconCheck size={14} /> Atendi
            </button>
            <div className="relative flex-shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                disabled={loading}
                aria-label="Mais ações"
                title="Mais ações"
                className="h-full w-11 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40"
                style={{
                  background: 'var(--admin-surface-hi)',
                  color: 'var(--admin-text-mute)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <circle cx="5" cy="12" r="1.6" />
                  <circle cx="12" cy="12" r="1.6" />
                  <circle cx="19" cy="12" r="1.6" />
                </svg>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 z-30 rounded-xl py-1.5 min-w-[160px] shadow-lg"
                  style={{
                    background: 'var(--admin-surface)',
                    border: '1px solid var(--admin-border)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      setConfirm('no_show')
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:opacity-80"
                    style={{ color: 'var(--admin-warn)' }}
                  >
                    Não veio
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      setConfirm('cancelled')
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:opacity-80"
                    style={{ color: 'var(--admin-text-faded)' }}
                  >
                    Cancelar agendamento
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmActionModal
        open={confirm === 'cancelled'}
        title="Cancelar agendamento?"
        message={`Vai cancelar o agendamento de ${appointment.client_name} às ${appointment.start_time.slice(0, 5)}. O cliente é notificado e a vaga vira pra fila de espera.`}
        confirmLabel="Sim, cancelar"
        cancelLabel="Voltar"
        tone="danger"
        loading={loading}
        onConfirm={async () => {
          await updateStatus('cancelled')
          setConfirm(null)
        }}
        onClose={() => setConfirm(null)}
      />
      <ConfirmActionModal
        open={confirm === 'no_show'}
        title="Marcar como não veio?"
        message={`${appointment.client_name} não apareceu no horário das ${appointment.start_time.slice(0, 5)}? O agendamento fica registrado e o cliente não recebe pontos.`}
        confirmLabel="Sim, não veio"
        cancelLabel="Voltar"
        tone="warn"
        loading={loading}
        onConfirm={async () => {
          await updateStatus('no_show')
          setConfirm(null)
        }}
        onClose={() => setConfirm(null)}
      />
    </div>
  )
}
