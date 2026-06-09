'use client'

import { useEffect, useState } from 'react'
import { IconClock, IconWhatsapp, IconUser } from '@/components/ui/Icon'

type Appointment = {
  id: string
  start_time: string
  appointment_date: string
  client_name: string
  client_phone: string | null
  service_name: string | null
  total_price: number | null
  status: string
  professional?: { name: string } | null
}

/**
 * Card de destaque · próximo atendimento do dia com countdown.
 * Atualiza a cada minuto. Não conta atendimentos já concluídos/cancelados.
 */
export default function RecepProximoAtendimento({ todayAppts, businessName }: { todayAppts: Appointment[]; businessName: string }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  // Acha o próximo atendimento ativo (pending/confirmed) cujo horário não passou
  const next = todayAppts
    .filter((a) => a.status === 'pending' || a.status === 'confirmed')
    .map((a) => {
      const [h, m] = a.start_time.slice(0, 5).split(':').map(Number)
      const apptTime = new Date(now)
      apptTime.setHours(h, m, 0, 0)
      return { ...a, apptTime }
    })
    .filter((a) => a.apptTime > now)
    .sort((a, b) => a.apptTime.getTime() - b.apptTime.getTime())[0]

  if (!next) {
    return (
      <div className="admin-card p-4 text-center">
        <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
          Sem próximos atendimentos pendentes hoje.
        </p>
      </div>
    )
  }

  const diffMs = next.apptTime.getTime() - now.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffH = Math.floor(diffMin / 60)
  const diffRemMin = diffMin % 60

  const countdownText =
    diffMin < 1
      ? 'começando agora'
      : diffMin < 60
        ? `em ${diffMin} min`
        : diffH < 6
          ? `em ${diffH}h${diffRemMin > 0 ? ` ${diffRemMin}min` : ''}`
          : `às ${next.start_time.slice(0, 5)}`

  const urgent = diffMin <= 15

  const whatsappLink = next.client_phone
    ? `https://wa.me/${next.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Olá ${next.client_name}! Confirmando seu atendimento hoje às ${next.start_time.slice(0, 5)} no ${businessName}.`,
      )}`
    : null

  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 18%, var(--admin-surface)) 0%, color-mix(in srgb, var(--brand-secondary) 14%, var(--admin-surface)) 100%)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <div
        className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-50 pointer-events-none"
        style={{ background: 'color-mix(in srgb, var(--brand-primary) 50%, transparent)' }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-1"
            style={{ color: urgent ? 'var(--admin-warn)' : 'var(--admin-text-faded)' }}
          >
            Próximo atendimento {urgent && '· em breve'}
          </p>
          <h2 className="text-xl font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
            {next.client_name}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
            {next.service_name ?? '—'} · {next.professional?.name ?? '—'}
          </p>
          <p className="text-2xl font-extrabold tabular-nums mt-2 inline-flex items-center gap-2" style={{ color: 'var(--admin-accent)' }}>
            <IconClock size={20} /> {countdownText}
          </p>
        </div>
      </div>

      {whatsappLink && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
          style={{
            background: 'rgba(37,211,102,0.15)',
            color: '#25D366',
            border: '1px solid rgba(37,211,102,0.3)',
          }}
        >
          <IconWhatsapp size={14} /> Confirmar pelo WhatsApp
        </a>
      )}
    </div>
  )
}
