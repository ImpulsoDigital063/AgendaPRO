'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose, IconPencil, IconClock, IconTrash, IconAlert, IconPlus } from '@/components/ui/Icon'
import AjustarEstoqueModal from './AjustarEstoqueModal'
import ProductImageUpload from './ProductImageUpload'

type Product = {
  id: string
  name: string
  description: string | null
  unit: string
  price: number | null
  cost: number | null
  quantity: number
  min_quantity: number
  // v64
  brand_id?: string | null
  category_id?: string | null
  variant?: string | null
  expires_at?: string | null
  pack_quantity?: number | null
  barcode?: string | null
  sku?: string | null
  track_stock?: boolean
  sale_active?: boolean
  commission_type?: 'percent' | 'fixed' | null
  commission_value?: number | null
  image_url?: string | null
  brand?: { id: string; name: string } | { id: string; name: string }[] | null
  category?: { id: string; name: string } | { id: string; name: string }[] | null
}

function pickRel<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null
  return Array.isArray(rel) ? (rel[0] ?? null) : rel
}

type Movement = {
  id: string
  type: 'entry' | 'exit' | 'adjust'
  quantity: number
  reason: string | null
  created_at: string
}

type Tab = 'resumo' | 'editar' | 'historico'

type Props = {
  product: Product
  businessId: string
  onClose: () => void
  onChanged: () => void // chamado após qualquer save (refresh)
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

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const TYPE_META: Record<Movement['type'], { label: string; color: string; sign: string }> = {
  entry: { label: 'Entrada', color: '#10B981', sign: '+' },
  exit: { label: 'Saída', color: '#EF4444', sign: '−' },
  adjust: { label: 'Ajuste', color: '#3B82F6', sign: '±' },
}

export default function ProdutoDrawer({ product, businessId, onClose, onChanged }: Props) {
  const [tab, setTab] = useState<Tab>('resumo')
  const [showAjustar, setShowAjustar] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!portalReady) return null

  const status: 'ok' | 'low' | 'out' =
    product.quantity <= 0 ? 'out'
      : product.min_quantity > 0 && product.quantity <= product.min_quantity ? 'low'
      : 'ok'
  const statusColor = status === 'out' ? '#EF4444' : status === 'low' ? '#F59E0B' : '#10B981'
  const statusLabel = status === 'out' ? 'Esgotado' : status === 'low' ? 'Estoque baixo' : 'Em estoque'

  return createPortal(
    <div className="fixed inset-0 z-[150]" role="dialog" aria-modal="true">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />

      <div
        className="absolute inset-y-0 right-0 flex flex-col"
        style={{
          width: 'min(520px, 100vw)',
          background: 'var(--admin-surface)',
          boxShadow: '-12px 0 32px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 py-3 flex-shrink-0"
          style={{ background: 'var(--admin-surface-hi)', borderBottom: '1px solid var(--admin-border)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                Produto
              </p>
              <h3 className="text-base font-bold truncate" style={{ color: 'var(--admin-text)' }}>{product.name}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--admin-input-bg)]"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              <IconClose size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3">
            {([
              { v: 'resumo', l: 'Resumo' },
              { v: 'editar', l: 'Editar' },
              { v: 'historico', l: 'Histórico' },
            ] as const).map((t) => (
              <button
                key={t.v}
                type="button"
                onClick={() => setTab(t.v)}
                className="flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"
                style={
                  tab === t.v
                    ? { background: 'var(--admin-accent)', color: '#fff' }
                    : { background: 'transparent', color: 'var(--admin-text-mute)' }
                }
              >
                {t.l}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'resumo' && (
            <ResumoTab
              product={product}
              status={status}
              statusColor={statusColor}
              statusLabel={statusLabel}
              onMovimentar={() => setShowAjustar(true)}
            />
          )}
          {tab === 'editar' && (
            <EditarTab
              product={product}
              businessId={businessId}
              onSaved={onChanged}
              onDelete={() => setConfirmDelete(true)}
            />
          )}
          {tab === 'historico' && <HistoricoTab productId={product.id} />}
        </div>
      </div>

      {/* Sub-modal: ajustar estoque · z mais alto que o drawer */}
      {showAjustar && (
        <AjustarEstoqueModal
          product={product}
          onClose={() => setShowAjustar(false)}
          onSuccess={() => {
            setShowAjustar(false)
            onChanged()
          }}
        />
      )}

      {/* Confirmar exclusão */}
      {confirmDelete && (
        <ConfirmDelete
          name={product.name}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' })
            setConfirmDelete(false)
            onClose()
            onChanged()
          }}
        />
      )}
    </div>,
    document.body,
  )
}

/* ============================================================
 * TAB · Resumo
 * ============================================================ */
function ResumoTab({
  product, status, statusColor, statusLabel, onMovimentar,
}: {
  product: Product
  status: 'ok' | 'low' | 'out'
  statusColor: string
  statusLabel: string
  onMovimentar: () => void
}) {
  const valor = (Number(product.cost ?? product.price ?? 0) * Number(product.quantity))
  return (
    <div className="space-y-4">
      {/* Foto · só renderiza se tiver image_url */}
      {product.image_url && (
        <div
          className="w-full rounded-2xl overflow-hidden"
          style={{
            aspectRatio: '4/3',
            background: `url(${product.image_url}) center/cover, var(--admin-input-bg)`,
            border: '1px solid var(--admin-border)',
          }}
          role="img"
          aria-label={product.name}
        />
      )}

      {/* Status chip */}
      <span
        className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
        style={{
          background: `linear-gradient(135deg, ${statusColor} 0%, color-mix(in srgb, ${statusColor} 75%, black) 100%)`,
          color: '#fff',
          boxShadow: `0 2px 6px -1px color-mix(in srgb, ${statusColor} 50%, transparent), inset 0 1px 0 rgba(255,255,255,0.3)`,
        }}
      >
        {status === 'low' && <IconAlert size={11} />}
        {statusLabel}
      </span>

      {/* KPI grande · quantidade atual */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'var(--admin-surface-hi)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
          Quantidade em estoque
        </p>
        <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
          {formatQty(product.quantity, product.unit)}
        </p>
        {product.min_quantity > 0 && (
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
            Alerta mínimo: <span className="font-bold tabular-nums">{formatQty(product.min_quantity, product.unit)}</span>
          </p>
        )}
      </div>

      {/* Botão grande · movimentar */}
      <button
        type="button"
        onClick={onMovimentar}
        className="w-full py-3 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-transform hover:-translate-y-px"
        style={{
          background: 'linear-gradient(180deg, var(--brand-primary, #1AA9A8) 0%, color-mix(in srgb, var(--brand-primary, #1AA9A8) 70%, black) 100%)',
          color: '#fff',
          borderTop: '1px solid rgba(255,255,255,0.25)',
          boxShadow: '0 8px 22px -8px color-mix(in srgb, var(--brand-primary, #1AA9A8) 55%, transparent)',
        }}
      >
        <IconPlus size={14} /> Movimentar estoque
      </button>

      {/* Categorização · chips */}
      {(pickRel(product.brand) || pickRel(product.category) || product.variant) && (
        <div className="flex flex-wrap gap-1.5">
          {pickRel(product.brand) && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-mute)' }}>
              {pickRel(product.brand)!.name}
            </span>
          )}
          {pickRel(product.category) && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: 'color-mix(in srgb, var(--admin-accent) 12%, transparent)', color: 'var(--admin-accent)' }}>
              {pickRel(product.category)!.name}
            </span>
          )}
          {product.variant && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}>
              {product.variant}
            </span>
          )}
        </div>
      )}

      {/* Detalhes · KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <InfoCard label="Preço de venda" value={formatBRL(product.price)} />
        <InfoCard label="Custo unitário" value={formatBRL(product.cost)} />
        <InfoCard label="Unidade" value={product.unit} />
        <InfoCard label="Valor estoque" value={formatBRL(valor)} />
        {product.sku && <InfoCard label="SKU" value={product.sku} />}
        {product.barcode && <InfoCard label="Código de barras" value={product.barcode} />}
        {product.pack_quantity && <InfoCard label="Por embalagem" value={`${product.pack_quantity} ${product.unit}`} />}
        {product.expires_at && <InfoCard label="Validade" value={new Date(product.expires_at + 'T12:00:00').toLocaleDateString('pt-BR')} />}
        {product.commission_value && product.commission_type && (
          <InfoCard label="Comissão" value={product.commission_type === 'percent' ? `${product.commission_value}%` : formatBRL(product.commission_value)} />
        )}
      </div>

      {product.track_stock === false && (
        <div className="rounded-xl px-3 py-2 text-xs" style={{ background: 'rgba(148,163,184,0.12)', color: '#64748B' }}>
          Este produto está marcado como <strong>sem controle de estoque</strong>.
        </div>
      )}
      {product.sale_active === false && (
        <div className="rounded-xl px-3 py-2 text-xs" style={{ background: 'rgba(148,163,184,0.12)', color: '#64748B' }}>
          Este produto está marcado como <strong>uso interno</strong> (não vende).
        </div>
      )}

      {product.description && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-faded)' }}>
            Descrição
          </p>
          <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>{product.description}</p>
        </div>
      )}
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: 'var(--admin-input-bg)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
        {label}
      </p>
      <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>{value}</p>
    </div>
  )
}

/* ============================================================
 * TAB · Editar metadados · paridade total v64
 * ============================================================ */
type Brand = { id: string; name: string }
type Category = { id: string; name: string }

function EditarTab({
  product, businessId, onSaved, onDelete,
}: {
  product: Product
  businessId: string
  onSaved: () => void
  onDelete: () => void
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(product.image_url ?? null)
  // Básico
  const [name, setName] = useState(product.name)
  const [description, setDescription] = useState(product.description ?? '')
  const [unit, setUnit] = useState(product.unit)
  // Categorização
  const [brandId, setBrandId] = useState<string>(product.brand_id ?? '')
  const [categoryId, setCategoryId] = useState<string>(product.category_id ?? '')
  const [variant, setVariant] = useState<string>(product.variant ?? '')
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [newBrand, setNewBrand] = useState('')
  const [newCategory, setNewCategory] = useState('')
  // Estoque
  const [trackStock, setTrackStock] = useState<boolean>(product.track_stock ?? true)
  const [minQuantity, setMinQuantity] = useState<string>(product.min_quantity.toString())
  const [packQuantity, setPackQuantity] = useState<string>(product.pack_quantity?.toString() ?? '')
  const [expiresAt, setExpiresAt] = useState<string>(product.expires_at ?? '')
  // Identificação
  const [sku, setSku] = useState<string>(product.sku ?? '')
  const [barcode, setBarcode] = useState<string>(product.barcode ?? '')
  // Venda
  const [saleActive, setSaleActive] = useState<boolean>(product.sale_active ?? true)
  const [price, setPrice] = useState<string>(product.price?.toString() ?? '')
  const [cost, setCost] = useState<string>(product.cost?.toString() ?? '')
  const [commissionType, setCommissionType] = useState<'percent' | 'fixed' | ''>(product.commission_type ?? '')
  const [commissionValue, setCommissionValue] = useState<string>(product.commission_value?.toString() ?? '')

  // Seções colapsáveis
  const [showCategorizacao, setShowCategorizacao] = useState(true)
  const [showEstoque, setShowEstoque] = useState(true)
  const [showIdentificacao, setShowIdentificacao] = useState(false)
  const [showVenda, setShowVenda] = useState(true)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/product-brands').then((r) => r.json()).then((d) => setBrands(d.brands ?? []))
    fetch('/api/admin/product-categories').then((r) => r.json()).then((d) => setCategories(d.categories ?? []))
  }, [])

  async function criarMarca() {
    const n = newBrand.trim()
    if (!n) return
    const res = await fetch('/api/admin/product-brands', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: n }),
    })
    if (res.ok) {
      const d = await res.json()
      setBrands((prev) => [...prev.filter((b) => b.id !== d.brand.id), d.brand].sort((a, b) => a.name.localeCompare(b.name)))
      setBrandId(d.brand.id)
      setNewBrand('')
    }
  }

  async function criarCategoria() {
    const n = newCategory.trim()
    if (!n) return
    const res = await fetch('/api/admin/product-categories', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: n }),
    })
    if (res.ok) {
      const d = await res.json()
      setCategories((prev) => [...prev.filter((c) => c.id !== d.category.id), d.category].sort((a, b) => a.name.localeCompare(b.name)))
      setCategoryId(d.category.id)
      setNewCategory('')
    }
  }

  async function save() {
    setError(null)
    if (!name.trim()) { setError('Nome obrigatório'); return }
    setSaving(true)
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        unit,
        image_url: imageUrl,
        brand_id: brandId || null,
        category_id: categoryId || null,
        variant: variant.trim() || null,
        track_stock: trackStock,
        min_quantity: minQuantity ? Number(minQuantity) : 0,
        pack_quantity: packQuantity ? Number(packQuantity) : null,
        expires_at: expiresAt || null,
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        sale_active: saleActive,
        price: saleActive && price ? Number(price) : null,
        cost: cost ? Number(cost) : null,
        commission_type: saleActive && commissionType ? commissionType : null,
        commission_value: saleActive && commissionValue ? Number(commissionValue) : null,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erro ao salvar')
      return
    }
    onSaved()
  }

  return (
    <div className="space-y-3">
      {/* Foto */}
      <div>
        <EditLabel>Foto do produto</EditLabel>
        <ProductImageUpload
          businessId={businessId}
          productId={product.id}
          initialUrl={imageUrl}
          onChange={setImageUrl}
        />
      </div>

      {/* Básico */}
      <div className="space-y-2">
        <EditLabel>Nome</EditLabel>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
        <EditLabel>Descrição</EditLabel>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="admin-input w-full px-3 py-2.5 rounded-xl text-sm resize-none" />
        <div>
          <EditLabel>Unidade</EditLabel>
          <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
        </div>
      </div>

      {/* Categorização */}
      <EditSection title="Categorização" open={showCategorizacao} onToggle={() => setShowCategorizacao((v) => !v)}>
        <div className="grid grid-cols-1 gap-2">
          <div>
            <EditLabel>Marca</EditLabel>
            <SelectWithCreate options={brands} value={brandId} onChange={setBrandId} placeholder="Sem marca" newValue={newBrand} setNewValue={setNewBrand} onCreate={criarMarca} createPlaceholder="Nome da marca" />
          </div>
          <div>
            <EditLabel>Categoria</EditLabel>
            <SelectWithCreate options={categories} value={categoryId} onChange={setCategoryId} placeholder="Sem categoria" newValue={newCategory} setNewValue={setNewCategory} onCreate={criarCategoria} createPlaceholder="Nome da categoria" />
          </div>
          <div>
            <EditLabel>Variante (cor / tom / tamanho)</EditLabel>
            <input type="text" value={variant} onChange={(e) => setVariant(e.target.value)} placeholder="#T1B/27 · Preto · Marsala" className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
          </div>
        </div>
      </EditSection>

      {/* Estoque */}
      <EditSection
        title="Controle de estoque"
        open={showEstoque}
        onToggle={() => setShowEstoque((v) => !v)}
        toggle={{ value: trackStock, onChange: setTrackStock }}
      >
        {trackStock && (
          <>
            <div>
              <EditLabel>Mínimo alerta</EditLabel>
              <input type="number" min={0} step={0.01} value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <EditLabel>Por embalagem</EditLabel>
                <input type="number" min={0} step={0.01} value={packQuantity} onChange={(e) => setPackQuantity(e.target.value)} placeholder="Ex: 300" className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums" />
              </div>
              <div>
                <EditLabel>Validade</EditLabel>
                <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
              </div>
            </div>
            <p className="text-[11px] italic" style={{ color: 'var(--admin-text-mute)' }}>
              Pra alterar a <strong>quantidade atual</strong>, use a aba Resumo → Movimentar estoque.
            </p>
          </>
        )}
      </EditSection>

      {/* Identificação */}
      <EditSection title="Identificação" open={showIdentificacao} onToggle={() => setShowIdentificacao((v) => !v)}>
        <div>
          <EditLabel>SKU (referência interna)</EditLabel>
          <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ex: JUMBO-PRETO" className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
        </div>
        <div>
          <EditLabel>Código de barras</EditLabel>
          <input type="text" inputMode="numeric" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="789..." className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
        </div>
      </EditSection>

      {/* Venda */}
      <EditSection
        title="Dados de venda"
        open={showVenda}
        onToggle={() => setShowVenda((v) => !v)}
        toggle={{ value: saleActive, onChange: setSaleActive }}
      >
        {saleActive && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <EditLabel>Preço de venda (R$)</EditLabel>
                <input type="number" min={0} step={0.01} value={price} onChange={(e) => setPrice(e.target.value)} className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums" />
              </div>
              <div>
                <EditLabel>Custo (R$)</EditLabel>
                <input type="number" min={0} step={0.01} value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Opcional" className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums" />
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <div>
                <EditLabel>Comissão</EditLabel>
                <input type="number" min={0} step={0.01} value={commissionValue} onChange={(e) => setCommissionValue(e.target.value)} placeholder="0" className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums" />
              </div>
              <div className="flex gap-1">
                {(['percent', 'fixed'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCommissionType(commissionType === t ? '' : t)}
                    className="py-2.5 px-3 rounded-lg text-xs font-bold transition-colors"
                    style={
                      commissionType === t
                        ? { background: 'var(--admin-accent)', color: '#fff' }
                        : { background: 'var(--admin-input-bg)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }
                    }
                  >
                    {t === 'percent' ? '%' : 'R$'}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </EditSection>

      {error && (
        <div className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}>
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex-1 py-3 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40"
          style={{
            background: 'linear-gradient(180deg, var(--brand-primary, #1AA9A8) 0%, color-mix(in srgb, var(--brand-primary, #1AA9A8) 70%, black) 100%)',
            color: '#fff',
            borderTop: '1px solid rgba(255,255,255,0.25)',
            boxShadow: '0 8px 22px -8px color-mix(in srgb, var(--brand-primary, #1AA9A8) 55%, transparent)',
          }}
        >
          <IconPencil size={14} /> {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="w-full py-2.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
        style={{ background: 'transparent', color: '#DC2626', border: '1px solid rgba(220,38,38,0.30)' }}
      >
        <IconTrash size={12} /> Remover produto
      </button>
    </div>
  )
}

function EditLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>
      {children}
    </label>
  )
}

function EditSection({
  title, open, onToggle, toggle, children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  toggle?: { value: boolean; onChange: (v: boolean) => void }
  children: React.ReactNode
}) {
  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--admin-surface-hi)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{title}</p>
        <div className="flex items-center gap-2 flex-shrink-0">
          {toggle && (
            <span onClick={(e) => { e.stopPropagation(); toggle.onChange(!toggle.value) }}>
              <span
                className="inline-block w-9 h-5 rounded-full relative transition-colors"
                style={{ background: toggle.value ? 'var(--admin-accent)' : 'var(--admin-border)' }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: toggle.value ? '18px' : '2px' }}
                />
              </span>
            </span>
          )}
        </div>
      </button>
      {open && <div className="px-4 pb-4 space-y-2">{children}</div>}
    </section>
  )
}

function SelectWithCreate({
  options, value, onChange, placeholder, newValue, setNewValue, onCreate, createPlaceholder,
}: {
  options: { id: string; name: string }[]
  value: string
  onChange: (v: string) => void
  placeholder: string
  newValue: string
  setNewValue: (v: string) => void
  onCreate: () => void
  createPlaceholder: string
}) {
  const [showCreate, setShowCreate] = useState(false)
  const selectStyle = {
    background: `var(--admin-input-bg) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>") no-repeat right 0.625rem center`,
    border: '1px solid var(--admin-border)',
    color: 'var(--admin-text)',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    MozAppearance: 'none' as const,
  }
  if (showCreate) {
    return (
      <div className="flex gap-1.5">
        <input
          type="text"
          autoFocus
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={createPlaceholder}
          className="admin-input flex-1 px-3 py-2.5 rounded-xl text-sm"
          onKeyDown={(e) => { if (e.key === 'Enter') { onCreate(); setShowCreate(false) } }}
        />
        <button type="button" onClick={() => { onCreate(); setShowCreate(false) }} className="px-3 rounded-xl text-xs font-bold" style={{ background: 'var(--admin-accent)', color: '#fff' }}>
          ok
        </button>
        <button type="button" onClick={() => { setShowCreate(false); setNewValue('') }} className="px-2 rounded-xl text-xs" style={{ color: 'var(--admin-text-mute)' }}>
          ×
        </button>
      </div>
    )
  }
  return (
    <div className="flex gap-1.5">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 px-3 py-2.5 pr-9 rounded-xl text-sm" style={selectStyle}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <button
        type="button"
        onClick={() => setShowCreate(true)}
        aria-label="Criar novo"
        title="Criar novo"
        className="w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center"
        style={{ background: 'var(--admin-accent)', color: '#fff' }}
      >
        <IconPlus size={14} />
      </button>
    </div>
  )
}

/* ============================================================
 * TAB · Histórico de movimentações
 * ============================================================ */
function HistoricoTab({ productId }: { productId: string }) {
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/admin/products/${productId}/movements`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) { setMovements(d.movements ?? []); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [productId])

  if (loading) {
    return <p className="text-sm text-center py-6" style={{ color: 'var(--admin-text-mute)' }}>Carregando...</p>
  }

  if (movements.length === 0) {
    return (
      <div className="text-center py-10">
        <IconClock size={28} />
        <p className="text-sm font-semibold mt-2" style={{ color: 'var(--admin-text)' }}>Sem movimentações ainda</p>
        <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          As entradas, saídas e ajustes aparecem aqui em ordem cronológica.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {movements.map((m) => {
        const meta = TYPE_META[m.type]
        const qty = Math.abs(Number(m.quantity))
        return (
          <div
            key={m.id}
            className="rounded-xl p-3 flex items-start gap-3"
            style={{
              background: 'var(--admin-surface-hi)',
              border: '1px solid var(--admin-border)',
              borderLeft: `3px solid ${meta.color}`,
            }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                  {meta.label}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
                  {formatDateTime(m.created_at)}
                </span>
              </div>
              <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                {meta.sign} {qty.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
              </p>
              {m.reason && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-2)' }}>{m.reason}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ConfirmDelete({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => void }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl p-5"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
        }}
      >
        <h3 className="text-base font-bold mb-2" style={{ color: 'var(--admin-text)' }}>Remover {name}?</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--admin-text-2)' }}>
          O produto sai da lista mas o histórico de movimentações é preservado pra auditoria.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'transparent', border: '1px solid var(--admin-border)', color: 'var(--admin-text-2)' }}>
            Cancelar
          </button>
          <button onClick={onConfirm} className="px-5 py-2 rounded-lg text-sm font-bold" style={{ background: 'linear-gradient(135deg, #DC2626, #B91C1C)', color: '#fff' }}>
            Sim, remover
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
