'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose, IconChevronDown, IconChevronRight, IconPlus } from '@/components/ui/Icon'
import ProductImageUpload from './ProductImageUpload'

type Props = {
  businessId: string
  onClose: () => void
  onSuccess: () => void
}

type Brand = { id: string; name: string }
type Category = { id: string; name: string }

const UNIT_OPTIONS = ['un', 'ml', 'l', 'g', 'kg', 'cx', 'pct']

export default function NovoProdutoModal({ businessId: _businessId, onClose, onSuccess }: Props) {
  void _businessId

  // Básico (sempre visível)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [unit, setUnit] = useState('un')
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  // Categorização (colapsável)
  const [showCategorizacao, setShowCategorizacao] = useState(true)
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brandId, setBrandId] = useState<string>('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [variant, setVariant] = useState('')
  const [newBrand, setNewBrand] = useState('')
  const [newCategory, setNewCategory] = useState('')

  // Estoque (com toggle controle de estoque)
  const [showEstoque, setShowEstoque] = useState(true)
  const [trackStock, setTrackStock] = useState(true)
  const [quantity, setQuantity] = useState<string>('0')
  const [minQuantity, setMinQuantity] = useState<string>('0')
  const [packQuantity, setPackQuantity] = useState<string>('')
  const [expiresAt, setExpiresAt] = useState<string>('')

  // Identificação (colapsável)
  const [showIdentificacao, setShowIdentificacao] = useState(false)
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')

  // Venda (com toggle)
  const [showVenda, setShowVenda] = useState(true)
  const [saleActive, setSaleActive] = useState(true)
  const [price, setPrice] = useState<string>('')
  const [cost, setCost] = useState<string>('')
  const [commissionType, setCommissionType] = useState<'percent' | 'fixed' | 'none' | ''>('none')
  const [commissionValue, setCommissionValue] = useState<string>('')

  // Variantes (v88) · cor/tamanho/sabor · cada uma com preço + estoque + sku.
  // Quando ON, o produto vira N linhas agrupadas; os campos únicos de
  // variante/preço/estoque saem (viram por-variante).
  const [showVariantes, setShowVariantes] = useState(false)
  const [hasVariants, setHasVariants] = useState(false)
  const [variants, setVariants] = useState<{ key: string; variant: string; price: string; qty: string; sku: string }[]>([
    { key: 'v1', variant: '', price: '', qty: '0', sku: '' },
  ])
  function addVariant() {
    setVariants((p) => [...p, { key: `v${Date.now()}${p.length}`, variant: '', price: '', qty: '0', sku: '' }])
  }
  function updateVariant(key: string, patch: Partial<{ variant: string; price: string; qty: string; sku: string }>) {
    setVariants((p) => p.map((v) => (v.key === key ? { ...v, ...patch } : v)))
  }
  function removeVariant(key: string) {
    setVariants((p) => (p.length <= 1 ? p : p.filter((v) => v.key !== key)))
  }

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
    // Carrega marcas e categorias existentes
    fetch('/api/admin/product-brands').then((r) => r.json()).then((d) => setBrands(d.brands ?? []))
    fetch('/api/admin/product-categories').then((r) => r.json()).then((d) => setCategories(d.categories ?? []))
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [saving, onClose])

  async function criarMarca() {
    const n = newBrand.trim()
    if (!n) return
    const res = await fetch('/api/admin/product-brands', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
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
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: n }),
    })
    if (res.ok) {
      const d = await res.json()
      setCategories((prev) => [...prev.filter((c) => c.id !== d.category.id), d.category].sort((a, b) => a.name.localeCompare(b.name)))
      setCategoryId(d.category.id)
      setNewCategory('')
    }
  }

  async function submit() {
    setError(null)
    if (!name.trim()) { setError('Nome obrigatório'); return }
    const validVariants = variants.filter((v) => v.variant.trim())
    if (hasVariants && validVariants.length === 0) { setError('Adicione pelo menos 1 variante com rótulo'); return }
    setSaving(true)
    const base = {
      name: name.trim(),
      description: description.trim() || null,
      unit,
      image_url: imageUrl,
      brand_id: brandId || null,
      category_id: categoryId || null,
      min_quantity: trackStock && minQuantity ? Number(minQuantity) : 0,
      pack_quantity: packQuantity ? Number(packQuantity) : null,
      expires_at: expiresAt || null,
      barcode: barcode.trim() || null,
      track_stock: trackStock,
      sale_active: saleActive,
      cost: cost ? Number(cost) : null,
      commission_type: saleActive && commissionType ? commissionType : null,
      commission_value: saleActive && commissionType !== 'none' && commissionValue ? Number(commissionValue) : null,
    }
    const payload = hasVariants
      ? {
          ...base,
          // Variantes: preço/estoque/sku por variante. API cria N linhas agrupadas.
          variants: validVariants.map((v) => ({
            variant: v.variant.trim(),
            price: saleActive && v.price ? Number(v.price) : null,
            quantity: trackStock && v.qty ? Number(v.qty) : 0,
            sku: v.sku.trim() || null,
          })),
        }
      : {
          ...base,
          // Produto único (sem variantes) · campos únicos
          variant: variant.trim() || null,
          quantity: trackStock && quantity ? Number(quantity) : 0,
          sku: sku.trim() || null,
          price: saleActive && price ? Number(price) : null,
        }
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
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
        className="w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
          maxHeight: '92vh',
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

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Básico */}
          <div className="space-y-3">
            {/* Foto · upload com compressão automática (web worker) */}
            <div>
              <FieldLabel>Foto do produto</FieldLabel>
              <ProductImageUpload
                businessId={_businessId}
                initialUrl={imageUrl}
                onChange={setImageUrl}
              />
            </div>
            <FieldLabel>Nome *</FieldLabel>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Jumbo Evolution"
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm"
              autoFocus
            />
            <FieldLabel>Descrição (opcional)</FieldLabel>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Marca · uso · observações"
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm resize-none"
            />
            <div>
              <FieldLabel>Unidade</FieldLabel>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2.5 pr-9 rounded-xl text-sm"
                style={selectStyle}
              >
                {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Categorização */}
          <Section title="Categorização" subtitle="Marca · categoria · variante de cor" open={showCategorizacao} onToggle={() => setShowCategorizacao((v) => !v)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Marca</FieldLabel>
                <SelectWithCreate
                  options={brands}
                  value={brandId}
                  onChange={setBrandId}
                  placeholder="Selecionar marca"
                  newValue={newBrand}
                  setNewValue={setNewBrand}
                  onCreate={criarMarca}
                  createPlaceholder="Nome da marca"
                />
              </div>
              <div>
                <FieldLabel>Categoria</FieldLabel>
                <SelectWithCreate
                  options={categories}
                  value={categoryId}
                  onChange={setCategoryId}
                  placeholder="Selecionar categoria"
                  newValue={newCategory}
                  setNewValue={setNewCategory}
                  onCreate={criarCategoria}
                  createPlaceholder="Nome da categoria"
                />
              </div>
            </div>
            {!hasVariants && (
              <div>
                <FieldLabel>Variante (cor / tom / tamanho)</FieldLabel>
                <input
                  type="text"
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                  placeholder="Ex: #T1B/27 · Preto · Marsala"
                  className="admin-input w-full px-3 py-2.5 rounded-xl text-sm"
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                  Várias cores/tamanhos? Use a seção <strong>Variantes</strong> abaixo.
                </p>
              </div>
            )}
          </Section>

          {/* Variantes (v88) · cor/tamanho/sabor com preço + estoque próprios */}
          <Section
            title="Variantes"
            subtitle={hasVariants ? 'Preço e estoque por variante' : 'Produto único (sem variantes)'}
            open={showVariantes}
            onToggle={() => setShowVariantes((v) => !v)}
            toggle={{ value: hasVariants, onChange: (v) => { setHasVariants(v); if (v) setShowVariantes(true) } }}
          >
            {hasVariants && (
              <div className="space-y-2">
                {variants.map((v, i) => (
                  <div key={v.key} className="rounded-xl p-3 space-y-2" style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>Variante {i + 1}</span>
                      {variants.length > 1 && (
                        <button type="button" onClick={() => removeVariant(v.key)} aria-label="Remover variante" className="w-6 h-6 rounded-full flex items-center justify-center" style={{ color: '#DC2626' }}>
                          <IconClose size={12} />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={v.variant}
                      onChange={(e) => updateVariant(v.key, { variant: e.target.value })}
                      placeholder="Rótulo (ex: Vermelho · P · Morango)"
                      className="admin-input w-full px-3 py-2 rounded-xl text-sm"
                    />
                    <div className={`grid gap-2 ${trackStock ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      {saleActive && (
                        <div>
                          <FieldLabel>Preço (R$)</FieldLabel>
                          <input type="number" min={0} step={0.01} value={v.price} onChange={(e) => updateVariant(v.key, { price: e.target.value })} className="admin-input w-full px-2.5 py-2 rounded-lg text-sm tabular-nums" />
                        </div>
                      )}
                      {trackStock && (
                        <div>
                          <FieldLabel>Estoque</FieldLabel>
                          <input type="number" min={0} step={0.01} value={v.qty} onChange={(e) => updateVariant(v.key, { qty: e.target.value })} className="admin-input w-full px-2.5 py-2 rounded-lg text-sm tabular-nums" />
                        </div>
                      )}
                      <div>
                        <FieldLabel>SKU</FieldLabel>
                        <input type="text" value={v.sku} onChange={(e) => updateVariant(v.key, { sku: e.target.value })} placeholder="opcional" className="admin-input w-full px-2.5 py-2 rounded-lg text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addVariant}
                  className="w-full py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2"
                  style={{ background: 'color-mix(in srgb, var(--admin-accent) 8%, transparent)', border: '1px dashed color-mix(in srgb, var(--admin-accent) 50%, transparent)', color: 'var(--admin-accent)' }}
                >
                  <IconPlus size={14} /> Adicionar variante
                </button>
              </div>
            )}
          </Section>

          {/* Estoque */}
          <Section
            title="Controle de estoque"
            subtitle={trackStock ? 'Acompanha entradas e saídas' : 'Sem controle de quantidade'}
            open={showEstoque}
            onToggle={() => setShowEstoque((v) => !v)}
            toggle={{ value: trackStock, onChange: setTrackStock }}
          >
            {trackStock && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {!hasVariants && (
                    <div>
                      <FieldLabel>Quantidade inicial</FieldLabel>
                      <input type="number" min={0} step={0.01} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums" />
                    </div>
                  )}
                  <div>
                    <FieldLabel>Mínimo alerta</FieldLabel>
                    <input type="number" min={0} step={0.01} value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} placeholder="0 = sem alerta" className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Qtd. por embalagem (opcional)</FieldLabel>
                    <input type="number" min={0} step={0.01} value={packQuantity} onChange={(e) => setPackQuantity(e.target.value)} placeholder="Ex: 300 para 300ml" className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums" />
                  </div>
                  <div>
                    <FieldLabel>Validade (opcional)</FieldLabel>
                    <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
                  </div>
                </div>
              </>
            )}
          </Section>

          {/* Identificação */}
          <Section title="Identificação" subtitle="SKU · código de barras" open={showIdentificacao} onToggle={() => setShowIdentificacao((v) => !v)}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>SKU (referência interna)</FieldLabel>
                <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ex: JUMBO-PRETO" className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
              </div>
              <div>
                <FieldLabel>Código de barras</FieldLabel>
                <input type="text" inputMode="numeric" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="789..." className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
              </div>
            </div>
          </Section>

          {/* Venda */}
          <Section
            title="Dados de venda"
            subtitle={saleActive ? 'Produto vendável · preço e comissão' : 'Só uso interno (não vende)'}
            open={showVenda}
            onToggle={() => setShowVenda((v) => !v)}
            toggle={{ value: saleActive, onChange: setSaleActive }}
          >
            {saleActive && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {!hasVariants && (
                    <div>
                      <FieldLabel>Preço de venda (R$)</FieldLabel>
                      <input type="number" min={0} step={0.01} value={price} onChange={(e) => setPrice(e.target.value)} className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums" />
                    </div>
                  )}
                  <div>
                    <FieldLabel>Custo (R$)</FieldLabel>
                    <input type="number" min={0} step={0.01} value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Opcional" className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums" />
                  </div>
                </div>
                <div className="space-y-2">
                  <FieldLabel>Comissão</FieldLabel>
                  {/* v75 · Eduardo cravou 25/05: default 'Sem comissão' pois a maior parte das vendas não comissiona */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { id: 'none' as const, label: 'Sem comissão' },
                      { id: 'percent' as const, label: '% Percentual' },
                      { id: 'fixed' as const, label: 'R$ Fixo' },
                    ]).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCommissionType(commissionType === opt.id ? '' : opt.id)}
                        className="py-2 px-2 rounded-lg text-[11px] font-bold transition-colors"
                        style={
                          commissionType === opt.id
                            ? { background: 'var(--admin-accent)', color: '#fff' }
                            : { background: 'var(--admin-input-bg)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {(commissionType === 'percent' || commissionType === 'fixed') && (
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={commissionValue}
                      onChange={(e) => setCommissionValue(e.target.value)}
                      placeholder={commissionType === 'percent' ? 'ex: 10 (= 10%)' : 'ex: 5 (= R$ 5 por unidade)'}
                      className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums"
                    />
                  )}
                </div>
              </>
            )}
          </Section>
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
            <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'transparent', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}>
              Cancelar
            </button>
            <button type="button" onClick={submit} disabled={saving || !name.trim()} className="px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40" style={{
              background: 'linear-gradient(180deg, var(--brand-primary, #1AA9A8) 0%, color-mix(in srgb, var(--brand-primary, #1AA9A8) 70%, black) 100%)',
              color: '#fff',
              borderTop: '1px solid rgba(255,255,255,0.25)',
              boxShadow: '0 8px 22px -8px color-mix(in srgb, var(--brand-primary, #1AA9A8) 55%, transparent)',
            }}>
              {saving ? 'Cadastrando...' : 'Cadastrar produto'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

const selectStyle = {
  background: `var(--admin-input-bg) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>") no-repeat right 0.625rem center`,
  border: '1px solid var(--admin-border)',
  color: 'var(--admin-text)',
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
  MozAppearance: 'none' as const,
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>
      {children}
    </label>
  )
}

function Section({
  title, subtitle, open, onToggle, toggle, children,
}: {
  title: string
  subtitle?: string
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
        <div className="min-w-0">
          <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{title}</p>
          {subtitle && (
            <p className="text-[11px] truncate" style={{ color: 'var(--admin-text-faded)' }}>{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {toggle && (
            <span onClick={(e) => { e.stopPropagation(); toggle.onChange(!toggle.value) }}>
              <Toggle checked={toggle.value} />
            </span>
          )}
          {open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
        </div>
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </section>
  )
}

function Toggle({ checked }: { checked: boolean }) {
  return (
    <span
      className="inline-block w-9 h-5 rounded-full relative transition-colors"
      style={{ background: checked ? 'var(--admin-accent)' : 'var(--admin-border)' }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
        style={{ left: checked ? '18px' : '2px' }}
      />
    </span>
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
        <button
          type="button"
          onClick={() => { onCreate(); setShowCreate(false) }}
          className="px-3 rounded-xl text-xs font-bold"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          ok
        </button>
        <button
          type="button"
          onClick={() => { setShowCreate(false); setNewValue('') }}
          className="px-2 rounded-xl text-xs"
          style={{ color: 'var(--admin-text-mute)' }}
        >
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
