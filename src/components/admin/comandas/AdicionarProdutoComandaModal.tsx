'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IconClose, IconPlus, IconSearch } from '@/components/ui/Icon'

type Product = {
  id: string
  name: string
  variant: string | null
  variant_group_id: string | null
  unit: string
  price: number | null
  quantity: number
  track_stock: boolean
}

type Professional = {
  id: string
  name: string
  is_receptionist: boolean
}

type Props = {
  invoiceId: string
  businessId: string
  onClose: () => void
  onAdded: () => void
}

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const selectStyle: React.CSSProperties = {
  background: `var(--admin-input-bg) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>") no-repeat right 0.625rem center`,
  border: '1px solid var(--admin-border)',
  color: 'var(--admin-text)',
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
}

export default function AdicionarProdutoComandaModal({ invoiceId, businessId, onClose, onAdded }: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [portalReady, setPortalReady] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState('1')
  const [priceStr, setPriceStr] = useState('')
  const [professionalId, setProfessionalId] = useState('')
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('products').select('id, name, variant, variant_group_id, unit, price, quantity, track_stock').eq('business_id', businessId).eq('active', true).eq('sale_active', true).order('name'),
      supabase.from('professionals').select('id, name, is_receptionist').eq('business_id', businessId).eq('active', true).order('name'),
    ]).then(([pRes, profRes]) => {
      setProducts((pRes.data ?? []) as Product[])
      setProfessionals((profRes.data ?? []) as Professional[])
      setLoading(false)
    })
  }, [supabase, businessId])

  const selectedProduct = products.find((p) => p.id === productId)
  const [pickerGroup, setPickerGroup] = useState<string | null>(null)

  // Agrupa por variant_group_id (produto → variante · drill-down).
  const pickerData = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? products.filter((p) => p.name.toLowerCase().includes(q) || (p.variant ?? '').toLowerCase().includes(q))
      : products
    const byGroup = new Map<string, Product[]>()
    const singles: Product[] = []
    for (const p of list) {
      if (p.variant_group_id) {
        const a = byGroup.get(p.variant_group_id) ?? []
        a.push(p)
        byGroup.set(p.variant_group_id, a)
      } else singles.push(p)
    }
    const groups = Array.from(byGroup.entries()).map(([gid, vars]) => ({
      gid, base: vars[0], vars: [...vars].sort((a, b) => (a.variant ?? '').localeCompare(b.variant ?? '')),
    }))
    return { singles, groups }
  }, [products, search])
  const groupOpen = pickerGroup ? pickerData.groups.find((g) => g.gid === pickerGroup) ?? null : null

  function pickProduct(p: Product) {
    setProductId(p.id)
    setPriceStr(p.price != null ? String(p.price) : '')
  }

  // Aviso de estoque (a rota /items também valida no server · isso é só UX)
  const stockWarn = selectedProduct && selectedProduct.track_stock && Number(qty) > selectedProduct.quantity
    ? { atual: selectedProduct.quantity, pedido: Number(qty) }
    : null

  function validate(): string | null {
    if (!productId) return 'Selecione um produto'
    const qNum = Number(qty)
    const pNum = Number(priceStr)
    if (!(qNum > 0)) return 'Quantidade deve ser maior que 0'
    if (!(pNum >= 0)) return 'Preço inválido'
    if (stockWarn) return `Estoque insuficiente · atual ${stockWarn.atual}, pedido ${stockWarn.pedido}`
    return null
  }

  async function submit() {
    const v = validate()
    if (v) { setError(v); return }
    setError(null)
    setSubmitting(true)
    const r = await fetch(`/api/admin/invoices/${invoiceId}/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        quantity: Number(qty),
        unit_price: Number(priceStr),
        professional_id: professionalId || null,
      }),
    })
    if (!r.ok) {
      setSubmitting(false)
      const d = await r.json().catch(() => ({}))
      if (d.error === 'insufficient_stock') {
        setError(`Estoque insuficiente · disponível ${d.available}, pedido ${d.requested}`)
      } else {
        setError(d.error ?? 'Erro ao adicionar produto')
      }
      return
    }
    setSubmitting(false)
    onAdded()
    router.refresh()
  }

  if (!portalReady) return null

  const total = Number(qty) * Number(priceStr) || 0

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
        className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
          maxHeight: '92vh',
        }}
      >
        <header className="flex items-start justify-between p-5 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--admin-text-faded)' }}>
              Adicionar produto
            </p>
            <h3 className="text-lg font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
              {selectedProduct?.name ?? 'Escolha um produto'}
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
              Vende produto na mesma conta · baixa o estoque ao salvar
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
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {/* Search produto */}
          {!productId && (
            <>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--admin-text-faded)' }}>
                  <IconSearch size={14} />
                </span>
                <input
                  autoFocus
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar produto por nome..."
                  className="admin-input w-full pl-9 pr-3 py-2 rounded-xl text-sm"
                />
              </div>
              {loading ? (
                <p className="text-center text-sm py-6" style={{ color: 'var(--admin-text-mute)' }}>Carregando produtos...</p>
              ) : groupOpen ? (
                /* Variantes do grupo escolhido */
                <>
                  <button type="button" onClick={() => setPickerGroup(null)} className="text-xs font-semibold inline-flex items-center gap-1 mb-1" style={{ color: 'var(--admin-accent)' }}>
                    ← {groupOpen.base.name}
                  </button>
                  <ul className="space-y-1 max-h-72 overflow-y-auto">
                    {groupOpen.vars.map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => pickProduct(p)} className="w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between gap-3 hover:bg-[color-mix(in_srgb,var(--admin-accent)_10%,transparent)]" style={{ background: 'var(--admin-surface-hi)' }}>
                          <span className="min-w-0">
                            <span className="text-sm font-semibold block truncate" style={{ color: 'var(--admin-text)' }}>{p.variant || '—'}</span>
                            <span className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>{p.track_stock ? `${p.quantity} ${p.unit} em estoque` : 'sem controle de estoque'}</span>
                          </span>
                          <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: 'var(--admin-text)' }}>{p.price != null ? brl(p.price) : '—'}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : pickerData.singles.length === 0 && pickerData.groups.length === 0 ? (
                <p className="text-center text-sm py-6" style={{ color: 'var(--admin-text-mute)' }}>
                  {search ? 'Nenhum produto bate com a busca' : 'Sem produtos cadastrados pra venda'}
                </p>
              ) : (
                <ul className="space-y-1 max-h-72 overflow-y-auto">
                  {pickerData.groups.map((g) => (
                    <li key={g.gid}>
                      <button type="button" onClick={() => setPickerGroup(g.gid)} className="w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between gap-3 hover:bg-[color-mix(in_srgb,var(--admin-accent)_10%,transparent)]" style={{ background: 'var(--admin-surface-hi)' }}>
                        <span className="text-sm font-semibold block truncate" style={{ color: 'var(--admin-text)' }}>
                          {g.base.name} <span style={{ color: '#9333EA' }}>· {g.vars.length} variantes</span>
                        </span>
                        <span className="text-sm flex-shrink-0" style={{ color: 'var(--admin-text-faded)' }}>›</span>
                      </button>
                    </li>
                  ))}
                  {pickerData.singles.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => pickProduct(p)} className="w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between gap-3 hover:bg-[color-mix(in_srgb,var(--admin-accent)_10%,transparent)]" style={{ background: 'var(--admin-surface-hi)' }}>
                        <span className="min-w-0">
                          <span className="text-sm font-semibold block truncate" style={{ color: 'var(--admin-text)' }}>{p.name}{p.variant ? ` · ${p.variant}` : ''}</span>
                          <span className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>{p.track_stock ? `${p.quantity} ${p.unit} em estoque` : 'sem controle de estoque'}</span>
                        </span>
                        <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: 'var(--admin-text)' }}>{p.price != null ? brl(p.price) : '—'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {/* Form com produto escolhido */}
          {productId && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => { setProductId(''); setPriceStr('') }}
                className="text-xs underline"
                style={{ color: 'var(--admin-accent)' }}
              >
                ← Trocar produto
              </button>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>Qtd</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="admin-input w-full px-3 py-2 rounded-xl text-sm mt-0.5 tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>Preço un.</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={priceStr}
                    onChange={(e) => setPriceStr(e.target.value)}
                    className="admin-input w-full px-3 py-2 rounded-xl text-sm mt-0.5 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                  Profissional (opcional)
                </label>
                <select
                  value={professionalId}
                  onChange={(e) => setProfessionalId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm mt-0.5 pr-9"
                  style={selectStyle}
                >
                  <option value="">Sem profissional</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.is_receptionist ? ' (recepção)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {stockWarn && (
                <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}>
                  Estoque insuficiente · atual {stockWarn.atual}, pedido {stockWarn.pedido}
                </div>
              )}

              {error && (
                <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}>
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer · só aparece com produto escolhido */}
        {productId && (
          <footer className="flex-shrink-0 border-t px-5 py-4 flex items-center justify-between gap-3" style={{ borderColor: 'var(--admin-divider)', background: 'var(--admin-surface)' }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>Total</p>
              <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>{brl(total)}</p>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !!stockWarn}
              className="px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
              style={{
                background: 'var(--admin-accent)',
                color: '#fff',
                boxShadow: '0 6px 14px -4px color-mix(in srgb, var(--admin-accent) 50%, transparent)',
              }}
            >
              <IconPlus size={14} /> {submitting ? 'Adicionando...' : 'Adicionar à comanda'}
            </button>
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}
