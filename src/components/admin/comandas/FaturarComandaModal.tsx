'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { IconClose, IconPlus, IconTrash, IconSearch } from '@/components/ui/Icon'
import PaymentMethodModal, { type PaymentMethodChoice, type CardPaymentDetails } from '@/components/admin/PaymentMethodModal'

/**
 * FaturarComandaModal · cria uma comanda incluindo:
 *  - 1 atendimento (já existente · pré-pintado)
 *  - 0..N produtos avulsos (vendidos junto na mesma visita)
 *  - 1 pagamento (cash/pix/card/courtesy/points) OU deixa em aberto
 *
 * No POST /api/admin/invoices a API:
 *  - cria invoice + invoice_items
 *  - cria 1 sales+sale_items por produto (trigger v66 baixa estoque)
 *  - marca o appointment como completed+paid
 *  - cria invoice_payments se pagou
 */

type ProductLite = {
  id: string
  name: string
  variant: string | null
  unit: string
  quantity: number
  price: number | null
  track_stock: boolean
  sale_active: boolean
}

type CartLine = {
  product_id: string
  product_name: string
  unit: string
  quantity: number
  unit_price: number
  professional_id: string | null
  /** snapshot dos limites pra validação inline */
  available: number | null
  track_stock: boolean
}

type Props = {
  open: boolean
  appointmentId: string
  appointmentServiceName: string
  appointmentTotal: number
  appointmentProfessionalId: string | null
  customerName: string
  businessId: string
  onClose: () => void
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

export default function FaturarComandaModal({
  open, appointmentId, appointmentServiceName, appointmentTotal, appointmentProfessionalId,
  customerName, businessId, onClose,
}: Props) {
  const router = useRouter()
  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])

  const [products, setProducts] = useState<ProductLite[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [cart, setCart] = useState<CartLine[]>([])
  const [search, setSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    setLoadingProducts(true)
    fetch('/api/admin/products')
      .then((r) => r.json())
      .then((d) => {
        const list: ProductLite[] = (d.products ?? [])
          .filter((p: ProductLite) => p.sale_active !== false)
          .map((p: ProductLite) => ({
            id: p.id, name: p.name, variant: p.variant ?? null, unit: p.unit ?? 'un',
            quantity: Number(p.quantity ?? 0), price: p.price == null ? null : Number(p.price),
            track_stock: p.track_stock !== false, sale_active: p.sale_active !== false,
          }))
        setProducts(list)
      })
      .finally(() => setLoadingProducts(false))
  }, [open])

  const subtotalProds = useMemo(() => cart.reduce((s, l) => s + l.quantity * l.unit_price, 0), [cart])
  const total = appointmentTotal + subtotalProds

  const disponiveis = useMemo(() => {
    const usedIds = new Set(cart.map((l) => l.product_id))
    const free = products.filter((p) => !usedIds.has(p.id))
    const q = search.trim().toLowerCase()
    if (!q) return free.slice(0, 30)
    return free.filter((p) => p.name.toLowerCase().includes(q) || (p.variant ?? '').toLowerCase().includes(q)).slice(0, 30)
  }, [products, cart, search])

  function addProduct(p: ProductLite) {
    setCart((prev) => [...prev, {
      product_id: p.id,
      product_name: p.variant ? `${p.name} · ${p.variant}` : p.name,
      unit: p.unit,
      quantity: 1,
      unit_price: p.price ?? 0,
      professional_id: appointmentProfessionalId,
      available: p.track_stock ? p.quantity : null,
      track_stock: p.track_stock,
    }])
    setSearch('')
    setPickerOpen(false)
  }

  function updateLine(idx: number, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l, i) => i === idx ? { ...l, ...patch } : l))
  }
  function removeLine(idx: number) {
    setCart((prev) => prev.filter((_, i) => i !== idx))
  }

  function validateBeforeSubmit(): string | null {
    for (const l of cart) {
      if (!Number.isFinite(l.quantity) || l.quantity <= 0) return `Quantidade inválida em ${l.product_name}`
      if (!Number.isFinite(l.unit_price) || l.unit_price < 0) return `Preço inválido em ${l.product_name}`
      if (l.track_stock && l.available !== null && l.quantity > l.available) {
        return `${l.product_name}: pediu ${l.quantity} mas só tem ${l.available} em estoque`
      }
    }
    return null
  }

  async function submitInvoice(payment: PaymentMethodChoice | 'leave_open', cardDetails?: CardPaymentDetails) {
    const v = validateBeforeSubmit()
    if (v) { setError(v); return }
    setError(null)
    setSubmitting(true)

    const body: Record<string, unknown> = {
      appointmentIds: [appointmentId],
      productSales: cart.map((l) => ({
        product_id: l.product_id,
        product_name: l.product_name,
        quantity: l.quantity,
        unit_price: l.unit_price,
        professional_id: l.professional_id,
      })),
    }
    if (payment !== 'leave_open' && payment !== null) {
      const pay: Record<string, unknown> = { method: payment }
      if (payment === 'card' && cardDetails) {
        pay.device_id = cardDetails.device_id
        pay.card_brand = cardDetails.card_brand
        pay.card_type = cardDetails.card_type
        pay.fee_percent = cardDetails.fee_percent
        pay.installments = cardDetails.installments
      }
      body.payment = pay
    }

    const r = await fetch('/api/admin/invoices', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSubmitting(false)
    setPaymentOpen(false)
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      setError(d.error ?? 'Erro ao faturar comanda')
      return
    }
    const d = await r.json()
    const invoiceId = d?.invoice?.id
    onClose()
    if (invoiceId) router.push(`/admin/comandas/${invoiceId}`)
    else router.refresh()
  }

  function openPagamento() {
    const v = validateBeforeSubmit()
    if (v) { setError(v); return }
    setError(null)
    setPaymentOpen(true)
  }

  if (!portalReady || !open) return null

  return createPortal(
    <>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
          style={{
            background: 'var(--admin-popover-bg, #FFFFFF)',
            border: '1px solid var(--admin-popover-border, #E2E8F0)',
            boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
            maxHeight: '92vh',
          }}
        >
          {/* Header */}
          <header className="flex items-start justify-between p-5 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--admin-text-faded)' }}>
                Faturar
              </p>
              <h3 className="text-lg font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
                Comanda · {customerName}
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
                Adicione produtos vendidos junto antes de finalizar
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

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Linha do atendimento · fixa */}
            <div className="rounded-xl p-3" style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                    Serviço
                  </p>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{appointmentServiceName}</p>
                </div>
                <p className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: 'var(--admin-text)' }}>
                  {brl(appointmentTotal)}
                </p>
              </div>
            </div>

            {/* Produtos no carrinho */}
            {cart.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                  Produtos vendidos
                </p>
                {cart.map((line, idx) => (
                  <div
                    key={`${line.product_id}-${idx}`}
                    className="rounded-xl p-3 grid grid-cols-[1fr_70px_100px_32px] gap-2 items-center"
                    style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{line.product_name}</p>
                      {line.track_stock && line.available !== null && (
                        <p className="text-[11px]" style={{ color: line.quantity > line.available ? '#DC2626' : 'var(--admin-text-mute)' }}>
                          Estoque: {line.available} {line.unit}{line.quantity > line.available ? ' · insuficiente' : ''}
                        </p>
                      )}
                    </div>
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })}
                      className="admin-input px-2 py-1.5 rounded-lg text-sm text-center tabular-nums"
                      aria-label={`Quantidade ${line.product_name}`}
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.unit_price}
                      onChange={(e) => updateLine(idx, { unit_price: Number(e.target.value) })}
                      className="admin-input px-2 py-1.5 rounded-lg text-sm text-right tabular-nums"
                      aria-label={`Preço unitário ${line.product_name}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="w-7 h-7 rounded-full flex items-center justify-center mx-auto"
                      style={{ color: '#DC2626' }}
                      aria-label={`Remover ${line.product_name}`}
                    >
                      <IconTrash size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Picker de produto */}
            <div
              className="rounded-2xl p-3 space-y-2"
              style={{ background: 'color-mix(in srgb, var(--admin-accent) 6%, transparent)', border: '1px dashed color-mix(in srgb, var(--admin-accent) 40%, transparent)' }}
            >
              {!pickerOpen ? (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2"
                  style={{ background: 'var(--admin-accent)', color: '#fff' }}
                >
                  <IconPlus size={14} /> Adicionar produto
                </button>
              ) : (
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
                  {loadingProducts ? (
                    <p className="text-xs text-center py-3" style={{ color: 'var(--admin-text-mute)' }}>Carregando produtos...</p>
                  ) : disponiveis.length === 0 ? (
                    <p className="text-xs text-center py-3" style={{ color: 'var(--admin-text-mute)' }}>
                      {search ? 'Nenhum produto bate com a busca' : 'Cadastre produtos em Produtos pra usar aqui'}
                    </p>
                  ) : (
                    <ul className="space-y-1 max-h-56 overflow-y-auto">
                      {disponiveis.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => addProduct(p)}
                            className="w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-3 hover:bg-[color-mix(in_srgb,var(--admin-accent)_10%,transparent)]"
                            style={{ background: 'var(--admin-surface)' }}
                          >
                            <span className="min-w-0">
                              <span className="text-sm font-semibold block truncate" style={{ color: 'var(--admin-text)' }}>
                                {p.name}{p.variant ? <span style={{ color: 'var(--admin-text-mute)' }}> · {p.variant}</span> : null}
                              </span>
                              <span className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
                                {p.track_stock ? `${p.quantity} ${p.unit} em estoque` : 'Sem controle de estoque'}
                              </span>
                            </span>
                            <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: 'var(--admin-text)' }}>
                              {p.price != null ? brl(p.price) : '—'}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => setPickerOpen(false)}
                    className="text-xs underline"
                    style={{ color: 'var(--admin-text-mute)' }}
                  >
                    fechar busca
                  </button>
                </>
              )}
            </div>

            {error && (
              <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}>
                {error}
              </div>
            )}
          </div>

          {/* Footer · totais + ações */}
          <footer className="flex-shrink-0 border-t px-5 py-4 space-y-3" style={{ borderColor: 'var(--admin-divider)', background: 'var(--admin-surface)' }}>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>Total</p>
                <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>{brl(total)}</p>
              </div>
              {cart.length > 0 && (
                <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                  Serviço {brl(appointmentTotal)} + Produtos {brl(subtotalProds)}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => submitInvoice('leave_open')}
                className="py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: 'var(--admin-surface)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)' }}
              >
                {submitting ? 'Salvando...' : 'Salvar em aberto'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={openPagamento}
                className="py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{
                  background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
                  color: '#fff',
                  borderTop: '1px solid rgba(255,255,255,0.25)',
                  boxShadow: '0 10px 24px -8px rgba(5,150,105,0.50)',
                }}
              >
                Receber pagamento
              </button>
            </div>
          </footer>
        </div>
      </div>

      <PaymentMethodModal
        open={paymentOpen}
        clientName={customerName}
        totalPrice={total}
        businessId={businessId}
        loading={submitting}
        onChoose={(method, card) => {
          if (method === null) { setPaymentOpen(false); return }
          submitInvoice(method, card)
        }}
        onClose={() => setPaymentOpen(false)}
      />
    </>,
    document.body,
  )
}
