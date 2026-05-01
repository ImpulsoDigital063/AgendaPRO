'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { initialsFor, avatarGradient } from '@/lib/client-display'
import { statusOf, isArchived } from '@/lib/appointment-status'
import { IconChevronRight, IconClose } from '@/components/ui/Icon'

export type FinanceRow = {
  id: string
  client_name: string
  appointment_date: string
  start_time: string
  status: string
  service_name: string | null
  total_price: number | null
  paid_at?: string | null
  payment_method?: 'pix' | 'cash' | 'card' | 'courtesy' | null
  professional_name?: string | null
}

type Method = 'pix' | 'cash' | 'card' | 'courtesy'

const METHOD_LABEL: Record<Method, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  card: 'Cartão',
  courtesy: 'Cortesia',
}

const METHOD_COLOR: Record<Method, string> = {
  pix: '#10B981',
  cash: '#16A34A',
  card: '#3B82F6',
  courtesy: '#A855F7',
}

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  })
}

function Row({ a, onPaymentChange }: { a: FinanceRow; onPaymentChange: (id: string) => void }) {
  const status = statusOf(a.status)
  const archived = isArchived(a.status)
  const isPaid = !!a.paid_at
  const canPay = !archived && a.total_price !== null && a.total_price > 0
  const router = useRouter()
  const [showMethodMenu, setShowMethodMenu] = useState(false)
  const [updating, setUpdating] = useState(false)

  async function setPayment(method: Method | null) {
    if (updating) return
    setUpdating(true)
    setShowMethodMenu(false)
    const body = method == null ? { paid: false } : { method }
    const res = await fetch(`/api/admin/appointments/${a.id}/payment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    setUpdating(false)
    if (res.ok) {
      onPaymentChange(a.id)
      router.refresh()
    }
  }

  return (
    <div
      className="admin-card p-3"
      style={archived ? { opacity: 0.65 } : undefined}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
          style={{
            background: avatarGradient(a.client_name),
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 10px -4px rgba(0,0,0,0.25)',
          }}
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
            {a.professional_name ? ` · ${a.professional_name}` : ''}
          </p>
        </div>

        <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
          {a.total_price ? (
            <p
              className="font-bold text-sm leading-none"
              style={{
                color: archived ? 'var(--admin-text-faded)' : 'var(--admin-text)',
                textDecoration: archived ? 'line-through' : 'none',
              }}
            >
              {formatPrice(a.total_price)}
            </p>
          ) : (
            <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>—</p>
          )}
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
            style={{ background: status.bg, color: status.color }}
          >
            <span className="w-1 h-1 rounded-full" style={{ background: status.dot }} />
            {status.label}
          </span>
        </div>
      </div>

      {/* Linha inferior — status de pagamento + ação */}
      {canPay && (
        <div
          className="flex items-center justify-between gap-2 mt-2.5 pt-2.5"
          style={{ borderTop: '1px solid var(--admin-divider)' }}
        >
          {isPaid ? (
            <>
              <span
                className="text-[11px] font-semibold inline-flex items-center gap-1.5"
                style={{ color: a.payment_method ? METHOD_COLOR[a.payment_method] : 'var(--admin-success)' }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: a.payment_method ? METHOD_COLOR[a.payment_method] : 'var(--admin-success)' }}
                />
                Pago via {a.payment_method ? METHOD_LABEL[a.payment_method] : 'método'}
              </span>
              <button
                type="button"
                onClick={() => setPayment(null)}
                disabled={updating}
                className="text-[10px] font-semibold px-2 py-1 rounded-md transition-colors"
                style={{ color: 'var(--admin-text-faded)' }}
              >
                Desfazer
              </button>
            </>
          ) : (
            <>
              <span className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
                Pagamento pendente
              </span>
              <button
                type="button"
                onClick={() => setShowMethodMenu(true)}
                disabled={updating}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all active:scale-[0.97] disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #10B981, #16A34A)',
                  color: '#fff',
                  boxShadow: '0 2px 6px rgba(16,185,129,0.3)',
                }}
              >
                Confirmar pagamento
              </button>
            </>
          )}
        </div>
      )}

      {showMethodMenu && (
        <PaymentMethodSheet
          onSelect={setPayment}
          onClose={() => setShowMethodMenu(false)}
          clientName={a.client_name}
          price={a.total_price ?? 0}
        />
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
  onSelect: (m: Method) => void
  onClose: () => void
  clientName: string
  price: number
}) {
  const methods: { key: Method; label: string; sub: string }[] = [
    { key: 'pix',      label: 'PIX',         sub: 'Transferência instantânea' },
    { key: 'cash',     label: 'Dinheiro',    sub: 'Pago no balcão' },
    { key: 'card',     label: 'Cartão',      sub: 'Crédito ou débito' },
    { key: 'courtesy', label: 'Cortesia',    sub: 'Sem cobrança (brinde, troca)' },
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
              style={{
                background: 'var(--admin-input-bg)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{
                  background: `${METHOD_COLOR[m.key]}1F`,
                  color: METHOD_COLOR[m.key],
                }}
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

export default function FinanceAppointmentList({ items }: { items: FinanceRow[] }) {
  const [showArchived, setShowArchived] = useState(false)
  // Refresh trigger pra forcar re-render apos mutacao
  const [, setTick] = useState(0)
  const onPaymentChange = () => setTick((t) => t + 1)

  const ativos = items.filter((a) => !isArchived(a.status))
  const archived = items.filter((a) => isArchived(a.status))

  if (items.length === 0) {
    return (
      <div className="admin-card p-8 text-center">
        <p className="text-sm font-medium" style={{ color: 'var(--admin-text-2)' }}>
          Nenhum agendamento neste período
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>
          Os atendimentos aparecem aqui assim que forem feitos
        </p>
      </div>
    )
  }

  const cancelledCount = archived.filter((a) => a.status === 'cancelled').length
  const noShowCount = archived.filter((a) => a.status === 'no_show').length
  const archivedLabel = [
    cancelledCount > 0 && `${cancelledCount} cancelado${cancelledCount > 1 ? 's' : ''}`,
    noShowCount > 0 && `${noShowCount} não veio`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="space-y-2">
      {ativos.map((a, i) => (
        <div
          key={a.id}
          className="admin-enter"
          style={{ ['--enter-delay' as string]: `${Math.min(i, 8) * 50}ms` }}
        >
          <Row a={a} onPaymentChange={onPaymentChange} />
        </div>
      ))}

      {archived.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowArchived((s) => !s)}
            className="w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 transition-opacity hover:opacity-90"
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-divider)',
            }}
          >
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--admin-text-faded)' }}
            >
              {showArchived ? 'Ocultar' : 'Mostrar'} {archivedLabel}
            </span>
            <span
              style={{
                color: 'var(--admin-text-faded)',
                transform: showArchived ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            >
              <IconChevronRight size={16} />
            </span>
          </button>

          {showArchived && (
            <div className="space-y-2 mt-2">
              {archived.map((a) => (
                <Row key={a.id} a={a} onPaymentChange={onPaymentChange} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
