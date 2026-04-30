'use client'

import { useEffect } from 'react'
import { IconClose } from '@/components/ui/Icon'

type Tone = 'danger' | 'warn' | 'neutral'

type Props = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: Tone
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

const TONES: Record<Tone, { color: string; bg: string; border: string }> = {
  danger: {
    color: '#FFFFFF',
    bg: 'linear-gradient(135deg, #DC2626, #B91C1C)',
    border: 'rgba(220,38,38,0.5)',
  },
  warn: {
    color: '#1F2937',
    bg: 'linear-gradient(135deg, #F59E0B, #D97706)',
    border: 'rgba(217,119,6,0.5)',
  },
  neutral: {
    color: '#FFFFFF',
    bg: 'linear-gradient(135deg, var(--brand-primary, #3B82F6), var(--brand-secondary, #06B6D4))',
    border: 'rgba(59,130,246,0.5)',
  },
}

export default function ConfirmActionModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  loading = false,
  onConfirm,
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

  const t = TONES[tone]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={() => !loading && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{
          // Sólido (dark e light) — admin-surface no dark é translucido
          // e fica ilegivel sobre cards e orbs animados de fundo
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
        }}
      >
        <div className="flex items-start justify-between p-5 pb-2">
          <h3
            id="confirm-modal-title"
            className="text-base font-bold leading-tight"
            style={{ color: 'var(--admin-text, #0F172A)' }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Fechar"
            className="p-1 rounded-full transition-opacity hover:opacity-70 disabled:opacity-30"
            style={{ color: 'var(--admin-text-mute, #64748B)' }}
          >
            <IconClose size={18} />
          </button>
        </div>
        <p
          className="px-5 pb-5 text-sm leading-relaxed"
          style={{ color: 'var(--admin-text-2, #475569)' }}
        >
          {message}
        </p>
        <div
          className="flex flex-col-reverse sm:flex-row gap-2 p-4 sm:justify-end"
          style={{
            // Footer levemente mais escuro pra destacar do corpo do modal
            background: 'rgba(0,0,0,0.18)',
            borderTop: '1px solid var(--admin-popover-border, #E2E8F0)',
          }}
        >
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
            style={{
              background: 'transparent',
              color: 'var(--admin-text-2, #475569)',
              border: '1px solid var(--admin-border, #E2E8F0)',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-transform hover:translate-y-[-1px] disabled:opacity-50 disabled:translate-y-0"
            style={{
              background: t.bg,
              color: t.color,
              boxShadow: `0 8px 22px -6px ${t.border}`,
            }}
          >
            {loading ? 'Processando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
