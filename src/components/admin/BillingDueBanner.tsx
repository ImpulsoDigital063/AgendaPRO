'use client'

/**
 * BillingDueBanner — faixa de cobrança PIX no topo do painel.
 *
 * Cravado 18/07/2026 (Eduardo): a cobrança recorrente tem que aparecer NO
 * PAINEL e o cliente paga pela própria tela do app — email vira só reforço.
 * Antes o único canal era o email do cron (Olímpio não achou a cobrança e
 * pediu o PIX na mão). Segue a MESMA escala do cron billing-check:
 *   D-3/-2/-1 → "vence em X dias" (azul)
 *   D-0       → "vence hoje" (âmbar)
 *   vencida   → "venceu — pague pra não bloquear" (vermelho · ainda na carência)
 *
 * "Pagar agora" abre o PIX inline (QR + copia-cola) da cobrança VIGENTE
 * (reaproveitada via /api/billing/pix-atual — não duplica no Asaas).
 * Só pra modalidades PIX; cartão automático o Asaas retenta sozinho.
 *
 * Faixa full-width igual ao TrialBanner — aparece em mobile e desktop de
 * propósito (é o comportamento desejado nos dois). Adição, sem risco cruzado.
 */

import { useState } from 'react'
import { createPortal } from 'react-dom'
import PixInlineCheckout from '@/components/billing/PixInlineCheckout'

type Props = {
  diasAteVencer: number
  status: 'active' | 'past_due'
}

type PixData = {
  qr_image: string | null
  qr_payload: string | null
  payment_id: string
  modalidade: string
  cobertura_meses: number
  valor_reais: number
}

export default function BillingDueBanner({ diasAteVencer, status }: Props) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [pix, setPix] = useState<PixData | null>(null)
  const [paid, setPaid] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const venceu = diasAteVencer < 0 || status === 'past_due'
  const venceHoje = diasAteVencer === 0 && !venceu
  const urgente = venceu || venceHoje

  const texto = venceu
    ? 'Sua mensalidade venceu'
    : venceHoje
      ? 'Sua mensalidade vence hoje'
      : diasAteVencer === 1
        ? 'Sua mensalidade vence amanhã'
        : `Sua mensalidade vence em ${diasAteVencer} dias`

  const complemento = venceu
    ? 'Pague pra não perder o acesso ao painel.'
    : 'Pague pelo PIX aqui mesmo, sem sair do app.'

  const cor = venceu
    ? { dot: '#F43F5E', bg: 'rgba(244,63,94,0.10)', border: 'rgba(244,63,94,0.28)', txt: 'text-rose-700', btn: '#E11D48' }
    : venceHoje
      ? { dot: '#F59E0B', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.30)', txt: 'text-amber-700', btn: '#D97706' }
      : { dot: '#3B82F6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.22)', txt: 'text-blue-700', btn: '#2563EB' }

  async function handlePagar() {
    setError(null)
    setPaid(false)
    setLoading(true)
    try {
      const res = await fetch('/api/billing/pix-atual', { cache: 'no-store' })
      if (res.status === 409) {
        // Sem cadastro Asaas — manda pro fluxo completo (coleta CPF/CNPJ).
        window.location.href = '/admin/configuracoes?tab=plano'
        return
      }
      const data = await res.json().catch(() => ({}))
      if (data?.paid === true) {
        setPaid(true)
        setOpen(true)
        setTimeout(() => window.location.reload(), 2000)
        return
      }
      if (!res.ok || !data?.payment_id) {
        setError(data?.error || 'Não deu pra gerar o PIX agora. Tenta de novo em instantes.')
        setOpen(true)
        return
      }
      setPix({
        qr_image: data.qr_image,
        qr_payload: data.qr_payload,
        payment_id: data.payment_id,
        modalidade: data.modalidade,
        cobertura_meses: data.cobertura_meses,
        valor_reais: data.valor_reais,
      })
      setOpen(true)
    } catch {
      setError('Falha de conexão. Tenta de novo em alguns segundos.')
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }

  function fechar() {
    setOpen(false)
    setError(null)
  }

  return (
    <>
      <div
        className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-sm"
        style={{ background: cor.bg, borderBottom: `1px solid ${cor.border}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cor.dot }} />
          <span className="truncate">
            <strong className={cor.txt}>{texto}.</strong>{' '}
            <span className="text-slate-600 hidden sm:inline">{complemento}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={handlePagar}
          disabled={loading}
          className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white whitespace-nowrap disabled:opacity-60"
          style={{ background: cor.btn }}
        >
          {loading ? 'Gerando PIX…' : urgente ? 'Pagar agora' : 'Ver PIX'}
        </button>
      </div>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(2,6,20,0.72)', backdropFilter: 'blur(4px)' }}
          onClick={fechar}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 relative max-h-[92vh] overflow-y-auto"
            style={{
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              boxShadow: '0 30px 80px -30px rgba(16, 185, 129, 0.30)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={fechar}
              aria-label="Fechar"
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              ✕
            </button>

            {paid ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-lg font-bold text-emerald-300">Pagamento já confirmado!</p>
                <p className="text-sm text-slate-400">Liberando seu painel…</p>
              </div>
            ) : error ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-rose-300">{error}</p>
                <button
                  type="button"
                  onClick={handlePagar}
                  className="px-4 py-2 rounded-lg font-bold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)' }}
                >
                  Tentar de novo
                </button>
              </div>
            ) : pix ? (
              <>
                <h2 className="text-lg font-bold text-white text-center mb-1">Pagar mensalidade</h2>
                <PixInlineCheckout
                  qrImage={pix.qr_image}
                  qrPayload={pix.qr_payload}
                  valorReais={pix.valor_reais}
                  modalidade={pix.modalidade}
                  coberturaMeses={pix.cobertura_meses}
                  paymentId={pix.payment_id}
                />
              </>
            ) : null}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
