'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { IconClose, IconCheck } from '@/components/ui/Icon'

/**
 * Bônus avulso (v141 · item 3 do setup do Studio Isis Melo).
 *
 * Portado do SystemPalace, onde nasceu em 16/06 a pedido do Marko: premiar a
 * profissional sem depender de ter comissão pendente fechada no período.
 * Cria um commission_payment só com bonus_amount (paid_amount 0, nenhum
 * atendimento vinculado).
 *
 * Aditivo: negócio que nunca lançar bônus não vê diferença em lugar nenhum.
 */
type Props = {
  professionalId: string
  professionalName: string
  periodStart: string
  periodEnd: string
  onClose: () => void
}

export default function DarBonusModal({
  professionalId,
  professionalName,
  periodStart,
  periodEnd,
  onClose,
}: Props) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function submit() {
    const bonus = parseFloat(amount.replace(',', '.')) || 0
    if (bonus <= 0) {
      setError('Informe um valor de bônus maior que zero')
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/admin/commission-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        professionalId,
        appointmentIds: [],
        periodStart,
        periodEnd,
        bonusAmount: bonus,
        bonusReason: reason.trim() || null,
        paidAt: new Date(date + 'T12:00:00').toISOString(),
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'falha_ao_dar_bonus')
      setSubmitting(false)
      return
    }
    onClose()
    router.refresh()
  }

  if (!portalReady) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ background: 'var(--admin-surface)', borderBottom: '1px solid var(--admin-border)' }}
        >
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
              Bônus
            </h2>
            <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
              {professionalName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 rounded-lg"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            <IconClose size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {error && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                background: 'color-mix(in srgb, var(--admin-danger,#EF4444) 14%, transparent)',
                color: 'var(--admin-danger,#EF4444)',
              }}
            >
              Erro: {error}
            </p>
          )}
          <div>
            <label
              className="text-[10px] font-bold uppercase tracking-wider block mb-1"
              style={{ color: 'var(--admin-text-faded)' }}
            >
              Valor do bônus (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={submitting}
              className="admin-input w-full px-3 py-2 text-sm tabular-nums"
              placeholder="0,00"
            />
          </div>
          <div>
            <label
              className="text-[10px] font-bold uppercase tracking-wider block mb-1"
              style={{ color: 'var(--admin-text-faded)' }}
            >
              Motivo (opcional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              className="admin-input w-full px-3 py-2 text-sm"
              placeholder="ex: meta batida, elogio de cliente"
            />
          </div>
          <div>
            <label
              className="text-[10px] font-bold uppercase tracking-wider block mb-1"
              style={{ color: 'var(--admin-text-faded)' }}
            >
              Data
            </label>
            <input
              type="date"
              lang="pt-BR"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={submitting}
              className="admin-input w-full px-3 py-2 text-sm tabular-nums"
            />
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="w-full py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'var(--admin-accent)', color: '#fff' }}
          >
            <IconCheck size={16} /> {submitting ? 'Salvando…' : 'Confirmar bônus'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
