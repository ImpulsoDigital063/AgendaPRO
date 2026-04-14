'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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

const STATUS_CONFIG: Record<string, { label: string; border: string; badge: string }> = {
  pending:   { label: 'Pendente',   border: '#FBBF24', badge: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
  confirmed: { label: 'Confirmado', border: '#3B82F6', badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20'       },
  cancelled: { label: 'Cancelado',  border: '#374151', badge: 'bg-white/5 text-gray-500 border border-white/10'              },
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
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        borderLeft: `3px solid ${config.border}`,
      }}
    >
      <div className="p-4">

        {/* Horário + nome + badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div className="text-center min-w-[48px]">
              <p className="text-blue-400 font-bold text-base leading-none">
                {appointment.start_time.slice(0, 5)}
              </p>
              <p className="text-gray-600 text-xs mt-0.5">
                {appointment.end_time.slice(0, 5)}
              </p>
            </div>
            <div>
              <p className="font-semibold text-white leading-tight">{appointment.client_name}</p>
              {dateFormatted && (
                <p className="text-gray-500 text-xs capitalize mt-0.5">{dateFormatted}</p>
              )}
            </div>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${config.badge}`}>
            {config.label}
          </span>
        </div>

        {/* Serviço + preço */}
        <div className="flex items-center justify-between pl-[60px] mb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {appointment.service_name && (
              <span className="text-xs bg-white/8 text-gray-400 px-2 py-0.5 rounded-full border border-white/10">
                {appointment.service_name}
              </span>
            )}
            {appointment.professional?.name && (
              <span className="text-xs text-gray-600">{appointment.professional.name}</span>
            )}
          </div>
          {appointment.total_price != null && appointment.total_price > 0 && (
            <p className="text-sm font-bold text-white">
              {appointment.total_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          )}
        </div>

        {/* WhatsApp */}
        <div className="pl-[60px] mb-3">
          <a
            href={`https://wa.me/55${appointment.client_phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-400/80 hover:text-emerald-400 font-medium transition-colors"
          >
            WhatsApp: {appointment.client_phone}
          </a>
        </div>

        {/* Ações */}
        {status === 'pending' && (
          <div className="flex gap-2 pl-[60px]">
            <button
              onClick={() => updateStatus('confirmed')}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-500 transition-colors disabled:opacity-40"
            >
              Confirmar
            </button>
            <button
              onClick={() => updateStatus('cancelled')}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}
            >
              Cancelar
            </button>
          </div>
        )}

        {status === 'confirmed' && (
          <div className="pl-[60px]">
            <button
              onClick={() => updateStatus('cancelled')}
              disabled={loading}
              className="w-full py-2 rounded-xl text-sm transition-colors disabled:opacity-40 text-gray-600 hover:text-gray-400"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              Cancelar agendamento
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
