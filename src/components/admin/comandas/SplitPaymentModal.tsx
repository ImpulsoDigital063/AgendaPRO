'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose, IconPlus, IconTrash, IconCheck } from '@/components/ui/Icon'

// Split aceita dinheiro real (Pix/Dinheiro/Cartão) + Crédito do cliente (saldo já depositado).
// Pontos = caminho separado (troca total · sistema de fidelidade opt-in).
// Cortesia = botão dedicado no header da comanda (bonificação · não fraciona).
type Method = 'cash' | 'pix' | 'card' | 'credit'

type PaymentLine = {
  uid: string
  method: Method
  amount: string
  card_type?: 'credit' | 'debit' | null
}

const METHODS: { id: Method; label: string; symbol: string; color: string }[] = [
  { id: 'pix',    label: 'Pix',      symbol: 'PIX', color: '#10B981' },
  { id: 'cash',   label: 'Dinheiro', symbol: '$',   color: '#16A34A' },
  { id: 'card',   label: 'Cartão',   symbol: '▭',   color: '#3B82F6' },
  { id: 'credit', label: 'Crédito',  symbol: '♦',   color: '#8B5CF6' },
]

const METHOD_LABEL: Record<Method, string> = Object.fromEntries(METHODS.map((m) => [m.id, m.label])) as Record<Method, string>

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function newLine(method: Method = 'pix', amount = ''): PaymentLine {
  return {
    uid: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}${Math.random()}`,
    method,
    amount,
  }
}

type Props = {
  open: boolean
  clientName: string
  totalPrice: number
  /** Saldo de crédito do cliente · se > 0 habilita o chip "Crédito" */
  availableCredit?: number
  loading?: boolean
  onConfirm: (payments: { method: Method; amount: number; card_type?: 'credit' | 'debit' | null }[]) => void
  onClose: () => void
}

export default function SplitPaymentModal({ open, clientName, totalPrice, availableCredit = 0, loading = false, onConfirm, onClose }: Props) {
  // Lista de métodos visível · filtra "Crédito" se o cliente não tem saldo
  const visibleMethods = METHODS.filter((m) => m.id !== 'credit' || availableCredit > 0)
  const [portalReady, setPortalReady] = useState(false)
  const [lines, setLines] = useState<PaymentLine[]>(() => [newLine('pix', String(totalPrice))])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setPortalReady(true) }, [])

  useEffect(() => {
    if (!open) return
    // Reset ao abrir
    setLines([newLine('pix', String(totalPrice))])
    setError(null)
  }, [open, totalPrice])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && !loading) onClose() }
    document.addEventListener('keydown', onKey)
    if (open) document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose, loading])

  if (!portalReady || !open) return null

  const sum = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0)
  const diff = totalPrice - sum
  const balanced = Math.abs(diff) < 0.01

  function addLine() {
    const restante = Math.max(0, diff)
    setLines((prev) => [...prev, newLine('cash', restante > 0 ? String(restante.toFixed(2)) : '')])
  }
  function updateLine(uid: string, patch: Partial<PaymentLine>) {
    setLines((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)))
  }
  function removeLine(uid: string) {
    setLines((prev) => prev.length > 1 ? prev.filter((l) => l.uid !== uid) : prev)
  }
  function fillRestante(uid: string) {
    // Preenche essa linha com o que falta pra fechar
    const others = lines.filter((l) => l.uid !== uid).reduce((s, l) => s + (Number(l.amount) || 0), 0)
    updateLine(uid, { amount: String(Math.max(0, totalPrice - others).toFixed(2)) })
  }

  function submit() {
    if (!balanced) {
      setError(`Faltam ${brl(Math.abs(diff))} ${diff > 0 ? 'pra completar o total' : 'sobrando'}`)
      return
    }
    // Cartão exige tipo (débito/crédito)
    const cartaoSemTipo = lines.find((l) => l.method === 'card' && !l.card_type)
    if (cartaoSemTipo) {
      setError('Escolha Crédito ou Débito pra cada pagamento em Cartão')
      return
    }
    // Crédito não pode exceder saldo do cliente
    const sumCredit = lines.filter((l) => l.method === 'credit').reduce((s, l) => s + (Number(l.amount) || 0), 0)
    if (sumCredit > availableCredit + 0.01) {
      setError(`Cliente tem só ${brl(availableCredit)} de crédito · pediu ${brl(sumCredit)}`)
      return
    }
    setError(null)
    onConfirm(lines.map((l) => ({
      method: l.method,
      amount: Number(l.amount),
      card_type: l.method === 'card' ? (l.card_type ?? null) : null,
    })))
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
          maxHeight: '92vh',
        }}
      >
        <header className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--admin-text-faded)' }}>
              Pagamento de {clientName}
            </p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>{brl(totalPrice)}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
              Pode dividir em vários métodos · a soma precisa fechar
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--admin-input-bg)] disabled:opacity-50"
            style={{ color: 'var(--admin-text-mute)' }}
            aria-label="Fechar"
          >
            <IconClose size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {lines.map((line, idx) => (
            <div
              key={line.uid}
              className="rounded-xl p-3 space-y-2"
              style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                  Pagamento {idx + 1}
                </span>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(line.uid)}
                    className="w-6 h-6 rounded-full inline-flex items-center justify-center"
                    style={{ color: '#DC2626' }}
                    aria-label="Remover linha"
                  >
                    <IconTrash size={11} />
                  </button>
                )}
              </div>

              {/* Métodos chips · Crédito só aparece se cliente tem saldo */}
              <div className="flex gap-1 flex-wrap">
                {visibleMethods.map((m) => {
                  const active = line.method === m.id
                  const labelExtra = m.id === 'credit' ? ` (${brl(availableCredit)} disp.)` : ''
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => updateLine(line.uid, { method: m.id, card_type: m.id === 'card' ? line.card_type ?? null : null })}
                      className="px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                      style={{
                        background: active ? m.color : 'var(--admin-surface)',
                        color: active ? '#fff' : 'var(--admin-text)',
                        border: `1px solid ${active ? m.color : 'var(--admin-border)'}`,
                      }}
                    >
                      <span className={`text-[10px] ${active ? 'opacity-90' : 'opacity-60'}`}>{m.symbol}</span>
                      {m.label}{labelExtra}
                    </button>
                  )
                })}
              </div>

              {/* Sub-tipo do cartão · só aparece quando method=card */}
              {line.method === 'card' && (
                <div className="flex gap-1 items-center pl-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                    Tipo:
                  </span>
                  {(['credit', 'debit'] as const).map((t) => {
                    const isActive = line.card_type === t
                    const label = t === 'credit' ? 'Crédito' : 'Débito'
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updateLine(line.uid, { card_type: t })}
                        className="px-3 py-1 rounded-full text-[11px] font-bold transition-colors"
                        style={{
                          background: isActive ? '#3B82F6' : 'var(--admin-surface)',
                          color: isActive ? '#fff' : 'var(--admin-text)',
                          border: `1px solid ${isActive ? '#3B82F6' : 'var(--admin-border)'}`,
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Valor */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: 'var(--admin-text-faded)' }}>R$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={line.amount}
                  onChange={(e) => updateLine(line.uid, { amount: e.target.value })}
                  placeholder="0,00"
                  className="admin-input flex-1 px-3 py-2 rounded-lg text-base font-bold tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => fillRestante(line.uid)}
                  className="text-[11px] font-bold underline"
                  style={{ color: 'var(--admin-accent)' }}
                >
                  Restante
                </button>
              </div>
            </div>
          ))}

          {/* Botão adicionar linha */}
          <button
            type="button"
            onClick={addLine}
            className="w-full py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-1.5"
            style={{
              background: 'transparent',
              color: 'var(--admin-accent)',
              border: '1px dashed color-mix(in srgb, var(--admin-accent) 50%, transparent)',
            }}
          >
            <IconPlus size={12} /> Adicionar outra forma de pagamento
          </button>
        </div>

        {/* Footer · resumo + confirmar */}
        <footer className="flex-shrink-0 border-t px-5 py-4 space-y-2" style={{ borderColor: 'var(--admin-divider)', background: 'var(--admin-surface)' }}>
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--admin-text-mute)' }}>Soma dos pagamentos</span>
            <span className="font-bold tabular-nums" style={{ color: balanced ? '#10B981' : '#DC2626' }}>
              {brl(sum)} {balanced ? '✓' : `· falta ${brl(Math.abs(diff))}`}
            </span>
          </div>
          {error && (
            <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}>
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={loading || !balanced}
            className="w-full py-3 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
              color: '#fff',
              borderTop: '1px solid rgba(255,255,255,0.25)',
              boxShadow: '0 8px 22px -6px rgba(5,150,105,0.55)',
            }}
          >
            <IconCheck size={14} /> {loading ? 'Processando...' : 'Confirmar pagamento'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}

export { METHOD_LABEL }
