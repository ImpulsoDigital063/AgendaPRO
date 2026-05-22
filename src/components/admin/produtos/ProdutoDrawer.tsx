'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose, IconPencil, IconClock, IconTrash, IconAlert, IconPlus } from '@/components/ui/Icon'
import AjustarEstoqueModal from './AjustarEstoqueModal'

type Product = {
  id: string
  name: string
  description: string | null
  unit: string
  price: number | null
  cost: number | null
  quantity: number
  min_quantity: number
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

export default function ProdutoDrawer({ product, onClose, onChanged }: Props) {
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

      {/* Detalhes */}
      <div className="grid grid-cols-2 gap-3">
        <InfoCard label="Preço de venda" value={formatBRL(product.price)} />
        <InfoCard label="Custo unitário" value={formatBRL(product.cost)} />
        <InfoCard label="Unidade" value={product.unit} />
        <InfoCard label="Valor estoque" value={formatBRL(valor)} />
      </div>

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
 * TAB · Editar metadados
 * ============================================================ */
function EditarTab({
  product, onSaved, onDelete,
}: {
  product: Product
  onSaved: () => void
  onDelete: () => void
}) {
  const [name, setName] = useState(product.name)
  const [description, setDescription] = useState(product.description ?? '')
  const [unit, setUnit] = useState(product.unit)
  const [price, setPrice] = useState<string>(product.price?.toString() ?? '')
  const [cost, setCost] = useState<string>(product.cost?.toString() ?? '')
  const [minQuantity, setMinQuantity] = useState<string>(product.min_quantity.toString())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        price: price ? Number(price) : null,
        cost: cost ? Number(cost) : null,
        min_quantity: minQuantity ? Number(minQuantity) : 0,
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
      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>Nome</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="admin-input w-full px-3 py-2.5 rounded-xl text-sm"
        />
      </div>
      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>Descrição</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="admin-input w-full px-3 py-2.5 rounded-xl text-sm resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>Unidade</label>
          <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} className="admin-input w-full px-3 py-2.5 rounded-xl text-sm" />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>Mínimo alerta</label>
          <input type="number" min={0} step={0.01} value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>Preço venda (R$)</label>
          <input type="number" min={0} step={0.01} value={price} onChange={(e) => setPrice(e.target.value)} className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums" />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>Custo (R$)</label>
          <input type="number" min={0} step={0.01} value={cost} onChange={(e) => setCost(e.target.value)} className="admin-input w-full px-3 py-2.5 rounded-xl text-sm tabular-nums" />
        </div>
      </div>

      {error && (
        <div className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}>
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-2">
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
