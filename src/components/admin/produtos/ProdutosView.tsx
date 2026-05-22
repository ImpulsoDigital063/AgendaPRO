'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconPlus, IconAlert, IconInbox } from '@/components/ui/Icon'
import NovoProdutoModal from './NovoProdutoModal'
import ProdutoDrawer from './ProdutoDrawer'

type Product = {
  id: string
  name: string
  description: string | null
  unit: string
  price: number | null
  cost: number | null
  quantity: number
  min_quantity: number
  active: boolean
  created_at: string
  updated_at: string
  // v64
  brand_id: string | null
  category_id: string | null
  variant: string | null
  expires_at: string | null
  pack_quantity: number | null
  barcode: string | null
  sku: string | null
  track_stock: boolean
  sale_active: boolean
  commission_type: 'percent' | 'fixed' | null
  commission_value: number | null
  image_url: string | null
  brand?: { id: string; name: string } | { id: string; name: string }[] | null
  category?: { id: string; name: string } | { id: string; name: string }[] | null
}

function pickRel<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null
  return Array.isArray(rel) ? (rel[0] ?? null) : rel
}

type Props = {
  businessId: string
  initialProducts: Product[]
}

function formatBRL(v: number | null): string {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatQty(v: number, unit: string): string {
  const n = Number(v)
  if (Number.isInteger(n)) return `${n} ${unit}`
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${unit}`
}

type StockStatus = 'ok' | 'low' | 'out'

function stockStatus(p: Product): StockStatus {
  // Produtos sem controle de estoque não entram em alerta
  if (!p.track_stock) return 'ok'
  if (p.quantity <= 0) return 'out'
  if (p.min_quantity > 0 && p.quantity <= p.min_quantity) return 'low'
  return 'ok'
}

const STATUS_COLOR: Record<StockStatus, { bg: string; border: string; text: string; label: string }> = {
  ok: { bg: '#10B981', border: 'rgba(16,185,129,0.3)', text: 'Em estoque', label: 'Em estoque' },
  low: { bg: '#F59E0B', border: 'rgba(245,158,11,0.4)', text: 'Estoque baixo', label: 'Estoque baixo' },
  out: { bg: '#EF4444', border: 'rgba(239,68,68,0.4)', text: 'Esgotado', label: 'Esgotado' },
}

export default function ProdutosView({ businessId, initialProducts }: Props) {
  const router = useRouter()
  // Antes: useState(initialProducts) · congelava no snapshot inicial.
  // Após router.refresh() o server passava lista nova mas state ignorava.
  // Eduardo reportou 22/05: "só atualiza quando aperto F5".
  // Fix: usar prop direto · sem state local · re-render automático.
  const products = initialProducts
  const [showNovo, setShowNovo] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [search, setSearch] = useState('')

  // Sincroniza o produto selecionado quando a lista atualiza · sem isso o
  // drawer continua mostrando snapshot velho após movimentar/editar.
  useEffect(() => {
    if (!selectedProduct) return
    const updated = initialProducts.find((p) => p.id === selectedProduct.id)
    if (updated && updated !== selectedProduct) {
      setSelectedProduct(updated)
    } else if (!updated) {
      // Produto foi removido (soft-delete) · fecha drawer
      setSelectedProduct(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProducts])

  const [categoryFilter, setCategoryFilter] = useState<string>('')

  // Lista de categorias únicas no inventário pra filtro
  const categoriesInUse = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of products) {
      const cat = pickRel(p.category)
      if (cat) map.set(cat.id, cat.name)
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [products])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return products.filter((p) => {
      if (categoryFilter) {
        const cat = pickRel(p.category)
        if (cat?.id !== categoryFilter) return false
      }
      if (!term) return true
      return (
        p.name.toLowerCase().includes(term) ||
        (p.description ?? '').toLowerCase().includes(term) ||
        (p.sku ?? '').toLowerCase().includes(term) ||
        (p.variant ?? '').toLowerCase().includes(term)
      )
    })
  }, [products, search, categoryFilter])

  // KPIs
  const totalProdutos = products.length
  const baixoEstoque = products.filter((p) => stockStatus(p) === 'low').length
  const esgotados = products.filter((p) => stockStatus(p) === 'out').length
  const valorEmEstoque = products.reduce(
    (sum, p) => sum + (Number(p.cost ?? p.price ?? 0) * Number(p.quantity)),
    0,
  )

  function refresh() {
    router.refresh()
  }

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <header>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-faded)' }}>
          Estoque
        </p>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight inline-flex items-center gap-2" style={{ color: 'var(--admin-text)' }}>
          <IconInbox size={22} /> Produtos
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          Cadastre seus produtos · controle entrada e saída · receba alerta de mínimo
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Total cadastrado" value={String(totalProdutos)} tone="neutral" />
        <KPI label="Estoque baixo" value={String(baixoEstoque)} tone={baixoEstoque > 0 ? 'warn' : 'neutral'} />
        <KPI label="Esgotados" value={String(esgotados)} tone={esgotados > 0 ? 'danger' : 'neutral'} />
        <KPI label="Valor em estoque" value={formatBRL(valorEmEstoque)} tone="neutral" />
      </div>

      {/* Search + Novo */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, descrição, SKU ou variante"
          className="admin-input flex-1 px-3 py-2.5 rounded-xl text-sm"
        />
        <button
          type="button"
          onClick={() => setShowNovo(true)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-px"
          style={{
            background: 'linear-gradient(180deg, var(--brand-primary, #1AA9A8) 0%, color-mix(in srgb, var(--brand-primary, #1AA9A8) 70%, black) 100%)',
            color: '#fff',
            borderTop: '1px solid rgba(255,255,255,0.25)',
            boxShadow: '0 8px 22px -8px color-mix(in srgb, var(--brand-primary, #1AA9A8) 55%, transparent)',
          }}
        >
          <IconPlus size={14} /> Novo produto
        </button>
      </div>

      {/* Filtro por categoria (chips) · só aparece quando há categorias */}
      {categoriesInUse.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest mr-1" style={{ color: 'var(--admin-text-faded)' }}>
            Categorias:
          </span>
          <button
            type="button"
            onClick={() => setCategoryFilter('')}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors"
            style={
              categoryFilter === ''
                ? { background: 'var(--admin-accent)', color: '#fff' }
                : { background: 'var(--admin-input-bg)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }
            }
          >
            Todas
          </button>
          {categoriesInUse.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryFilter(c.id === categoryFilter ? '' : c.id)}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors"
              style={
                categoryFilter === c.id
                  ? { background: 'var(--admin-accent)', color: '#fff' }
                  : { background: 'var(--admin-input-bg)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }
              }
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{
            background: 'var(--admin-surface)',
            border: '1px dashed var(--admin-border)',
          }}
        >
          <p className="text-base font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
            {products.length === 0 ? 'Nenhum produto cadastrado ainda' : 'Nada encontrado'}
          </p>
          <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
            {products.length === 0
              ? 'Clique em "Novo produto" pra cadastrar o primeiro item do seu estoque.'
              : 'Tente outro termo na busca.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => {
            const status = stockStatus(p)
            const color = STATUS_COLOR[status]
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProduct(p)}
                className="text-left rounded-2xl p-4 transition-all hover:-translate-y-px"
                style={{
                  background: `linear-gradient(180deg, var(--admin-surface) 0%, color-mix(in srgb, var(--admin-surface-hi) 70%, var(--admin-surface)) 100%)`,
                  border: '1px solid var(--admin-border)',
                  borderTopColor: 'rgba(255,255,255,0.4)',
                  boxShadow: '0 8px 20px -8px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  {/* Thumb · só se tem foto */}
                  {p.image_url && (
                    <div
                      className="w-12 h-12 rounded-lg flex-shrink-0"
                      style={{
                        background: `url(${p.image_url}) center/cover`,
                        border: '1px solid var(--admin-border)',
                      }}
                      aria-hidden
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--admin-text)' }}>
                      {p.name}{p.variant && <span style={{ color: 'var(--admin-text-mute)', fontWeight: 500 }}> · {p.variant}</span>}
                    </p>
                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                      {pickRel(p.brand) && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-mute)' }}>
                          {pickRel(p.brand)!.name}
                        </span>
                      )}
                      {pickRel(p.category) && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in srgb, var(--admin-accent) 12%, transparent)', color: 'var(--admin-accent)' }}>
                          {pickRel(p.category)!.name}
                        </span>
                      )}
                      {!p.track_stock && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(148,163,184,0.15)', color: '#64748B' }}>
                          Sem controle
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0 inline-flex items-center gap-1"
                    style={{
                      background: `linear-gradient(135deg, ${color.bg} 0%, color-mix(in srgb, ${color.bg} 75%, black) 100%)`,
                      color: '#fff',
                      boxShadow: `0 2px 6px -1px ${color.border}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                    }}
                  >
                    {status === 'low' && <IconAlert size={10} />}
                    {color.label}
                  </span>
                </div>
                <div className="flex items-end justify-between gap-3 mt-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                      Em estoque
                    </p>
                    <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                      {formatQty(p.quantity, p.unit)}
                    </p>
                    {p.min_quantity > 0 && (
                      <p className="text-[10px] mt-0.5 tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>
                        Mínimo: {formatQty(p.min_quantity, p.unit)}
                      </p>
                    )}
                  </div>
                  {p.price != null && (
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                        Venda
                      </p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                        {formatBRL(p.price)}
                      </p>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Modais */}
      {showNovo && (
        <NovoProdutoModal
          businessId={businessId}
          onClose={() => setShowNovo(false)}
          onSuccess={() => {
            setShowNovo(false)
            refresh()
          }}
        />
      )}
      {selectedProduct && (
        <ProdutoDrawer
          product={selectedProduct}
          businessId={businessId}
          onClose={() => setSelectedProduct(null)}
          onChanged={refresh}
        />
      )}
    </div>
  )
}

function KPI({ label, value, tone }: { label: string; value: string; tone: 'neutral' | 'warn' | 'danger' }) {
  const accent = tone === 'warn' ? '#F59E0B' : tone === 'danger' ? '#EF4444' : 'var(--admin-accent, #1AA9A8)'
  return (
    <div
      className="rounded-2xl p-3"
      style={{
        background: `linear-gradient(180deg, var(--admin-surface) 0%, color-mix(in srgb, var(--admin-surface-hi) 70%, var(--admin-surface)) 100%)`,
        border: '1px solid var(--admin-border)',
        borderTopColor: 'rgba(255,255,255,0.4)',
        boxShadow: '0 6px 16px -6px rgba(0,0,0,0.06)',
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
        {label}
      </p>
      <p className="text-xl font-bold tabular-nums mt-0.5" style={{ color: accent }}>
        {value}
      </p>
    </div>
  )
}
