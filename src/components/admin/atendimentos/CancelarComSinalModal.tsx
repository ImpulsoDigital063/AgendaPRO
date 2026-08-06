'use client'

/* Cancelamento de atendimento que JÁ TEM SINAL PAGO.
   ───────────────────────────────────────────────────────────────────
   Eduardo, testando em 06/08: pagou o sinal, clicou em cancelar, e o
   modal não falou nada sobre o dinheiro da cliente. "O dono tem que
   saber ali que tem um sinal pago."

   E não basta avisar. Quem cancela pelo painel é a dona, e o motivo
   varia: a cliente pediu, ela mesma não vai conseguir atender, deu
   problema na agenda. Em alguns casos o certo é guardar como crédito;
   em outros ela já devolveu o PIX na hora e só quer registrar. Decidir
   por ela seria errar metade das vezes.

   Crédito vem marcado por padrão porque é o que protege as duas: o
   dinheiro fica no salão e a cliente não perde nada. */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose, IconCheck } from '@/components/ui/Icon'

export type DestinoSinal = 'credito' | 'devolucao'

type Props = {
  open: boolean
  clientName: string
  sinalPago: number
  loading?: boolean
  onConfirm: (destino: DestinoSinal) => void
  onClose: () => void
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function CancelarComSinalModal({
  open,
  clientName,
  sinalPago,
  loading = false,
  onConfirm,
  onClose,
}: Props) {
  const [destino, setDestino] = useState<DestinoSinal>('credito')
  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])

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

  if (!open || !portalReady) return null

  const primeiroNome = (clientName || 'A cliente').split(' ')[0]

  const OPCOES: { valor: DestinoSinal; titulo: string; texto: string }[] = [
    {
      valor: 'credito',
      titulo: 'Guardar como crédito',
      texto: `${primeiroNome} usa esse valor no próximo horário. O dinheiro continua com você e ela não perde nada.`,
    },
    {
      valor: 'devolucao',
      titulo: 'Já devolvi o dinheiro',
      texto: 'Você acertou com ela por fora. Fica registrado no histórico do atendimento, sem virar saldo na ficha.',
    },
  ]

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4"
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
        <div className="flex items-start justify-between p-5 pb-2">
          <h3 className="text-base font-bold leading-tight" style={{ color: 'var(--admin-text, #0F172A)' }}>
            Cancelar este atendimento?
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

        {/* O valor vem primeiro e grande: é a informação que muda a decisão. */}
        <div className="px-5">
          <div
            className="rounded-2xl px-4 py-3"
            style={{
              background: 'color-mix(in srgb, #F59E0B 12%, transparent)',
              border: '1px solid color-mix(in srgb, #F59E0B 32%, transparent)',
            }}
          >
            <p className="text-sm" style={{ color: 'var(--admin-text, #0F172A)' }}>
              {primeiroNome} já pagou <b>{brl(sinalPago)}</b> de sinal.
            </p>
          </div>
          <p className="text-xs mt-3 mb-2" style={{ color: 'var(--admin-text-mute, #64748B)' }}>
            O que fazer com esse valor?
          </p>
        </div>

        <div className="px-5 pb-4 space-y-2">
          {OPCOES.map((o) => {
            const ativa = destino === o.valor
            return (
              <button
                key={o.valor}
                type="button"
                onClick={() => setDestino(o.valor)}
                disabled={loading}
                className="w-full text-left rounded-2xl px-4 py-3 flex gap-3 items-start transition-colors disabled:opacity-50"
                style={{
                  background: ativa ? 'color-mix(in srgb, var(--brand-primary, #3B82F6) 10%, transparent)' : 'transparent',
                  border: ativa
                    ? '1px solid color-mix(in srgb, var(--brand-primary, #3B82F6) 55%, transparent)'
                    : '1px solid var(--admin-popover-border, #E2E8F0)',
                }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: ativa ? 'var(--brand-primary, #3B82F6)' : 'transparent',
                    border: ativa ? 'none' : '1.5px solid var(--admin-text-faded, #94A3B8)',
                    color: '#fff',
                  }}
                >
                  {ativa && <IconCheck size={12} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold" style={{ color: 'var(--admin-text, #0F172A)' }}>
                    {o.titulo}
                  </span>
                  <span className="block text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--admin-text-mute, #64748B)' }}>
                    {o.texto}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <div
          className="flex flex-col-reverse sm:flex-row gap-2 p-4 sm:justify-end"
          style={{
            background: 'rgba(0,0,0,0.18)',
            borderTop: '1px solid var(--admin-popover-border, #E2E8F0)',
          }}
        >
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: 'transparent', color: 'var(--admin-text-2, #475569)', border: '1px solid var(--admin-popover-border, #E2E8F0)' }}
          >
            Voltar
          </button>
          <button
            onClick={() => onConfirm(destino)}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #DC2626, #B91C1C)' }}
          >
            {loading ? 'Cancelando…' : 'Sim, cancelar'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
