'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconWhatsapp, IconCheck, IconClose, IconClock } from '@/components/ui/Icon'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'
import { statusOf, canCompleteAppointment } from '@/lib/appointment-status'

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
    paid_at?: string | null
    payment_method?: 'pix' | 'cash' | 'card' | 'courtesy' | null
    punctuality_awarded?: boolean
  }
  showDate?: boolean
  punctualityBonus?: number
}

export default function ProfAppointmentCard({ appointment, showDate, punctualityBonus = 10 }: Props) {
  const [status, setStatus] = useState(appointment.status)
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState<null | 'cancelled' | 'no_show'>(null)
  const router = useRouter()

  const config = statusOf(status)
  const isPaid = !!appointment.paid_at
  const canComplete = canCompleteAppointment(
    appointment.appointment_date,
    appointment.start_time
  )

  async function updateStatus(newStatus: 'confirmed' | 'cancelled' | 'completed' | 'no_show') {
    setLoading(true)
    const res = await fetch('/api/profissional/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: appointment.id, action: newStatus }),
    })
    if (res.ok) {
      setStatus(newStatus)
    }
    setLoading(false)
    router.refresh()
  }

  async function completeWithPunctuality() {
    setLoading(true)
    // 1. Marca como completed via API existente (dispara trigger SQL de pts de serviço)
    const res = await fetch('/api/profissional/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: appointment.id, action: 'completed' }),
    })
    if (res.ok) {
      setStatus('completed')
      // 2. Concede bônus de pontualidade
      fetch('/api/appointment/award-punctuality', {
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
      style={{ borderLeft: `3px solid ${config.color}` }}
    >
      <div className="p-4">
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
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
              style={{
                background: config.bg,
                color: config.color,
                border: `1px solid ${config.dot}30`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.dot }} />
              {config.label}
            </span>
            {isPaid && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                style={{
                  background: 'rgba(16,185,129,0.12)',
                  color: 'var(--admin-success)',
                  border: '1px solid rgba(16,185,129,0.25)',
                }}
                title={`Pago via ${appointment.payment_method ?? 'dinheiro'}`}
              >
                <span aria-hidden>$</span> Pago
              </span>
            )}
          </div>
        </div>

        {/* Serviço + preço */}
        <div className="flex items-center justify-between pl-[64px] mb-2 gap-2">
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
          <div className="pl-[64px] space-y-2">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => updateStatus('completed')}
                disabled={loading || !canComplete}
                className="flex-1 min-w-[110px] py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5 hover:translate-y-[-1px]"
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  color: '#fff',
                  boxShadow: '0 8px 20px rgba(16,185,129,0.3)',
                }}
                title={
                  canComplete
                    ? 'Atendimento concluído — credita os pontos do serviço'
                    : 'Disponível 15min antes do horário do agendamento'
                }
              >
                <IconCheck size={14} /> Atendi
              </button>
              {punctualityBonus > 0 && (
                <button
                  onClick={completeWithPunctuality}
                  disabled={loading || !canComplete}
                  className="flex-1 min-w-[110px] py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5 hover:translate-y-[-1px]"
                  style={{
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    color: '#fff',
                    boxShadow: '0 8px 20px rgba(245,158,11,0.3)',
                  }}
                  title={
                    canComplete
                      ? `Atendi + bônus de pontualidade (+${punctualityBonus} pts pro cliente)`
                      : 'Disponível 15min antes do horário do agendamento'
                  }
                >
                  <IconCheck size={14} /> Atendi +{punctualityBonus}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirm('no_show')}
                disabled={loading}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
                style={{
                  background: 'var(--admin-surface-hi)',
                  color: 'var(--admin-warn)',
                  border: '1px solid var(--admin-border)',
                }}
                title="Cliente não apareceu — não recebe pontos"
              >
                Não veio
              </button>
              <button
                onClick={() => setConfirm('cancelled')}
                disabled={loading}
                className="flex-1 py-2 rounded-xl text-xs transition-colors disabled:opacity-40"
                style={{
                  background: 'var(--admin-surface-hi)',
                  color: 'var(--admin-text-faded)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                Cancelar
              </button>
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
