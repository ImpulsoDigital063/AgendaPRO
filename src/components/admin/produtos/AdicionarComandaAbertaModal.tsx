'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { IconClose, IconPlus } from '@/components/ui/Icon'

type Product = {
  id: string
  name: string
  variant: string | null
  price: number | null
  unit: string
  track_stock: boolean
  quantity: number
}

type OpenInvoice = {
  id: string
  invoice_number: number
  total: number
  customer_name: string | null
  items_count: number
}

type Props = {
  product: Product
  onClose: () => void
  onAdded: () => void
}

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function AdicionarComandaAbertaModal({ product, onClose, onAdded }: Props) {
  const router = useRouter()
  const [portalReady, setPortalReady] = useState(false)
  const [invoices, setInvoices] = useState<OpenInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState('1')
  const [priceStr, setPriceStr] = useState(product.price != null ? String(product.price) : '0')
  const [submittingId, setSubmittingId] = useState<string | null>(null)
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
    fetch('/api/admin/invoices?status=open&limit=50')
      .then((r) => r.json())
      .then((d) => {
        const list: OpenInvoice[] = (d.invoices ?? []).map((inv: { id: string; invoice_number: number; total: number; customer: { name: string }[] | { name: string } | null; items_count: { count: number }[] }) => {
          const c = Array.isArray(inv.customer) ? inv.customer[0] : inv.customer
          const itemsCount = Array.isArray(inv.items_count) ? inv.items_count[0]?.count ?? 0 : 0
          return {
            id: inv.id,
            invoice_number: inv.invoice_number,
            total: Number(inv.total ?? 0),
            customer_name: c?.name ?? null,
            items_count: itemsCount,
          }
        })
        setInvoices(list)
      })
      .finally(() => setLoading(false))
  }, [])

  function validate(): string | null {
    const qNum = Number(qty)
    const pNum = Number(priceStr)
    if (!(qNum > 0)) return 'Quantidade deve ser maior que 0'
    if (!(pNum >= 0)) return 'Preço inválido'
    if (product.track_stock && qNum > product.quantity) return `Estoque insuficiente · disponível ${product.quantity}`
    return null
  }

  async function addToInvoice(invoiceId: string) {
    const v = validate()
    if (v) { setError(v); return }
    setError(null)
    setSubmittingId(invoiceId)
    const r = await fetch(`/api/admin/invoices/${invoiceId}/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        product_id: product.id,
        quantity: Number(qty),
        unit_price: Number(priceStr),
      }),
    })
    setSubmittingId(null)
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      setError(d.error ?? 'Erro ao adicionar')
      return
    }
    onAdded()
    router.push(`/admin/comandas/${invoiceId}`)
  }

  if (!portalReady) return null

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
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
          maxHeight: '90vh',
        }}
      >
        <header className="flex items-start justify-between p-5 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--admin-text-faded)' }}>
              Adicionar à comanda
            </p>
            <h3 className="text-lg font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
              {product.name}{product.variant && <span style={{ color: 'var(--admin-text-mute)' }}> · {product.variant}</span>}
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
              Escolha 1 comanda aberta · o produto entra como item dela
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

        {/* Qtd + Preço */}
        <div className="px-5 py-3 grid grid-cols-2 gap-2" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>Qtd</label>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="admin-input w-full px-3 py-2 rounded-xl text-sm mt-0.5 tabular-nums"
            />
            {product.track_stock && (
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                Estoque: {product.quantity} {product.unit}
              </p>
            )}
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
            <p className="text-[10px] mt-0.5 font-bold" style={{ color: 'var(--admin-text)' }}>
              Total: {brl(Number(qty) * Number(priceStr) || 0)}
            </p>
          </div>
        </div>

        {/* Lista de comandas abertas */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {loading ? (
            <p className="text-center text-sm py-6" style={{ color: 'var(--admin-text-mute)' }}>Carregando comandas abertas...</p>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 rounded-xl" style={{ background: 'var(--admin-surface-hi)', border: '1px dashed var(--admin-border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Nenhuma comanda aberta agora</p>
              <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
                Crie uma nova venda direto em <strong>Vender agora</strong> · ou abra um atendimento + Salvar em aberto.
              </p>
            </div>
          ) : (
            invoices.map((inv) => (
              <button
                key={inv.id}
                type="button"
                disabled={submittingId !== null}
                onClick={() => addToInvoice(inv.id)}
                className="w-full text-left flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-[color-mix(in_srgb,var(--admin-accent)_8%,transparent)] disabled:opacity-50"
                style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
                    Comanda #{inv.invoice_number}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--admin-text-mute)' }}>
                    {inv.customer_name ?? 'Sem cliente'} · {inv.items_count} {inv.items_count === 1 ? 'item' : 'itens'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>{brl(inv.total)}</span>
                  <span className="w-7 h-7 rounded-full inline-flex items-center justify-center" style={{ background: 'var(--admin-accent)', color: '#fff' }}>
                    {submittingId === inv.id ? '...' : <IconPlus size={14} />}
                  </span>
                </div>
              </button>
            ))
          )}

          {error && (
            <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
