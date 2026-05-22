'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose, IconPlus, IconTrash } from '@/components/ui/Icon'

type Product = {
  id: string
  name: string
  variant: string | null
  unit: string
  quantity: number
}

type ProductRel = Product | Product[] | null

type Item = {
  id: string
  quantity: number
  product_id: string
  product: ProductRel
}

type Props = {
  serviceId: string
  serviceName: string
  /** Produtos disponíveis pra vincular · vêm da view pai */
  availableProducts: Product[]
  onClose: () => void
  onChanged?: () => void
}

function pickProduct(rel: ProductRel): Product | null {
  if (!rel) return null
  return Array.isArray(rel) ? (rel[0] ?? null) : rel
}

const selectStyle = {
  background: `var(--admin-input-bg) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>") no-repeat right 0.625rem center`,
  border: '1px solid var(--admin-border)',
  color: 'var(--admin-text)',
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
  MozAppearance: 'none' as const,
}

export default function ServicoUsoProdutosModal({
  serviceId, serviceName, availableProducts, onClose, onChanged,
}: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newProductId, setNewProductId] = useState('')
  const [newQty, setNewQty] = useState('1')
  const [error, setError] = useState<string | null>(null)
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => { setPortalReady(true) }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const reload = async () => {
    setLoading(true)
    const r = await fetch(`/api/admin/services/${serviceId}/products`)
    const d = await r.json()
    setItems(d.items ?? [])
    setLoading(false)
  }
  useEffect(() => { reload() /* eslint-disable-line */ }, [serviceId])

  const vinculadosIds = new Set(items.map((i) => i.product_id))
  const disponiveis = availableProducts.filter((p) => !vinculadosIds.has(p.id))

  async function adicionar() {
    setError(null)
    if (!newProductId || Number(newQty) <= 0) {
      setError('Escolha produto e quantidade > 0')
      return
    }
    setAdding(true)
    const r = await fetch(`/api/admin/services/${serviceId}/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ product_id: newProductId, quantity: Number(newQty) }),
    })
    setAdding(false)
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      setError(d.error ?? 'Erro ao adicionar')
      return
    }
    setNewProductId('')
    setNewQty('1')
    await reload()
    onChanged?.()
  }

  async function remover(productId: string) {
    const r = await fetch(`/api/admin/services/${serviceId}/products?product_id=${productId}`, {
      method: 'DELETE',
    })
    if (r.ok) {
      await reload()
      onChanged?.()
    }
  }

  if (!portalReady) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
          maxHeight: '90vh',
        }}
      >
        <div className="flex items-start justify-between p-5 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--admin-text-faded)' }}>
              Uso de produtos
            </p>
            <h3 className="text-lg font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
              {serviceName}
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
              Quando esse serviço for concluído, o estoque dos produtos abaixo cai automaticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--admin-input-bg)]"
            style={{ color: 'var(--admin-text-mute)' }}
            aria-label="Fechar"
          >
            <IconClose size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <p className="text-center text-sm py-6" style={{ color: 'var(--admin-text-mute)' }}>Carregando...</p>
          ) : (
            <>
              {items.length === 0 ? (
                <div className="text-center py-6 rounded-xl" style={{ background: 'var(--admin-surface-hi)', border: '1px dashed var(--admin-border)' }}>
                  <p className="text-sm" style={{ color: 'var(--admin-text)' }}>Nenhum produto vinculado ainda</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
                    Adicione abaixo os produtos consumidos quando esse serviço é feito.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((it) => {
                    const p = pickProduct(it.product)
                    if (!p) return null
                    return (
                      <div
                        key={it.id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl"
                        style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                            {p.name}{p.variant && <span style={{ color: 'var(--admin-text-mute)', fontWeight: 500 }}> · {p.variant}</span>}
                          </p>
                          <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
                            Em estoque: {p.quantity} {p.unit}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                            {it.quantity} {p.unit}
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>por execução</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => remover(p.id)}
                          aria-label="Remover"
                          className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ color: '#DC2626' }}
                        >
                          <IconTrash size={12} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Adicionar */}
              <div
                className="rounded-2xl p-3 space-y-2"
                style={{ background: 'color-mix(in srgb, var(--admin-accent) 6%, transparent)', border: '1px dashed color-mix(in srgb, var(--admin-accent) 40%, transparent)' }}
              >
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-accent)' }}>
                  Adicionar produto consumido
                </p>
                <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                  <select
                    value={newProductId}
                    onChange={(e) => setNewProductId(e.target.value)}
                    className="px-3 py-2.5 pr-9 rounded-xl text-sm"
                    style={selectStyle}
                  >
                    <option value="">Selecionar produto</option>
                    {disponiveis.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.variant ? ` · ${p.variant}` : ''} ({p.quantity} {p.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    placeholder="Qtd"
                    className="admin-input w-24 px-2.5 py-2 rounded-lg text-sm tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={adicionar}
                    disabled={adding || !newProductId}
                    className="px-3 rounded-xl text-xs font-bold inline-flex items-center gap-1 disabled:opacity-40"
                    style={{ background: 'var(--admin-accent)', color: '#fff' }}
                  >
                    <IconPlus size={12} /> ok
                  </button>
                </div>
                {error && (
                  <p className="text-[11px] font-semibold" style={{ color: '#DC2626' }}>{error}</p>
                )}
                {disponiveis.length === 0 && availableProducts.length > 0 && (
                  <p className="text-[11px] italic" style={{ color: 'var(--admin-text-mute)' }}>
                    Todos os produtos já estão vinculados a esse serviço.
                  </p>
                )}
                {availableProducts.length === 0 && (
                  <p className="text-[11px] italic" style={{ color: 'var(--admin-text-mute)' }}>
                    Você ainda não cadastrou produtos · vá em Produtos pra criar.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
