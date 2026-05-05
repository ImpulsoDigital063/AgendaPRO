'use client'

import { useEffect, useState } from 'react'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'
import { IconAlert, IconCheck, IconExternalLink } from '@/components/ui/Icon'

type Subscription = {
  plan: 'solo' | 'equipe'
  status: 'pending_payment' | 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired'
  price_cents: number
  setup_cents: number
  setup_paid_at: string | null
  refund_deadline_at: string | null
  refunded_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  grace_ends_at: string | null
  public_blocked_at: string | null
  cancelled_at: string | null
  admin_blocked: boolean
  public_blocked: boolean
  within_refund_window: boolean
  refund_days_left: number | null
}

const STATUS_LABEL: Record<Subscription['status'], { label: string; color: string }> = {
  pending_payment: { label: 'Aguardando pagamento', color: 'var(--admin-warn)' },
  trial: { label: 'Período de teste', color: 'var(--admin-accent)' },
  active: { label: 'Ativo', color: 'var(--admin-success, #16A34A)' },
  past_due: { label: 'Pagamento em atraso', color: 'var(--admin-warn)' },
  cancelled: { label: 'Cancelado', color: 'var(--admin-text-faded)' },
  expired: { label: 'Expirado', color: 'var(--admin-text-faded)' },
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PlanoCard() {
  const [sub, setSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')

  async function loadStatus() {
    setLoading(true)
    // Retry com backoff: race de hidratacao ou cookie ainda nao propagado
    // (CIC rodada 5 reportou bug #3 — aba Plano vazia "Plano nao
    // encontrado" 1a visita, OK na 2a). 3 tentativas com 0/400/1200ms.
    const delays = [0, 400, 1200]
    let result: Subscription | null = null
    for (const delay of delays) {
      if (delay > 0) await new Promise((r) => setTimeout(r, delay))
      try {
        const res = await fetch('/api/billing/status', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data.subscription) {
            result = data.subscription
            break
          }
        }
      } catch {
        // Continua tentando
      }
    }
    setSub(result)
    setLoading(false)
  }

  useEffect(() => {
    loadStatus()
  }, [])

  async function handleCancel() {
    setCancelling(true)
    setError('')
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Erro ao cancelar.')
        setCancelling(false)
        return
      }
      await loadStatus()
      setConfirmCancel(false)
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-card p-4">
        <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>Carregando plano…</p>
      </div>
    )
  }

  if (!sub) {
    return (
      <div className="admin-card p-4 space-y-2">
        <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
          Não foi possível carregar o plano
        </p>
        <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
          Tentamos algumas vezes mas algo deu errado.{' '}
          <button
            type="button"
            onClick={loadStatus}
            className="underline font-semibold"
            style={{ color: 'var(--admin-accent)' }}
          >
            Tentar de novo
          </button>
        </p>
      </div>
    )
  }

  const statusInfo = STATUS_LABEL[sub.status] ?? STATUS_LABEL.pending_payment
  const isCancelled = sub.status === 'cancelled'
  const planName = sub.plan === 'equipe' ? 'Equipe' : 'Solo'
  const monthly = (sub.price_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="admin-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Plano {planName}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
            {monthly}/mês
          </p>
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
          style={{
            background: `color-mix(in srgb, ${statusInfo.color} 15%, transparent)`,
            color: statusInfo.color,
            border: `1px solid color-mix(in srgb, ${statusInfo.color} 30%, transparent)`,
          }}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Datas relevantes */}
      <div className="space-y-1.5 text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
        {sub.current_period_end && !isCancelled && (
          <div className="flex justify-between">
            <span>Próxima cobrança</span>
            <span style={{ color: 'var(--admin-text)' }}>{formatDate(sub.current_period_end)}</span>
          </div>
        )}
        {sub.cancelled_at && (
          <div className="flex justify-between">
            <span>Cancelado em</span>
            <span style={{ color: 'var(--admin-text)' }}>{formatDate(sub.cancelled_at)}</span>
          </div>
        )}
        {sub.within_refund_window && sub.refund_days_left != null && (
          <div
            className="rounded-lg px-2.5 py-2 mt-2"
            style={{
              background: 'color-mix(in srgb, var(--admin-success, #16A34A) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--admin-success, #16A34A) 30%, transparent)',
              color: 'var(--admin-text-2)',
            }}
          >
            Garantia de 7 dias: faltam <strong>{sub.refund_days_left}</strong> dias pra pedir reembolso
            sem burocracia.
          </div>
        )}
      </div>

      {/* Ações */}
      {!isCancelled && (
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            disabled={cancelling}
            className="w-full py-2.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
            style={{
              background: 'transparent',
              color: 'var(--admin-danger, #DC2626)',
              border: '1px solid color-mix(in srgb, var(--admin-danger, #DC2626) 35%, transparent)',
            }}
          >
            Cancelar plano
          </button>
          <a
            href="https://wa.me/5563992920080?text=Ol%C3%A1!%20Tenho%20uma%20d%C3%BAvida%20sobre%20meu%20plano%20no%20AgendaPRO."
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-center transition-opacity hover:opacity-80"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            Falar com o suporte no WhatsApp <IconExternalLink size={10} className="inline ml-0.5" />
          </a>
        </div>
      )}

      {isCancelled && (
        <div
          className="rounded-lg px-3 py-2 flex items-start gap-2 text-[11px]"
          style={{
            background: 'var(--admin-input-bg)',
            border: '1px solid var(--admin-border)',
            color: 'var(--admin-text-mute)',
          }}
        >
          <IconCheck size={14} style={{ color: 'var(--admin-success, #16A34A)', marginTop: 1 }} />
          <span>
            Plano cancelado. Você pode usar o painel até a próxima data de cobrança. Pra reativar,
            fala com o suporte no WhatsApp.
          </span>
        </div>
      )}

      {error && (
        <div
          className="rounded-lg px-3 py-2 flex items-start gap-2 text-[11px]"
          style={{
            background: 'color-mix(in srgb, var(--admin-danger, #DC2626) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--admin-danger, #DC2626) 30%, transparent)',
            color: 'var(--admin-danger, #DC2626)',
          }}
        >
          <IconAlert size={14} />
          <span>{error}</span>
        </div>
      )}

      <ConfirmActionModal
        open={confirmCancel}
        title="Cancelar seu plano?"
        message={
          sub.current_period_end
            ? `Você continua com acesso até ${formatDate(sub.current_period_end)} (próxima cobrança). Depois disso, o plano para. Sem multa, sem fidelidade.`
            : 'Seu plano vai ser cancelado. Sem multa, sem fidelidade. Pra reativar depois, fala com o suporte.'
        }
        confirmLabel="Sim, cancelar"
        cancelLabel="Voltar"
        tone="danger"
        loading={cancelling}
        onConfirm={handleCancel}
        onClose={() => setConfirmCancel(false)}
      />
    </div>
  )
}
