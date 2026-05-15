'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { IconWhatsapp, IconCheck, IconClose, IconPencil } from '@/components/ui/Icon'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'
import PaymentMethodModal, { type PaymentMethodChoice } from '@/components/admin/PaymentMethodModal'
import EditServicesModal from '@/components/admin/EditServicesModal'
import { initialsFor, avatarGradient, maskPhone } from '@/lib/client-display'
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
    professional?: { name: string } | null
    punctuality_awarded?: boolean
  }
  showDate?: boolean
  nextUp?: boolean
  punctualityBonus?: number
}

export default function AppointmentCard({ appointment, showDate, nextUp, punctualityBonus = 10 }: Props) {
  const [status, setStatus] = useState(appointment.status)
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState<null | 'cancelled' | 'no_show'>(null)
  // Modal de pagamento — só abre via botão "Atendi e recebi". Botão
  // "Atendi" simples conclui sem método (pra quem cobra fora do app).
  const [paymentModal, setPaymentModal] = useState(false)
  // Toggle de pontualidade. Quando ON, qualquer fluxo de complete
  // (Atendi OU Atendi e recebi) dispara o bônus depois do update.
  const [withPunctuality, setWithPunctuality] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  // Modal "atendi com antecedência" — pede confirmação se o admin
  // tentar marcar como atendido antes da janela de 15min pré-horário.
  // Memória da decisão: profissional que atende cedo (cliente chegou
  // antes, próximo cancelou) precisa do controle. Sem isso o slot fica
  // ocupado mesmo o atendimento já tendo ocorrido.
  const [earlyConfirm, setEarlyConfirm] = useState<null | 'atendi' | 'recebi'>(null)
  // Modal de edição de serviços (v · 14/05/2026) — disponível em
  // pending/confirmed/completed/no_show. Acionado pelo lápis ao lado do
  // chip do serviço. Não toca em pontos · ajuste fica manual no perfil
  // do cliente.
  const [editServicesOpen, setEditServicesOpen] = useState(false)
  // Punição por no-show (v45 · 14/05/2026) — lazy-load quando status=no_show.
  // Mostra tag "−Xpts" + botão "Reverter" se houve punição aplicada.
  const [penaltyInfo, setPenaltyInfo] = useState<{
    hasPenalty: boolean
    penaltyPoints: number | null
    alreadyRelevado: boolean
  } | null>(null)
  const [revertingPenalty, setRevertingPenalty] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()

  const canEditServices = ['pending', 'confirmed', 'completed', 'no_show'].includes(status)

  const config = statusOf(status)
  const isPaid = !!appointment.paid_at
  // canComplete: true se faltam ≤15min pro horário (regra v1).
  // v1.2: deixou de bloquear o botão — agora só decide se abre direto
  // ou pede confirmação extra ao admin.
  const canComplete = canCompleteAppointment(
    appointment.appointment_date,
    appointment.start_time
  )

  // Quantos minutos faltam pro horário. Usado pra mostrar no modal de
  // confirmação ("faltam X min"). Negativo se o horário já passou —
  // nesse caso canComplete já é true e o modal nem aparece.
  function minutesUntilStart(): number {
    const start = new Date(`${appointment.appointment_date}T${appointment.start_time}`)
    const diffMs = start.getTime() - Date.now()
    return Math.max(0, Math.round(diffMs / 60000))
  }

  useEffect(() => {
    if (!menuOpen) return
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen])

  // Carrega penalty info quando status=no_show (v45 · lazy-load)
  useEffect(() => {
    if (status !== 'no_show') return
    let cancelled = false
    fetch(`/api/admin/appointments/${appointment.id}/penalty-info`, {
      cache: 'no-store',
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data) return
        setPenaltyInfo({
          hasPenalty: !!data.hasPenalty,
          penaltyPoints: data.penaltyPoints ?? null,
          alreadyRelevado: !!data.alreadyRelevado,
        })
      })
      .catch(() => { /* silently */ })
    return () => { cancelled = true }
  }, [status, appointment.id])

  async function reverterPunicao() {
    if (revertingPenalty) return
    setRevertingPenalty(true)
    const res = await fetch(`/api/admin/appointments/${appointment.id}/relevar`, {
      method: 'POST',
    })
    setRevertingPenalty(false)
    if (res.ok) {
      // Atualiza estado local · evita refetch desnecessário
      setPenaltyInfo((prev) => (prev ? { ...prev, alreadyRelevado: true } : prev))
      router.refresh()
    }
  }

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

  /**
   * Conclui atendimento com método de pagamento opcional.
   * - method != null: update atômico — status=completed + paid_at + payment_method
   * - method == null: só marca completed (admin confirma pagamento depois no Financeiro)
   * - withPunctuality: dispara também o bônus via API após o update
   */
  async function completeWithPayment(
    method: PaymentMethodChoice,
    withPunctuality: boolean
  ) {
    setLoading(true)
    const supabase = createClient()
    const updates: { status: string; paid_at?: string; payment_method?: string } = {
      status: 'completed',
    }
    if (method != null) {
      updates.paid_at = new Date().toISOString()
      updates.payment_method = method
    }
    await supabase.from('appointments').update(updates).eq('id', appointment.id)
    setStatus('completed')
    setPaymentModal(false)
    if (withPunctuality) {
      fetch('/api/appointment/award-punctuality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: appointment.id }),
      }).catch(() => {})
    }
    fetch('/api/notify-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: appointment.id, status: 'completed' }),
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
      className="rounded-2xl admin-card relative"
      style={{
        borderLeft: `3px solid ${config.color}`,
        overflow: menuOpen ? 'visible' : 'hidden',
        zIndex: menuOpen ? 40 : undefined,
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
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                aria-hidden
                className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                style={{
                  background: avatarGradient(appointment.client_name),
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 10px -4px rgba(0,0,0,0.25)',
                }}
              >
                {initialsFor(appointment.client_name)}
              </span>
              <div className="min-w-0">
                <p className="font-semibold leading-tight truncate" style={{ color: 'var(--admin-text)' }}>
                  {appointment.client_name}
                </p>
                {dateFormatted && (
                  <p className="text-xs capitalize mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                    {dateFormatted}
                  </p>
                )}
              </div>
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
              <span
                className={`w-1.5 h-1.5 rounded-full ${nextUp && status === 'confirmed' ? 'admin-dot-pulse' : ''}`}
                style={{ background: config.dot }}
              />
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
            {penaltyInfo?.hasPenalty && penaltyInfo.penaltyPoints != null && !penaltyInfo.alreadyRelevado && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  color: '#EF4444',
                  border: '1px solid rgba(239,68,68,0.25)',
                }}
                title="Cliente perdeu pontos por não comparecer"
              >
                −{penaltyInfo.penaltyPoints} pts
              </span>
            )}
            {penaltyInfo?.alreadyRelevado && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                style={{
                  background: 'rgba(148,163,184,0.12)',
                  color: 'var(--admin-text-mute)',
                  border: '1px solid rgba(148,163,184,0.25)',
                }}
                title="Punição revertida pelo dono"
              >
                Punição revertida
              </span>
            )}
          </div>
        </div>

        {/* Serviço + preço */}
        <div className="flex items-center justify-between pl-[64px] mb-2 gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {appointment.service_name && (
              <span
                className="text-xs px-2 py-0.5 rounded-full truncate inline-flex items-center gap-1"
                style={{
                  background: 'var(--admin-surface-hi)',
                  color: 'var(--admin-text-2)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                {appointment.service_name}
              </span>
            )}
            {canEditServices && (
              <button
                type="button"
                onClick={() => setEditServicesOpen(true)}
                aria-label="Editar serviços"
                title="Editar serviços do agendamento"
                className="inline-flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
                style={{
                  width: 24,
                  height: 24,
                  background: 'var(--admin-surface-hi)',
                  border: '1px solid var(--admin-border)',
                  color: 'var(--admin-text-mute)',
                }}
              >
                <IconPencil size={13} />
              </button>
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
            {maskPhone(appointment.client_phone)}
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
            {/* Toggle de pontualidade — chip clicável.
                Quando ON, ambos os botões abaixo dão bônus pro cliente. */}
            {punctualityBonus > 0 && (
              <button
                type="button"
                onClick={() => setWithPunctuality((v) => !v)}
                disabled={loading}
                aria-pressed={withPunctuality}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all disabled:opacity-40"
                style={{
                  background: withPunctuality ? 'rgba(245,158,11,0.15)' : 'var(--admin-surface-hi)',
                  color: withPunctuality ? '#D97706' : 'var(--admin-text-mute)',
                  border: `1px solid ${withPunctuality ? 'rgba(245,158,11,0.4)' : 'var(--admin-border)'}`,
                }}
                title={
                  withPunctuality
                    ? `Cliente vai receber +${punctualityBonus} pts pela pontualidade`
                    : 'Marcar que o cliente foi pontual (dá bônus de pontos)'
                }
              >
                <span aria-hidden>{withPunctuality ? '★' : '☆'}</span>
                Pontualidade {withPunctuality ? `· +${punctualityBonus}pts` : ''}
              </button>
            )}

            <div className="flex items-stretch gap-2 flex-wrap">
              <button
                onClick={() => {
                  if (canComplete) completeWithPayment(null, withPunctuality)
                  else setEarlyConfirm('atendi')
                }}
                disabled={loading}
                className="flex-1 min-w-[110px] py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5 hover:translate-y-[-1px]"
                style={{
                  background: 'var(--admin-surface-hi)',
                  color: 'var(--admin-text)',
                  border: '1px solid var(--admin-border)',
                }}
                title="Conclui o atendimento. Pagamento fica pendente — admin confirma depois no Financeiro."
              >
                <IconCheck size={14} /> Atendi{withPunctuality ? ` +${punctualityBonus}` : ''}
              </button>
              <button
                onClick={() => {
                  if (canComplete) setPaymentModal(true)
                  else setEarlyConfirm('recebi')
                }}
                disabled={loading}
                className="flex-1 min-w-[140px] py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5 hover:translate-y-[-1px]"
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  color: '#fff',
                  boxShadow: '0 8px 20px rgba(16,185,129,0.3)',
                }}
                title="Conclui o atendimento e marca o pagamento agora."
              >
                <IconCheck size={14} /> Atendi e recebi
              </button>
            </div>
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

        {/* Ação · Reverter punição quando status=no_show e houve penalty não revertida (v45 · 14/05/2026) */}
        {status === 'no_show' && penaltyInfo?.hasPenalty && !penaltyInfo.alreadyRelevado && (
          <div className="pl-[64px] pt-2">
            <button
              type="button"
              onClick={reverterPunicao}
              disabled={revertingPenalty}
              className="text-xs font-semibold px-3 py-2 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-50"
              style={{
                background: 'var(--admin-surface-hi)',
                color: 'var(--admin-text)',
                border: '1px solid var(--admin-border)',
              }}
              title="Devolver os pontos descontados (caso de emergência real)"
            >
              {revertingPenalty
                ? 'Revertendo...'
                : `Reverter punição · devolver ${penaltyInfo.penaltyPoints} pts`}
            </button>
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
      <PaymentMethodModal
        open={paymentModal}
        clientName={appointment.client_name}
        totalPrice={appointment.total_price}
        withPunctualityBonus={withPunctuality}
        punctualityPoints={punctualityBonus}
        loading={loading}
        onChoose={(method) => completeWithPayment(method, withPunctuality)}
        onClose={() => !loading && setPaymentModal(false)}
      />
      {/* Confirmação "atendi com antecedência" — só aparece se o admin
          tentar marcar concluído antes da janela de 15min. Caminho A
          decidido em 09/05/2026: tirar bloqueio + pedir confirmação. */}
      <ConfirmActionModal
        open={earlyConfirm !== null}
        title="Atender com antecedência?"
        message={(() => {
          const min = minutesUntilStart()
          const tempo = min >= 60
            ? `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}min` : ''}`
            : `${min} min`
          return `O horário do agendamento ainda não chegou — faltam ${tempo}. Tem certeza que já atendeu ${appointment.client_name}?`
        })()}
        confirmLabel={earlyConfirm === 'recebi' ? 'Sim, atendi e recebi' : 'Sim, já atendi'}
        cancelLabel="Cancelar"
        tone="warn"
        loading={loading}
        onConfirm={() => {
          const action = earlyConfirm
          setEarlyConfirm(null)
          if (action === 'atendi') {
            completeWithPayment(null, withPunctuality)
          } else if (action === 'recebi') {
            setPaymentModal(true)
          }
        }}
        onClose={() => !loading && setEarlyConfirm(null)}
      />
      {editServicesOpen && (
        <EditServicesModal
          appointmentId={appointment.id}
          startTime={appointment.start_time}
          currentStatus={status}
          onClose={() => setEditServicesOpen(false)}
        />
      )}
    </div>
  )
}
