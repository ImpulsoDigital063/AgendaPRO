'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose, IconPlus } from '@/components/ui/Icon'

type Product = {
  id: string
  name: string
  unit: string
  quantity: number
  min_quantity: number
}

type Props = {
  product: Product
  onClose: () => void
  onSuccess: () => void
}

type MovementType = 'entry' | 'exit' | 'adjust'

function formatQty(v: number, unit: string): string {
  const n = Number(v)
  if (Number.isInteger(n)) return `${n} ${unit}`
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${unit}`
}

export default function AjustarEstoqueModal({ product, onClose, onSuccess }: Props) {
  const [type, setType] = useState<MovementType>('entry')
  const [quantity, setQuantity] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [saving, onClose])

  async function submit() {
    setError(null)
    const q = parseFloat(quantity)
    if (!q || !isFinite(q)) { setError('Quantidade inválida'); return }
    setSaving(true)
    const res = await fetch(`/api/admin/products/${product.id}/movement`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type,
        quantity: q,
        reason: reason.trim() || null,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erro ao registrar movimentação')
      return
    }
    onSuccess()
  }

  if (!portalReady) return null

  const previewQty = (() => {
    const q = parseFloat(quantity) || 0
    if (type === 'entry') return product.quantity + q
    if (type === 'exit') return product.quantity - q
    return q // adjust = vai pra esse valor
  })()

  const typeMeta: Record<MovementType, { label: string; helper: string; color: string }> = {
    entry: { label: 'Entrada', helper: 'Recebeu novo estoque (compra, reposição, devolução)', color: '#10B981' },
    exit: { label: 'Saída', helper: 'Saiu do estoque (uso interno, venda, perda)', color: '#EF4444' },
    adjust: { label: 'Ajuste', helper: 'Diferença pra correção · positivo soma, negativo subtrai', color: '#3B82F6' },
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={() => !saving && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
          maxHeight: '90vh',
        }}
      >
        <div
          className="flex items-start justify-between p-5 pb-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--admin-divider)' }}
        >
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--admin-text-faded)' }}>
              Movimentar estoque
            </p>
            <h3 className="text-lg font-bold leading-tight truncate" style={{ color: 'var(--admin-text)' }}>
              {product.name}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
              Atual: <span className="font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>{formatQty(product.quantity, product.unit)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--admin-input-bg)]"
            style={{ color: 'var(--admin-text-mute)' }}
            aria-label="Fechar"
          >
            <IconClose size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {/* Tipo */}
          <div className="grid grid-cols-3 gap-2">
            {(['entry', 'exit', 'adjust'] as const).map((t) => {
              const m = typeMeta[t]
              const selected = type === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className="py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={
                    selected
                      ? {
                          background: `linear-gradient(180deg, ${m.color} 0%, color-mix(in srgb, ${m.color} 70%, black) 100%)`,
                          color: '#fff',
                          borderTop: '1px solid rgba(255,255,255,0.25)',
                          boxShadow: `0 4px 12px -3px color-mix(in srgb, ${m.color} 50%, transparent)`,
                        }
                      : {
                          background: 'var(--admin-input-bg)',
                          color: 'var(--admin-text-2)',
                          border: '1px solid var(--admin-border)',
                        }
                  }
                >
                  {m.label}
                </button>
              )
            })}
          </div>
          <p className="text-[11px] italic" style={{ color: 'var(--admin-text-mute)' }}>
            {typeMeta[type].helper}
          </p>

          {/* Quantidade */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>
              {type === 'adjust' ? 'Diferença (pode ser negativo)' : `Quantidade (${product.unit})`}
            </label>
            <input
              type="number"
              step={0.01}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums"
              autoFocus
              placeholder={type === 'adjust' ? '-2 ou 5.5' : 'Ex: 10'}
            />
            {parseFloat(quantity) > 0 && (
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-mute)' }}>
                Vai ficar com <span className="font-bold tabular-nums" style={{ color: previewQty < 0 ? '#EF4444' : 'var(--admin-text)' }}>{formatQty(previewQty, product.unit)}</span>
                {previewQty < 0 && ' · ⚠ negativo'}
              </p>
            )}
          </div>

          {/* Motivo */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>
              Motivo (opcional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Compra mensal · Uso em cliente · Inventário"
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm"
            />
          </div>
        </div>

        <div
          className="flex-shrink-0"
          style={{ borderTop: '1px solid var(--admin-divider)', background: 'var(--admin-surface-hi)' }}
        >
          {error && (
            <div className="px-4 pt-3 pb-1 text-xs font-semibold flex items-start gap-2" style={{ color: '#DC2626' }} role="alert">
              <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>⚠</span>
              <span className="flex-1">{error}</span>
            </div>
          )}
          <div className="flex items-center justify-end gap-2 p-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{
                background: 'transparent',
                color: 'var(--admin-text-2)',
                border: '1px solid var(--admin-border)',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saving || !quantity}
              className="px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-40"
              style={{
                background: 'linear-gradient(180deg, var(--brand-primary, #1AA9A8) 0%, color-mix(in srgb, var(--brand-primary, #1AA9A8) 70%, black) 100%)',
                color: '#fff',
                borderTop: '1px solid rgba(255,255,255,0.25)',
                boxShadow: '0 8px 22px -8px color-mix(in srgb, var(--brand-primary, #1AA9A8) 55%, transparent)',
              }}
            >
              <IconPlus size={14} /> {saving ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
