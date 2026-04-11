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

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  confirmed: 'bg-green-50 text-green-600 border-green-100',
  cancelled: 'bg-gray-50 text-gray-400 border-gray-100',
}

export default function AppointmentCard({ appointment, showDate }: Props) {
  const [status, setStatus] = useState(appointment.status)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function updateStatus(newStatus: 'confirmed' | 'cancelled') {
    setLoading(true)
    const supabase = createClient()
    await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointment.id)
    setStatus(newStatus)

    // Notifica o cliente (WhatsApp via Z-API + email se tiver)
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
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900">{appointment.client_name}</p>
          <a
            href={`https://wa.me/55${appointment.client_phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-600 hover:underline"
          >
            📱 {appointment.client_phone}
          </a>
          {appointment.client_email && (
            <p className="text-xs text-gray-400 mt-0.5">{appointment.client_email}</p>
          )}
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${STATUS_COLOR[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-4">
        <span>🕐 {appointment.start_time.slice(0, 5)} – {appointment.end_time.slice(0, 5)}</span>
        {dateFormatted && <span>📅 {dateFormatted}</span>}
        {appointment.service_name && (
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">
            {appointment.service_name}
          </span>
        )}
        {appointment.professional && !appointment.service_name && (
          <span>✂️ {appointment.professional.name}</span>
        )}
        {appointment.total_price != null && appointment.total_price > 0 && (
          <span className="font-semibold text-gray-900">
            {appointment.total_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        )}
      </div>

      {status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={() => updateStatus('confirmed')}
            disabled={loading}
            className="flex-1 bg-green-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-40"
          >
            ✓ Confirmar
          </button>
          <button
            onClick={() => updateStatus('cancelled')}
            disabled={loading}
            className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-40"
          >
            ✕ Cancelar
          </button>
        </div>
      )}

      {status === 'confirmed' && (
        <button
          onClick={() => updateStatus('cancelled')}
          disabled={loading}
          className="w-full bg-gray-100 text-gray-500 py-2.5 rounded-xl text-sm hover:bg-gray-200 transition-colors disabled:opacity-40"
        >
          Cancelar agendamento
        </button>
      )}
    </div>
  )
}
