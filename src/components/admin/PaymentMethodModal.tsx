'use client'

import { useEffect } from 'react'
import { IconClose, IconCheck } from '@/components/ui/Icon'

export type PaymentMethodChoice = 'pix' | 'cash' | 'card' | 'courtesy' | null

type Props = {
  open: boolean
  clientName: string
  totalPrice?: number | null
  /** Modo "Atendi +bonus" altera o copy e a cor do header. */
  withPunctualityBonus?: boolean
  punctualityPoints?: number
  loading?: boolean
  /** null = "Pagar depois" — só muda status pra completed, sem paid_at. */
  onChoose: (method: PaymentMethodChoice) => void
  onClose: () => void
}

type MethodOption = {
  id: NonNullable<PaymentMethodChoice>
  label: string
  symbol: string
  color: string
  glow: string
}

// Cores fixas (já usadas em FinanceAppointmentList) pra branding consistente.
const METHODS: MethodOption[] = [
  { id: 'pix',      label: 'Pix',      symbol: 'PIX', color: '#10B981', glow: 'rgba(16,185,129,0.18)' },
  { id: 'cash',     label: 'Dinheiro', symbol: '$',   color: '#16A34A', glow: 'rgba(22,163,74,0.18)' },
  { id: 'card',     label: 'Cartão',   symbol: '▭',   color: '#3B82F6', glow: 'rgba(59,130,246,0.18)' },
  { id: 'courtesy', label: 'Cortesia', symbol: '★',   color: '#A855F7', glow: 'rgba(168,85,247,0.18)' },
]

function formatPrice(value: number | null | undefined) {
  if (value == null || value <= 0) return null
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function PaymentMethodModal({
  open,
  clientName,
  totalPrice,
  withPunctualityBonus = false,
  punctualityPoints = 0,
  loading = false,
  onChoose,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, loading, onClose])

  if (!open) return null

  const priceLabel = formatPrice(totalPrice)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={() => !loading && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3">
          <div className="min-w-0">
            <p
              className="text-[11px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--admin-text-faded, #94A3B8)' }}
            >
              {withPunctualityBonus ? `Atendido + ${punctualityPoints} pts pontualidade` : 'Atendimento concluído'}
            </p>
            <h3
              id="payment-modal-title"
              className="text-lg font-bold leading-tight"
              style={{ color: 'var(--admin-text, #0F172A)' }}
            >
              Como {clientName} pagou?
            </h3>
            {priceLabel && (
              <p
                className="text-sm font-semibold mt-1.5 tabular-nums"
                style={{ color: 'var(--admin-text-2, #475569)' }}
              >
                {priceLabel}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Fechar"
            className="p-1 rounded-full transition-opacity hover:opacity-70 disabled:opacity-30 flex-shrink-0"
            style={{ color: 'var(--admin-text-mute, #64748B)' }}
          >
            <IconClose size={18} />
          </button>
        </div>

        {/* Grid 2x2 dos métodos — alvos grandes, mobile-first.
            Cada botão >= 64px de altura (HIG: 44px mínimo, 64px confortável) */}
        <div className="grid grid-cols-2 gap-2.5 px-5 pb-3">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChoose(m.id)}
              disabled={loading}
              className="relative rounded-2xl p-3.5 text-left transition-all disabled:opacity-40 hover:translate-y-[-1px] active:scale-[0.98]"
              style={{
                background: 'var(--admin-surface, #F8FAFC)',
                border: `1.5px solid ${m.color}40`,
                minHeight: 76,
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 font-bold"
                style={{
                  background: m.glow,
                  color: m.color,
                  fontSize: m.id === 'pix' ? 10 : 18,
                }}
              >
                {m.symbol}
              </div>
              <p
                className="text-sm font-bold leading-tight"
                style={{ color: 'var(--admin-text, #0F172A)' }}
              >
                {m.label}
              </p>
            </button>
          ))}
        </div>

        {/* Pagar depois — fluxo separado pra quem cobra antecipado/parcelado */}
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={() => onChoose(null)}
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 inline-flex items-center justify-center gap-2"
            style={{
              background: 'transparent',
              color: 'var(--admin-text-2, #475569)',
              border: '1px dashed var(--admin-border, #CBD5E1)',
            }}
            title="Marca como atendido. Pagamento fica pendente pra confirmar depois no Financeiro."
          >
            <IconCheck size={14} />
            Atendido — pagar depois
          </button>
        </div>

        {loading && (
          <div className="px-5 pb-4">
            <p className="text-xs text-center" style={{ color: 'var(--admin-text-faded)' }}>
              Salvando...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
