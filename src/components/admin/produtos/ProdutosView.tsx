'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { IconPlus, IconAlert, IconInbox, IconDollar, IconChevronRight, IconGift } from '@/components/ui/Icon'
import { getAreaPrefix } from '@/lib/area-prefix'
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
  variant_group_id: string | null
  expires_at: string | null
  pack_quantity: number | null
  barcode: string | null
  sku: string | null
  track_stock: boolean
  sale_active: boolean
  commission_type: 'percent' | 'fixed' | 'none' | null
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
  const pathname = usePathname()
  const areaPrefix = getAreaPrefix(pathname)
  // Antes: useState(initialProducts) · congelava no snapshot inicial.
  // Após router.refresh() o server passava lista nova mas state ignorava.
  // Eduardo reportou 22/05: "só atualiza quando aperto F5".
  // Fix: usar prop direto · sem state local · re-render automático.
  const products = initialProducts
  const [showNovo, setShowNovo] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<Product[] | null>(null)
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

  // Re-sincroniza o GRUPO aberto após refresh (ex: adicionou/removeu variante) ·
  // sem isso o modal mostra a lista de variantes velha.
  useEffect(() => {
    if (!selectedGroup || selectedGroup.length === 0) return
    const gid = selectedGroup[0].variant_group_id
    if (!gid) return
    const fresh = initialProducts
      .filter((p) => p.variant_group_id === gid)
      .sort((a, b) => (a.variant ?? '').localeCompare(b.variant ?? ''))
    if (fresh.length > 0) setSelectedGroup(fresh)
    else setSelectedGroup(null)
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

  // Agrupa variantes do mesmo produto (variant_group_id) num só card (v88 ·
  // Etapa 2). Produto sem grupo, ou grupo com 1 só, vira card normal.
  type Group = { key: string; isGroup: boolean; base: Product; variants: Product[] }
  const groups = useMemo<Group[]>(() => {
    const byGroup = new Map<string, Product[]>()
    const singles: Product[] = []
    for (const p of filtered) {
      if (p.variant_group_id) {
        const arr = byGroup.get(p.variant_group_id) ?? []
        arr.push(p)
        byGroup.set(p.variant_group_id, arr)
      } else {
        singles.push(p)
      }
    }
    const entries: Group[] = []
    for (const [gid, vars] of byGroup.entries()) {
      const sorted = [...vars].sort((a, b) => (a.variant ?? '').localeCompare(b.variant ?? ''))
      entries.push({ key: gid, isGroup: sorted.length > 1, base: sorted[0], variants: sorted })
    }
    for (const p of singles) entries.push({ key: p.id, isGroup: false, base: p, variants: [p] })
    return entries.sort((a, b) => a.base.name.localeCompare(b.base.name))
  }, [filtered])

  // Status agregado de um grupo: pior caso (esgotado > baixo > ok).
  function groupStatus(vars: Product[]): StockStatus {
    let worst: StockStatus = 'ok'
    for (const v of vars) {
      const s = stockStatus(v)
      if (s === 'out') return 'out'
      if (s === 'low') worst = 'low'
    }
    return worst
  }

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
        <div className="flex gap-2">
          <Link
            href={`${areaPrefix}/produtos/entrada`}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-px"
            style={{
              background: 'var(--admin-input-bg)',
              color: 'var(--admin-text)',
              border: '1px solid var(--admin-border)',
            }}
            title="Recebeu uma compra do fornecedor"
          >
            <IconInbox size={14} /> Entrada
          </Link>
          {areaPrefix === '/admin' && (
            <Link
              href={`${areaPrefix}/produtos/combos`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-px"
              style={{
                background: 'var(--admin-input-bg)',
                color: 'var(--admin-text)',
                border: '1px solid var(--admin-border)',
              }}
              title="Combos = serviço + produto vendidos juntos por um preço"
            >
              <IconGift size={14} /> Combos
            </Link>
          )}
          <Link
            href={`${areaPrefix}/produtos/vender`}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-px"
            style={{
              background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
              color: '#fff',
              borderTop: '1px solid rgba(255,255,255,0.25)',
              boxShadow: '0 8px 22px -8px rgba(5,150,105,0.55)',
            }}
            title="Vender produto pra cliente · baixa estoque automaticamente"
          >
            <IconDollar size={14} /> Vender
          </Link>
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
          {groups.map((g) =>
            g.isGroup ? (
              <GroupCard key={g.key} group={g.variants} status={groupStatus(g.variants)} onClick={() => setSelectedGroup(g.variants)} />
            ) : (
              <ProductCard key={g.key} p={g.base} onClick={() => setSelectedProduct(g.base)} />
            ),
          )}
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
      {selectedGroup && (
        <VarianteGrupoModal
          variants={selectedGroup}
          onPick={(p) => { setSelectedGroup(null); setSelectedProduct(p) }}
          onAdded={refresh}
          onClose={() => setSelectedGroup(null)}
        />
      )}
    </div>
  )
}

/** Card de produto único (sem variantes). */
function ProductCard({ p, onClick }: { p: Product; onClick: () => void }) {
  const status = stockStatus(p)
  const color = STATUS_COLOR[status]
  return (
    <button
      type="button"
      onClick={onClick}
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
        {p.image_url && (
          <div className="w-12 h-12 rounded-lg flex-shrink-0" style={{ background: `url(${p.image_url}) center/cover`, border: '1px solid var(--admin-border)' }} aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate" style={{ color: 'var(--admin-text)' }}>
            {p.name}{p.variant && <span style={{ color: 'var(--admin-text-mute)', fontWeight: 500 }}> · {p.variant}</span>}
          </p>
          <div className="flex flex-wrap items-center gap-1 mt-0.5">
            {pickRel(p.brand) && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-mute)' }}>{pickRel(p.brand)!.name}</span>
            )}
            {pickRel(p.category) && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in srgb, var(--admin-accent) 12%, transparent)', color: 'var(--admin-accent)' }}>{pickRel(p.category)!.name}</span>
            )}
            {!p.track_stock && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(148,163,184,0.15)', color: '#64748B' }}>Sem controle</span>
            )}
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0 inline-flex items-center gap-1" style={{ background: `linear-gradient(135deg, ${color.bg} 0%, color-mix(in srgb, ${color.bg} 75%, black) 100%)`, color: '#fff', boxShadow: `0 2px 6px -1px ${color.border}, inset 0 1px 0 rgba(255,255,255,0.3)` }}>
          {status === 'low' && <IconAlert size={10} />}
          {color.label}
        </span>
      </div>
      <div className="flex items-end justify-between gap-3 mt-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>Em estoque</p>
          <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>{formatQty(p.quantity, p.unit)}</p>
          {p.min_quantity > 0 && (
            <p className="text-[10px] mt-0.5 tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>Mínimo: {formatQty(p.min_quantity, p.unit)}</p>
          )}
        </div>
        {p.price != null && (
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>Venda</p>
            <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>{formatBRL(p.price)}</p>
          </div>
        )}
      </div>
    </button>
  )
}

/** Card de PRODUTO COM VARIANTES · agrega estoque + faixa de preço, abre a lista. */
function GroupCard({ group, status, onClick }: { group: Product[]; status: StockStatus; onClick: () => void }) {
  const base = group[0]
  const color = STATUS_COLOR[status]
  const totalStock = group.reduce((s, v) => s + Number(v.quantity || 0), 0)
  const prices = group.map((v) => v.price).filter((x): x is number => x != null)
  const minP = prices.length ? Math.min(...prices) : null
  const maxP = prices.length ? Math.max(...prices) : null
  const priceLabel = minP == null ? null : minP === maxP ? formatBRL(minP) : `${formatBRL(minP)} – ${formatBRL(maxP)}`
  return (
    <button
      type="button"
      onClick={onClick}
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
        {base.image_url && (
          <div className="w-12 h-12 rounded-lg flex-shrink-0" style={{ background: `url(${base.image_url}) center/cover`, border: '1px solid var(--admin-border)' }} aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate" style={{ color: 'var(--admin-text)' }}>{base.name}</p>
          <div className="flex flex-wrap items-center gap-1 mt-0.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in srgb, #9333EA 12%, transparent)', color: '#9333EA' }}>
              {group.length} variantes
            </span>
            {pickRel(base.category) && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in srgb, var(--admin-accent) 12%, transparent)', color: 'var(--admin-accent)' }}>{pickRel(base.category)!.name}</span>
            )}
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0 inline-flex items-center gap-1" style={{ background: `linear-gradient(135deg, ${color.bg} 0%, color-mix(in srgb, ${color.bg} 75%, black) 100%)`, color: '#fff', boxShadow: `0 2px 6px -1px ${color.border}, inset 0 1px 0 rgba(255,255,255,0.3)` }}>
          {status === 'low' && <IconAlert size={10} />}
          {color.label}
        </span>
      </div>
      <div className="flex items-end justify-between gap-3 mt-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>Estoque total</p>
          <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>{formatQty(totalStock, base.unit)}</p>
        </div>
        {priceLabel && (
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>Venda</p>
            <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>{priceLabel}</p>
          </div>
        )}
      </div>
    </button>
  )
}

/** Lista as variantes de um grupo · clicar abre o detalhe (ProdutoDrawer) da
 *  variante · "+ Adicionar variante" cria nova linha no mesmo grupo. */
function VarianteGrupoModal({ variants, onPick, onAdded, onClose }: { variants: Product[]; onPick: (p: Product) => void; onAdded: () => void; onClose: () => void }) {
  const base = variants[0]
  const [adding, setAdding] = useState(false)
  const [vLabel, setVLabel] = useState('')
  const [vPrice, setVPrice] = useState('')
  const [vQty, setVQty] = useState('0')
  const [vSku, setVSku] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addVariante() {
    if (!vLabel.trim()) { setError('Informe o rótulo da variante'); return }
    setError(null)
    setSaving(true)
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        variant_group_id: base.variant_group_id,
        name: base.name,
        unit: base.unit,
        brand_id: base.brand_id ?? null,
        category_id: base.category_id ?? null,
        track_stock: base.track_stock,
        sale_active: base.sale_active,
        commission_type: base.commission_type && base.commission_type !== 'none' ? base.commission_type : null,
        commission_value: base.commission_value ?? null,
        variant: vLabel.trim(),
        price: base.sale_active && vPrice ? Number(vPrice) : null,
        quantity: base.track_stock && vQty ? Number(vQty) : 0,
        sku: vSku.trim() || null,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erro ao adicionar variante')
      return
    }
    setVLabel(''); setVPrice(''); setVQty('0'); setVSku(''); setAdding(false)
    onAdded() // refresh · o grupo re-sincroniza e mostra a nova variante
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col" style={{ background: 'var(--admin-popover-bg, #FFFFFF)', border: '1px solid var(--admin-popover-border, #E2E8F0)', maxHeight: '90vh' }}>
        <header className="flex items-start justify-between p-5 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--admin-text-faded)' }}>{variants.length} variantes</p>
            <h3 className="text-lg font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>{base.name}</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>Toque numa variante pra ver, editar, vender ou movimentar estoque.</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--admin-input-bg)] flex-shrink-0" style={{ color: 'var(--admin-text-mute)' }} aria-label="Fechar">×</button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {variants.map((v) => {
            const st = stockStatus(v)
            const c = STATUS_COLOR[st]
            return (
              <button key={v.id} type="button" onClick={() => onPick(v)} className="w-full text-left rounded-xl p-3 flex items-center justify-between gap-3 transition-colors hover:bg-[var(--admin-surface-hi)]" style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--admin-text)' }}>{v.variant || '—'}</p>
                  <p className="text-[11px] tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>
                    {v.track_stock ? formatQty(v.quantity, v.unit) + ' em estoque' : 'sem controle'}{v.sku ? ` · ${v.sku}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {v.price != null && <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>{formatBRL(v.price)}</span>}
                  <span className="w-2 h-2 rounded-full" style={{ background: c.bg }} aria-label={c.label} />
                  <IconChevronRight size={16} style={{ color: 'var(--admin-text-faded)' }} />
                </div>
              </button>
            )
          })}

          {/* Adicionar variante ao grupo */}
          {adding ? (
            <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}>
              <input type="text" autoFocus value={vLabel} onChange={(e) => setVLabel(e.target.value)} placeholder="Rótulo (ex: Vermelho · P · Morango)" className="admin-input w-full px-3 py-2 rounded-lg text-sm" />
              <div className={`grid gap-2 ${base.track_stock ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {base.sale_active && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>Preço</label>
                    <input type="number" min={0} step={0.01} value={vPrice} onChange={(e) => setVPrice(e.target.value)} className="admin-input w-full px-2.5 py-2 rounded-lg text-sm tabular-nums" />
                  </div>
                )}
                {base.track_stock && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>Estoque</label>
                    <input type="number" min={0} step={0.01} value={vQty} onChange={(e) => setVQty(e.target.value)} className="admin-input w-full px-2.5 py-2 rounded-lg text-sm tabular-nums" />
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>SKU</label>
                  <input type="text" value={vSku} onChange={(e) => setVSku(e.target.value)} placeholder="opcional" className="admin-input w-full px-2.5 py-2 rounded-lg text-sm" />
                </div>
              </div>
              {error && <p className="text-xs font-semibold" style={{ color: '#DC2626' }}>{error}</p>}
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => { setAdding(false); setError(null) }} disabled={saving} className="px-3 py-2 rounded-lg text-xs font-semibold" style={{ color: 'var(--admin-text-mute)' }}>Cancelar</button>
                <button type="button" onClick={addVariante} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50" style={{ background: 'var(--admin-accent)', color: '#fff' }}>
                  {saving ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="w-full py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2" style={{ background: 'color-mix(in srgb, #9333EA 8%, transparent)', border: '1px dashed color-mix(in srgb, #9333EA 50%, transparent)', color: '#9333EA' }}>
              <IconPlus size={14} /> Adicionar variante
            </button>
          )}
        </div>
      </div>
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
