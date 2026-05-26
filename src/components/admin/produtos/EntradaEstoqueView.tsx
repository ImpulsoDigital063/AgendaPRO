'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { IconArrowLeft, IconPlus, IconClose, IconCheck, IconInbox } from '@/components/ui/Icon'
import { getAreaPrefix } from '@/lib/area-prefix'

type Product = {
  id: string
  name: string
  variant: string | null
  unit: string
  cost: number | null
  quantity: number
}

type Supplier = { id: string; name: string }

type Line = {
  uid: string
  productId: string
  quantity: string // string pra permitir vazio durante digitação
  unitCost: string
}

function newLine(): Line {
  return {
    uid: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}${Math.random()}`,
    productId: '',
    quantity: '',
    unitCost: '',
  }
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const selectStyle = {
  background: `var(--admin-input-bg) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>") no-repeat right 0.625rem center`,
  border: '1px solid var(--admin-border)',
  color: 'var(--admin-text)',
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
  MozAppearance: 'none' as const,
}

type Props = {
  businessId: string
  products: Product[]
}

export default function EntradaEstoqueView({ businessId, products }: Props) {
  void businessId
  const router = useRouter()
  const pathname = usePathname()
  const areaPrefix = getAreaPrefix(pathname)
  const produtosHref = `${areaPrefix}/produtos`
  const despesasHref = `${areaPrefix}/financeiro/despesas`
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState<string>('')
  const [newSupplier, setNewSupplier] = useState<string>('')
  const [showCreateSupplier, setShowCreateSupplier] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>(() => [newLine()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdInfo, setCreatedInfo] = useState<{ total: number; itens: number } | null>(null)

  useEffect(() => {
    fetch('/api/admin/product-suppliers').then((r) => r.json()).then((d) => setSuppliers(d.suppliers ?? []))
  }, [])

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  function updateLine(uid: string, partial: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...partial } : l)))
  }

  function pickProduct(uid: string, productId: string) {
    const p = productById.get(productId)
    updateLine(uid, {
      productId,
      // Auto-preenche custo se ainda não digitou
      unitCost: p?.cost ? String(p.cost) : '',
    })
  }

  function addLine() { setLines((prev) => [...prev, newLine()]) }
  function removeLine(uid: string) { setLines((prev) => prev.length <= 1 ? prev : prev.filter((l) => l.uid !== uid)) }

  async function criarFornecedor() {
    const n = newSupplier.trim()
    if (!n) return
    const res = await fetch('/api/admin/product-suppliers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: n }),
    })
    if (res.ok) {
      const d = await res.json()
      setSuppliers((prev) => [...prev.filter((s) => s.id !== d.supplier.id), d.supplier].sort((a, b) => a.name.localeCompare(b.name)))
      setSupplierId(d.supplier.id)
      setNewSupplier('')
      setShowCreateSupplier(false)
    }
  }

  const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0)
  const totalCost = validLines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unitCost || 0), 0)

  async function save() {
    setError(null)
    if (validLines.length === 0) { setError('Adicione pelo menos 1 produto com quantidade'); return }
    setSaving(true)
    const res = await fetch('/api/admin/stock-entries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        supplier_id: supplierId || null,
        invoice_number: invoiceNumber.trim() || null,
        entry_date: entryDate,
        notes: notes.trim() || null,
        items: validLines.map((l) => ({
          product_id: l.productId,
          quantity: Number(l.quantity),
          unit_cost: Number(l.unitCost || 0),
        })),
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erro ao salvar')
      return
    }
    const d = await res.json()
    setCreatedInfo({ total: d.total_cost, itens: d.items_count })
  }

  function novaEntrada() {
    setSupplierId('')
    setInvoiceNumber('')
    setEntryDate(new Date().toISOString().slice(0, 10))
    setNotes('')
    setLines([newLine()])
    setError(null)
    setCreatedInfo(null)
    router.refresh()
  }

  if (createdInfo) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: '#fff',
            boxShadow: '0 12px 28px -8px rgba(5,150,105,0.45)',
          }}
        >
          <IconCheck size={28} />
        </div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--admin-text)' }}>
          Entrada registrada!
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--admin-text-mute)' }}>
          {createdInfo.itens} produto{createdInfo.itens === 1 ? '' : 's'} entraram no estoque · Despesa de <span className="font-bold tabular-nums">{formatBRL(createdInfo.total)}</span> lançada automaticamente
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={novaEntrada}
            className="px-5 py-3 rounded-xl text-sm font-bold"
            style={{
              background: 'var(--admin-input-bg)',
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-text)',
            }}
          >
            Nova entrada
          </button>
          <Link
            href={produtosHref}
            className="px-5 py-3 rounded-xl text-sm font-bold"
            style={{
              background: 'linear-gradient(180deg, var(--brand-primary, #1AA9A8) 0%, color-mix(in srgb, var(--brand-primary, #1AA9A8) 70%, black) 100%)',
              color: '#fff',
              boxShadow: '0 8px 22px -8px color-mix(in srgb, var(--brand-primary, #1AA9A8) 55%, transparent)',
            }}
          >
            Ver produtos
          </Link>
          <Link
            href={despesasHref}
            className="px-5 py-3 rounded-xl text-sm font-bold"
            style={{
              background: 'transparent',
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-text-2)',
            }}
          >
            Ver despesas
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6 space-y-5">
      <header className="flex items-center gap-3">
        <Link
          href={produtosHref}
          aria-label="Voltar"
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[var(--admin-surface-hi)]"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          <IconArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
            Estoque
          </p>
          <h1 className="text-2xl font-bold tracking-tight inline-flex items-center gap-2" style={{ color: 'var(--admin-text)' }}>
            <IconInbox size={22} /> Entrada de Estoque
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
            Registre uma compra · soma no estoque + gera despesa automática
          </p>
        </div>
      </header>

      {/* Cabeçalho da entrada */}
      <section
        className="rounded-2xl p-4 space-y-3"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>Fornecedor</label>
            {showCreateSupplier ? (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  autoFocus
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  placeholder="Nome do fornecedor"
                  className="admin-input flex-1 px-3 py-2.5 rounded-xl text-sm"
                  onKeyDown={(e) => { if (e.key === 'Enter') criarFornecedor() }}
                />
                <button type="button" onClick={criarFornecedor} className="px-3 rounded-xl text-xs font-bold" style={{ background: 'var(--admin-accent)', color: '#fff' }}>ok</button>
                <button type="button" onClick={() => { setShowCreateSupplier(false); setNewSupplier('') }} className="px-2 rounded-xl text-xs" style={{ color: 'var(--admin-text-mute)' }}>×</button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="flex-1 px-3 py-2.5 pr-9 rounded-xl text-sm"
                  style={selectStyle}
                >
                  <option value="">Sem fornecedor</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button type="button" onClick={() => setShowCreateSupplier(true)} aria-label="Criar fornecedor" className="w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center" style={{ background: 'var(--admin-accent)', color: '#fff' }}>
                  <IconPlus size={14} />
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>Nº NF (opcional)</label>
            <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Ex: 12345" className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>Data da compra</label>
            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>Observação</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
          </div>
        </div>
      </section>

      {/* Linhas de produto */}
      <section className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
          Produtos recebidos
        </p>
        {lines.map((line, idx) => {
          const product = productById.get(line.productId)
          const subtotal = Number(line.quantity || 0) * Number(line.unitCost || 0)
          return (
            <div
              key={line.uid}
              className="rounded-2xl p-3 space-y-2"
              style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                  Produto {idx + 1}
                </span>
                {lines.length > 1 && (
                  <button type="button" onClick={() => removeLine(line.uid)} aria-label="Remover" className="w-6 h-6 rounded-full flex items-center justify-center" style={{ color: '#DC2626' }}>
                    <IconClose size={12} />
                  </button>
                )}
              </div>
              <select
                value={line.productId}
                onChange={(e) => pickProduct(line.uid, e.target.value)}
                className="w-full px-3 py-2.5 pr-9 rounded-xl text-sm"
                style={selectStyle}
              >
                <option value="">Selecionar produto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.variant ? ` · ${p.variant}` : ''} (atual: {p.quantity} {p.unit})
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                    Quant. recebida {product?.unit ? `(${product.unit})` : ''}
                  </label>
                  <input type="number" min={0} step={0.01} value={line.quantity} onChange={(e) => updateLine(line.uid, { quantity: e.target.value })} className="admin-input w-full px-2.5 py-2 rounded-lg text-sm tabular-nums" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>Custo unit. (R$)</label>
                  <input type="number" min={0} step={0.01} value={line.unitCost} onChange={(e) => updateLine(line.uid, { unitCost: e.target.value })} className="admin-input w-full px-2.5 py-2 rounded-lg text-sm tabular-nums" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>Subtotal</label>
                  <p className="text-sm font-bold tabular-nums px-2.5 py-2" style={{ color: 'var(--admin-text)' }}>{formatBRL(subtotal)}</p>
                </div>
              </div>
            </div>
          )
        })}
        <button
          type="button"
          onClick={addLine}
          className="w-full py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2"
          style={{
            background: 'color-mix(in srgb, var(--admin-accent) 8%, transparent)',
            border: '1px dashed color-mix(in srgb, var(--admin-accent) 50%, transparent)',
            color: 'var(--admin-accent)',
          }}
        >
          <IconPlus size={14} /> Adicionar mais um produto
        </button>
      </section>

      {/* Footer fixo · total + ações */}
      <section
        className="rounded-2xl p-4 sticky bottom-3"
        style={{
          background: 'var(--admin-surface-hi)',
          border: '1px solid var(--admin-border)',
          boxShadow: '0 10px 28px -10px rgba(0,0,0,0.10)',
        }}
      >
        {error && (
          <div className="mb-3 text-xs font-semibold flex items-start gap-2" style={{ color: '#DC2626' }} role="alert">
            <span aria-hidden style={{ fontSize: 16 }}>⚠</span>{error}
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
              Total da compra (vira despesa)
            </p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
              {formatBRL(totalCost)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={produtosHref} className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'transparent', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}>
              Cancelar
            </Link>
            <button
              type="button"
              onClick={save}
              disabled={saving || validLines.length === 0}
              className="px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
              style={{
                background: 'linear-gradient(180deg, var(--brand-primary, #1AA9A8) 0%, color-mix(in srgb, var(--brand-primary, #1AA9A8) 70%, black) 100%)',
                color: '#fff',
                borderTop: '1px solid rgba(255,255,255,0.25)',
                boxShadow: '0 8px 22px -8px color-mix(in srgb, var(--brand-primary, #1AA9A8) 55%, transparent)',
              }}
            >
              {saving ? 'Salvando...' : 'Registrar entrada'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
