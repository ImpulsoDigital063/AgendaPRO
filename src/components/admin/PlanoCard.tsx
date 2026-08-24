'use client'

import { useEffect, useState } from 'react'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'
import { IconAlert, IconCheck, IconExternalLink } from '@/components/ui/Icon'
import { PRICING } from '@/config/pricing'
import BillingPlanSelector from '@/components/billing/BillingPlanSelector'

type PlanModalidade = 'mensal_cartao' | 'mensal_pix' | 'semestral_pix' | 'anual_pix'

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
  provider?: 'mercado_pago' | 'asaas'
  /** v27 · como o cliente paga (4 modalidades · null = legado mensal_cartao) */
  plan_modalidade?: PlanModalidade | null
  /** v27 · até quando o pagamento atual cobre (data de vencimento PIX) */
  pago_ate?: string | null
  /** trial grátis ativo (ainda não pagou) — server calcula em /api/billing/status */
  is_trial?: boolean
  trial_days_left?: number | null
  /** Dias CONCEDIDOS (pago_ate − created_at). >15 = bônus/cortesia, não teste. */
  trial_days_granted?: number | null
  /** trial JÁ vencido (pending_payment, nunca pagou) — mostra "teste acabou" + checkout */
  trial_ended?: boolean
}

/**
 * Periodicidade derivada do valor real, NÃO só da modalidade.
 *
 * Por que: o schema só tem `anual_pix` (não tem `anual_cartao`), mas Marko
 * (Palace) é cobrado anualmente no cartão — ficou gravado como
 * `mensal_cartao` + price=97000 (R$ 970 = valor anual Equipe), o que
 * faria a UI mostrar "R$ 970/mês" se confiássemos só na modalidade.
 *
 * Cruzando price_cents com PRICING.modalidades resolve sem migration:
 * se bater no valor anual, é /ano; semestral, /semestre; senão, /mês.
 */
function derivePeriodicidade(
  plan: 'solo' | 'equipe',
  priceCents: number,
): '/mês' | '/semestre' | '/ano' {
  const monthlyCents = PRICING[plan].mensalidadeCentavos
  const semestralCents =
    monthlyCents * 6 - PRICING.modalidades.semestral_pix.descontoReais[plan] * 100
  const anualCents =
    monthlyCents * 12 - PRICING.modalidades.anual_pix.descontoReais[plan] * 100
  if (priceCents === anualCents) return '/ano'
  if (priceCents === semestralCents) return '/semestre'
  return '/mês'
}

function deriveCanal(modalidade: PlanModalidade): 'cartão' | 'PIX' {
  return modalidade === 'mensal_cartao' ? 'cartão' : 'PIX'
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

type RefundInfo = {
  refunded: boolean
  refund_amount: number | null
  payment_method: 'cartao' | 'pix' | null
}

export default function PlanoCard() {
  const [sub, setSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const [refundInfo, setRefundInfo] = useState<RefundInfo | null>(null)

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
    setRefundInfo(null)
    try {
      const res = await fetch('/api/billing/cancel-asaas', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Erro ao cancelar.')
        setCancelling(false)
        return
      }
      // Captura info de reembolso pra mostrar feedback visual
      setRefundInfo({
        refunded: data.refunded === true,
        refund_amount:
          typeof data.refund_amount === 'number' ? data.refund_amount : null,
        payment_method: data.payment_method ?? null,
      })
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

  // TRIAL ativo: mostra o CHECKOUT pra assinar (não o card "Ativo/Cancelar").
  // Bug achado 21/07: trial tem status='active' igual assinante pago, então
  // caía no card de assinante — sem NENHUM caminho pra pagar antes de vencer.
  // O trial só conseguia assinar depois de vencer e cair no paywall. Aqui o
  // "Assinar agora" leva pro pagamento de verdade (PIX/cartão + QR inline).
  // Fundo escuro porque o BillingPlanSelector foi estilizado pro paywall dark.
  if (sub.is_trial || sub.trial_ended) {
    const dias = sub.trial_days_left ?? 0
    // Período maior que o trial de cadastro (7d) = bônus/cortesia: quem fechou
    // negócio não está "testando". Mesma régua da faixa do topo.
    const ehTeste = (sub.trial_days_granted ?? 0) <= 15
    const oQue = ehTeste ? 'teste' : 'acesso liberado'
    const tituloTrial = sub.trial_ended
      ? `Seu ${oQue} acabou`
      : dias <= 0
        ? `Seu ${oQue} termina hoje`
        : dias === 1 ? `Falta 1 dia do seu ${oQue}` : `Faltam ${dias} dias do seu ${oQue}`
    const subtitulo = sub.trial_ended
      ? ehTeste
        ? 'Você aproveitou seus dias grátis — seus dados estão salvos. Pra continuar de onde parou, é só escolher seu plano abaixo.'
        : 'Seu período liberado acabou — seus dados estão salvos. Pra continuar de onde parou, é só escolher seu plano abaixo.'
      : ehTeste
        ? 'Assine agora pra continuar usando sem interrupção. Sem fidelidade, cancela quando quiser.'
        : 'Quando o período acabar, é só escolher o plano aqui. Sem fidelidade, cancela quando quiser.'
    return (
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(2,6,20,0.98) 100%)',
          border: '1px solid rgba(16,185,129,0.25)',
          boxShadow: '0 20px 60px -30px rgba(16,185,129,0.30)',
        }}
      >
        <div className="text-center space-y-1">
          <p className="text-base font-bold text-white">{tituloTrial}</p>
          <p className="text-[12px] text-slate-400">{subtitulo}</p>
        </div>
        <BillingPlanSelector plan={sub.plan} />
      </div>
    )
  }

  const statusInfo = STATUS_LABEL[sub.status] ?? STATUS_LABEL.pending_payment
  const isCancelled = sub.status === 'cancelled'
  const planName = sub.plan === 'equipe' ? 'Equipe' : 'Solo'
  const valor = (sub.price_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const modalidade = sub.plan_modalidade ?? 'mensal_cartao'
  const periodicidade = derivePeriodicidade(sub.plan, sub.price_cents)
  const canal = deriveCanal(modalidade)

  return (
    <div className="admin-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Plano {planName}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
            {valor}{periodicidade} · {canal}
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

      {/* Datas relevantes · label muda conforme periodicidade real (não só modalidade) */}
      <div className="space-y-1.5 text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
        {(() => {
          if (isCancelled) return null
          const isPix = canal === 'PIX'
          const date = isPix ? (sub.pago_ate ?? sub.current_period_end) : sub.current_period_end
          if (!date) return null
          // Anual/semestral usa "Renovação" · mensal cartão usa "Próxima cobrança" · mensal PIX usa "Próximo PIX"
          const label =
            periodicidade === '/mês'
              ? (isPix ? 'Próximo PIX' : 'Próxima cobrança')
              : 'Renovação do plano'
          return (
            <div className="flex justify-between">
              <span>{label}</span>
              <span style={{ color: 'var(--admin-text)' }}>{formatDate(date)}</span>
            </div>
          )
        })()}
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
            {sub.refunded_at ? (
              <>
                Plano cancelado e <strong>reembolso solicitado</strong>. Acesso encerrado.
                Pra voltar, fala com o suporte no WhatsApp.
              </>
            ) : sub.current_period_end ? (
              <>
                Plano cancelado. Você pode usar o painel até <strong>{formatDate(sub.current_period_end)}</strong>.
                Pra reativar, fala com o suporte no WhatsApp.
              </>
            ) : (
              'Plano cancelado. Pra reativar, fala com o suporte no WhatsApp.'
            )}
          </span>
        </div>
      )}

      {refundInfo?.refunded && (
        <div
          className="rounded-lg px-3 py-2 flex items-start gap-2 text-[11px]"
          style={{
            background: 'color-mix(in srgb, var(--admin-success, #16A34A) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--admin-success, #16A34A) 30%, transparent)',
            color: 'var(--admin-success, #16A34A)',
          }}
        >
          <IconCheck size={14} style={{ marginTop: 1 }} />
          <span>
            <strong>Reembolso solicitado{refundInfo.refund_amount != null ? ` de R$ ${refundInfo.refund_amount.toFixed(2).replace('.', ',')}` : ''}.</strong>{' '}
            {refundInfo.payment_method === 'pix'
              ? 'A grana volta no seu PIX em até 24h (no app do banco).'
              : 'A grana volta no seu cartão em 5 a 10 dias úteis (depende do banco).'}
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
          sub.within_refund_window
            ? `Como você está dentro dos 7 dias da garantia, a gente devolve o valor pago automaticamente — PIX volta em 24h, cartão em 5 a 10 dias úteis. Sem multa, sem fidelidade.`
            : sub.current_period_end
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
