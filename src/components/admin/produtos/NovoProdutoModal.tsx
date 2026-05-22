'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from '@/components/ui/Icon'

type Props = {
  businessId: string
  onClose: () => void
  onSuccess: () => void
}

const UNIT_OPTIONS = ['un', 'ml', 'l', 'g', 'kg', 'cx', 'pct']

export default function NovoProdutoModal({ businessId: _businessId, onClose, onSuccess }: Props) {
  void _businessId // API resolve pelo auth
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [unit, setUnit] = useState('un')
  const [price, setPrice] = useState<string>('')
  const [cost, setCost] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('0')
  const [minQuantity, setMinQuantity] = useState<string>('0')
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
    if (!name.trim()) { setError('Nome obrigatório'); return }
    setSaving(true)
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        unit,
        price: price ? Number(price) : null,
        cost: cost ? Number(cost) : null,
        quantity: quantity ? Number(quantity) : 0,
        min_quantity: minQuantity ? Number(minQuantity) : 0,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erro ao cadastrar')
      return
    }
    onSuccess()
  }

  if (!portalReady) return null

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
        className="w-full max-w-lg rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
          maxHeight: '90vh',
        }}
      >
        <div
          className="flex items-center justify-between p-5 pb-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--admin-divider)' }}
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--admin-text-faded)' }}>
              Novo
            </p>
            <h3 className="text-lg font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
              Produto
            </h3>
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
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>
              Nome *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Cabelo Kanekalon Jumbo"
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Marca, cor, tamanho, observações"
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>
                Unidade
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2.5 pr-8 rounded-xl text-sm"
                style={{
                  background: `var(--admin-input-bg) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>") no-repeat right 0.625rem center`,
                  border: '1px solid var(--admin-border)',
                  color: 'var(--admin-text)',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                }}
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>
                Quant. inicial
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>
                Mínimo alerta
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums"
                placeholder="0 = sem alerta"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>
                Preço de venda (R$)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Opcional"
                className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>
                Custo (R$)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="Opcional"
                className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums"
              />
            </div>
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
              disabled={saving || !name.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
              style={{
                background: 'linear-gradient(180deg, var(--brand-primary, #1AA9A8) 0%, color-mix(in srgb, var(--brand-primary, #1AA9A8) 70%, black) 100%)',
                color: '#fff',
                borderTop: '1px solid rgba(255,255,255,0.25)',
                boxShadow: '0 8px 22px -8px color-mix(in srgb, var(--brand-primary, #1AA9A8) 55%, transparent)',
              }}
            >
              {saving ? 'Cadastrando...' : 'Cadastrar produto'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
