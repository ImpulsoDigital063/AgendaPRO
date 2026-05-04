'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import FinancePeriodTabs from './FinancePeriodTabs'
import { initialsFor, avatarGradient } from '@/lib/client-display'
import { IconClose, IconWhatsapp } from '@/components/ui/Icon'

type Appointment = {
  id: string
  client_name: string
  client_phone: string
  appointment_date: string
  start_time: string
  status: 'cancelled' | 'no_show'
  service_name: string | null
  total_price: number | null
  paid_at: string | null
  payment_method: 'pix' | 'cash' | 'card' | 'courtesy' | null
  professional?: { id: string; name: string } | null
}

type Props = {
  appointments: Appointment[]
  periodo: string
  businessName: string
}

const STATUS_LABEL: Record<Appointment['status'], string> = {
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
}

const STATUS_COLOR: Record<Appointment['status'], string> = {
  cancelled: '#94A3B8',
  no_show: '#EF4444',
}

const PERIODO_LABEL: Record<string, string> = {
  hoje: 'Hoje',
  semana: 'Últimos 7 dias',
  mes: 'Este mês',
}

const METHOD_LABEL: Record<NonNullable<Appointment['payment_method']>, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  card: 'Cartão',
  courtesy: 'Cortesia',
}

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

export default function CanceladosView({ appointments, periodo, businessName }: Props) {
  const router = useRouter()
  const [showMethodSheet, setShowMethodSheet] = useState<string | null>(null)
  // Paginação: cancelados acumulam ao longo do mês. Mostra 10 primeiros.
  const [showAllCancelled, setShowAllCancelled] = useState(false)

  const stats = useMemo(() => {
    const cancelled = appointments.filter((a) => a.status === 'cancelled')
    const noShow = appointments.filter((a) => a.status === 'no_show')
    const totalLost = appointments
      .filter((a) => a.paid_at == null && a.total_price != null)
      .reduce((sum, a) => sum + (a.total_price || 0), 0)
    const totalRecovered = appointments
      .filter((a) => a.paid_at != null && a.total_price != null)
      .reduce((sum, a) => sum + (a.total_price || 0), 0)
    return {
      cancelled: cancelled.length,
      noShow: noShow.length,
      totalLost,
      totalRecovered,
    }
  }, [appointments])

  function buildWaUrl(a: Appointment) {
    const phone = (a.client_phone || '').replace(/\D/g, '')
    if (phone.length < 10) return null
    const isNoShow = a.status === 'no_show'
    const date = formatDate(a.appointment_date)
    const time = a.start_time.slice(0, 5)
    const service = a.service_name ? ` (${a.service_name})` : ''
    const price = a.total_price ? ` no valor de ${formatPrice(a.total_price)}` : ''
    const text = isNoShow
      ? `Olá ${a.client_name}! Notei que você não compareceu ao seu horário de ${date} às ${time}${service}${price}. Posso te ajudar a remarcar? ${businessName}`
      : `Olá ${a.client_name}! Vi que seu agendamento de ${date} às ${time}${service} foi cancelado. Quer remarcar? ${businessName}`
    return `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`
  }

  async function markAsPaid(id: string, method: 'pix' | 'cash' | 'card' | 'courtesy') {
    setShowMethodSheet(null)
    const res = await fetch(`/api/admin/appointments/${id}/payment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method }),
    })
    if (res.ok) router.refresh()
  }

  return (
    <div className="space-y-5">
      <FinancePeriodTabs periodo={periodo} />

      {/* Hero KPI */}
      <div
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, color-mix(in srgb, var(--brand-primary) 12%, var(--admin-surface)) 100%)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--admin-text-faded)' }}>
          Perdido no período
        </p>
        <p className="text-3xl font-extrabold mt-1 leading-none tabular-nums"
          style={{ color: '#EF4444' }}>
          {formatPrice(stats.totalLost)}
        </p>
        <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-mute)' }}>
          {stats.cancelled} cancelad{stats.cancelled === 1 ? 'o' : 'os'}
          {stats.noShow > 0 && ` · ${stats.noShow} não compareceu`}
          {stats.totalRecovered > 0 && (
            <span style={{ color: '#10B981' }}>
              {' · '}{formatPrice(stats.totalRecovered)} recuperado
            </span>
          )}
        </p>
      </div>

      {/* Lista */}
      {appointments.length === 0 ? (
        <div className="admin-card p-8 text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--admin-text-2)' }}>
            Nenhum cancelamento neste período
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>
            Cancelamentos e faltas aparecem aqui pra você cobrar tarifa ou tentar remarcar
          </p>
        </div>
      ) : (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
            Lista · {PERIODO_LABEL[periodo]}
          </h2>
          <div className="space-y-2">
            {(showAllCancelled ? appointments : appointments.slice(0, 10)).map((a) => {
              const waUrl = buildWaUrl(a)
              const isPaid = !!a.paid_at
              return (
                <div key={a.id} className="admin-card p-3.5 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                      style={{ background: avatarGradient(a.client_name) }}
                    >
                      {initialsFor(a.client_name)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate" style={{ color: 'var(--admin-text)' }}>
                        {a.client_name}
                      </p>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--admin-text-faded)' }}>
                        {formatDate(a.appointment_date)} · {a.start_time.slice(0, 5)}
                        {a.service_name ? ` · ${a.service_name}` : ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                      {a.total_price ? (
                        <p className="font-bold text-sm leading-none" style={{ color: 'var(--admin-text)' }}>
                          {formatPrice(a.total_price)}
                        </p>
                      ) : null}
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${STATUS_COLOR[a.status]}20`, color: STATUS_COLOR[a.status] }}
                      >
                        {STATUS_LABEL[a.status]}
                      </span>
                    </div>
                  </div>

                  {/* Status + ações */}
                  <div
                    className="flex items-center justify-between gap-2 pt-2"
                    style={{ borderTop: '1px solid var(--admin-divider)' }}
                  >
                    {isPaid ? (
                      <span
                        className="text-[11px] font-semibold inline-flex items-center gap-1.5"
                        style={{ color: '#10B981' }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} />
                        Pago via {a.payment_method ? METHOD_LABEL[a.payment_method] : 'método'}
                      </span>
                    ) : (
                      <span className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
                        Não pago
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      {!isPaid && a.total_price && a.total_price > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowMethodSheet(a.id)}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all active:scale-[0.97]"
                          style={{
                            background: 'rgba(16,185,129,0.12)',
                            color: '#10B981',
                            border: '1px solid rgba(16,185,129,0.25)',
                          }}
                        >
                          Marcar pago
                        </button>
                      )}
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-opacity hover:opacity-90"
                          style={{
                            background: 'rgba(37,211,102,0.12)',
                            color: '#16A34A',
                            border: '1px solid rgba(37,211,102,0.25)',
                          }}
                        >
                          <IconWhatsapp size={11} />
                          {a.status === 'no_show' ? 'Cobrar' : 'Remarcar'}
                        </a>
                      )}
                    </div>
                  </div>

                  {showMethodSheet === a.id && (
                    <PaymentMethodSheet
                      onSelect={(m) => markAsPaid(a.id, m)}
                      onClose={() => setShowMethodSheet(null)}
                      clientName={a.client_name}
                      price={a.total_price ?? 0}
                    />
                  )}
                </div>
              )
            })}
            {!showAllCancelled && appointments.length > 10 && (
              <button
                type="button"
                onClick={() => setShowAllCancelled(true)}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 transition-opacity hover:opacity-90 text-sm font-semibold mt-1"
                style={{
                  background: 'var(--admin-surface)',
                  color: 'var(--admin-accent)',
                  border: '1px solid var(--admin-divider)',
                }}
              >
                Ver mais {appointments.length - 10}
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function PaymentMethodSheet({
  onSelect,
  onClose,
  clientName,
  price,
}: {
  onSelect: (m: 'pix' | 'cash' | 'card' | 'courtesy') => void
  onClose: () => void
  clientName: string
  price: number
}) {
  const COLOR: Record<'pix' | 'cash' | 'card' | 'courtesy', string> = {
    pix: '#10B981', cash: '#16A34A', card: '#3B82F6', courtesy: '#A855F7',
  }
  const methods = [
    { key: 'pix' as const, label: 'PIX', sub: 'Transferência instantânea' },
    { key: 'cash' as const, label: 'Dinheiro', sub: 'Pago no balcão' },
    { key: 'card' as const, label: 'Cartão', sub: 'Crédito ou débito' },
    { key: 'courtesy' as const, label: 'Cortesia', sub: 'Sem cobrança' },
  ]
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="admin-card w-full sm:max-w-md p-5 rounded-t-3xl sm:rounded-3xl"
        style={{
          maxHeight: 'calc(100svh - 16px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px) + 5rem, 5rem)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
            Como recebeu?
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--admin-text-mute)' }}
            aria-label="Fechar"
          >
            <IconClose size={16} />
          </button>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--admin-text-mute)' }}>
          {clientName} · {formatPrice(price)}
        </p>
        <div className="space-y-2">
          {methods.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => onSelect(m.key)}
              className="w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98]"
              style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ background: `${COLOR[m.key]}1F`, color: COLOR[m.key] }}
              >
                {m.key === 'pix' ? 'P' : m.key === 'cash' ? '$' : m.key === 'card' ? 'C' : '•'}
              </span>
              <div className="flex-1 text-left min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>
                  {m.label}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
                  {m.sub}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
