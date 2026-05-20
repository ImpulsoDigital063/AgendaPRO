'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { IconClose, IconChevronDown, IconTrash, IconCheck } from '@/components/ui/Icon'

type InvoiceDetail = {
  invoice: {
    id: string
    invoice_number: number
    status: 'open' | 'closed' | 'cancelled'
    subtotal: number
    discount: number
    total: number
    notes: string | null
    created_at: string
    closed_at: string | null
    cancelled_at: string | null
    customer: { id: string; name: string; phone: string | null } | null
  }
  items: Array<{
    id: string
    item_type: string
    description: string
    quantity: number
    unit_price: number
    discount: number
    total: number
    professional: { name: string } | null
  }>
  payments: Array<{
    id: string
    payment_method: string
    amount: number
    paid_at: string
    installments: number
    card_brand: string | null
    card_type: string | null
  }>
}

type Props = {
  invoiceId: string
  onClose: () => void
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDateLong(d: string): string {
  const date = new Date(d)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

const STATUS_LABEL = {
  open: 'Aberta',
  closed: 'Fechada',
  cancelled: 'Cancelada',
}

const STATUS_COLOR = {
  open: '#F59E0B',
  closed: '#10B981',
  cancelled: '#EF4444',
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  credit: 'Crédito',
  debit: 'Débito',
  transfer: 'Transferência',
}

export default function ComandaModal({ invoiceId, onClose }: Props) {
  const router = useRouter()
  const [data, setData] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMenuOpen, setActionMenuOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editingItems, setEditingItems] = useState<Record<string, { unit_price: string; discount: string }>>({})

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function loadInvoice() {
    setLoading(true)
    const res = await fetch(`/api/admin/invoices/${invoiceId}`)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'erro')
      setLoading(false)
      return
    }
    const j = (await res.json()) as InvoiceDetail
    setData(j)
    // Reset editing state quando recarrega
    const map: Record<string, { unit_price: string; discount: string }> = {}
    for (const it of j.items) {
      map[it.id] = {
        unit_price: String(it.unit_price),
        discount: String(it.discount),
      }
    }
    setEditingItems(map)
    setLoading(false)
  }

  useEffect(() => {
    loadInvoice()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId])

  async function saveItemEdits() {
    if (!data) return
    setSubmitting(true)
    setError(null)
    try {
      const promises = data.items.map((it) => {
        const ed = editingItems[it.id]
        if (!ed) return null
        const newUnitPrice = parseFloat(ed.unit_price.replace(',', '.')) || 0
        const newDiscount = parseFloat(ed.discount.replace(',', '.')) || 0
        if (newUnitPrice === Number(it.unit_price) && newDiscount === Number(it.discount)) return null
        return fetch(`/api/admin/invoices/${invoiceId}/items/${it.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unit_price: newUnitPrice, discount: newDiscount }),
        })
      })
      const results = await Promise.all(promises.filter(Boolean))
      const failed = results.find((r) => r && !r.ok)
      if (failed) {
        const j = await failed.json().catch(() => ({}))
        setError(j.error ?? 'falha_ao_salvar')
        setSubmitting(false)
        return
      }
      await loadInvoice()
      setEditMode(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'erro')
    } finally {
      setSubmitting(false)
    }
  }

  async function removeItem(itemId: string) {
    if (!confirm('Remover esse item da comanda? O atendimento volta a ficar Sem Fatura.')) return
    setSubmitting(true)
    setError(null)
    const res = await fetch(`/api/admin/invoices/${invoiceId}/items/${itemId}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'falha_ao_remover')
      setSubmitting(false)
      return
    }
    await loadInvoice()
    router.refresh()
    setSubmitting(false)
  }

  async function changeStatus(action: 'reopen' | 'cancel') {
    if (!data) return
    if (action === 'cancel' && !confirm('Cancelar essa comanda? Os itens permanecem vinculados mas a comanda fica marcada como cancelada.')) return
    setSubmitting(true)
    setActionMenuOpen(false)
    const res = await fetch(`/api/admin/invoices/${invoiceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'erro_mudar_status')
      setSubmitting(false)
      return
    }
    // Recarrega + refresh
    const r = await fetch(`/api/admin/invoices/${invoiceId}`)
    const newData = await r.json()
    setData(newData)
    setSubmitting(false)
    router.refresh()
  }

  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])
  if (!portalReady) return null

  return createPortal(
    <div className="fixed inset-0 z-[150]" role="dialog" aria-modal="true">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />

      <div
        className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="rounded-2xl flex flex-col pointer-events-auto"
          style={{
            background: 'var(--admin-popover-bg, #FFFFFF)',
            border: '1px solid var(--admin-border)',
            width: 'min(640px, 100%)',
            maxHeight: '90vh',
            boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--admin-divider)' }}
          >
            <h2 className="text-lg font-bold flex-1" style={{ color: 'var(--admin-text)' }}>
              {loading ? 'Comanda…' : editMode ? `Editar Comanda #${data?.invoice.invoice_number}` : `Comanda #${data?.invoice.invoice_number ?? '—'}`}
            </h2>
            {editMode && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(false)
                    loadInvoice()
                  }}
                  disabled={submitting}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'var(--admin-text-mute)' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveItemEdits}
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                  style={{ background: 'var(--admin-accent)', color: '#fff' }}
                >
                  {submitting ? 'Salvando…' : 'Salvar'}
                </button>
              </>
            )}
            {!editMode && (
              <button
                type="button"
                aria-label="Imprimir"
                disabled
                className="p-2 rounded-lg disabled:opacity-30"
                style={{ color: 'var(--admin-text-mute)' }}
                title="Imprimir (em breve)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="p-2 rounded-lg"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              <IconClose size={16} />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {loading ? (
              <p className="text-center text-sm py-10" style={{ color: 'var(--admin-text-mute)' }}>
                Carregando…
              </p>
            ) : error ? (
              <p className="text-center text-sm py-10" style={{ color: 'var(--admin-danger,#EF4444)' }}>
                Erro: {error}
              </p>
            ) : data ? (
              <div className="space-y-5">
                {/* Cliente + status */}
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold" style={{ color: 'var(--admin-text)' }}>
                      {data.invoice.customer?.name ?? 'Cliente'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                      Criada em {formatDateLong(data.invoice.created_at)}
                      {data.invoice.closed_at && ` · Fechada em ${formatDateLong(data.invoice.closed_at)}`}
                      {data.invoice.cancelled_at && ` · Cancelada em ${formatDateLong(data.invoice.cancelled_at)}`}
                    </p>
                  </div>

                  {/* Status dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActionMenuOpen((o) => !o)}
                      disabled={submitting || data.invoice.status === 'cancelled'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-60"
                      style={{
                        background: `color-mix(in srgb, ${STATUS_COLOR[data.invoice.status]} 14%, transparent)`,
                        color: STATUS_COLOR[data.invoice.status],
                      }}
                    >
                      {STATUS_LABEL[data.invoice.status]}
                      {data.invoice.status !== 'cancelled' && <IconChevronDown size={14} />}
                    </button>
                    {actionMenuOpen && (
                      <div
                        className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden z-10"
                        style={{
                          background: 'var(--admin-surface-hi)',
                          border: '1px solid var(--admin-border)',
                          minWidth: 160,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        }}
                      >
                        {data.invoice.status === 'closed' && (
                          <button
                            type="button"
                            onClick={() => changeStatus('reopen')}
                            className="w-full text-left px-3 py-2 text-xs font-semibold hover:opacity-80"
                            style={{ color: 'var(--admin-text)' }}
                          >
                            Reabrir Comanda
                          </button>
                        )}
                        {data.invoice.status === 'open' && (
                          <button
                            type="button"
                            onClick={() => changeStatus('reopen')}
                            disabled
                            className="w-full text-left px-3 py-2 text-xs font-semibold opacity-40"
                            style={{ color: 'var(--admin-text)' }}
                            title="Já aberta"
                          >
                            Já aberta
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => changeStatus('cancel')}
                          className="w-full text-left px-3 py-2 text-xs font-semibold hover:opacity-80"
                          style={{ color: 'var(--admin-danger,#EF4444)' }}
                        >
                          Cancelar Comanda
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resumo */}
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: 'var(--admin-surface-hi)',
                    border: '1px solid var(--admin-divider)',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                      Resumo
                    </h3>
                    {!editMode && data.invoice.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => setEditMode(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition hover:opacity-90"
                        style={{
                          background: 'color-mix(in srgb, var(--admin-accent) 14%, transparent)',
                          color: 'var(--admin-accent)',
                          border: '1px solid color-mix(in srgb, var(--admin-accent) 30%, transparent)',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                        </svg>
                        Gerenciar Itens
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span style={{ color: 'var(--admin-text-mute)' }}>Quantidade</span>
                      <span className="font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                        {data.items.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ color: 'var(--admin-text-mute)' }}>Subtotal</span>
                      <span className="font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                        {formatBRL(data.invoice.subtotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ color: 'var(--admin-text-mute)' }}>Descontos</span>
                      <span className="font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                        {formatBRL(data.invoice.discount)}
                      </span>
                    </div>
                    <div
                      className="flex items-center justify-between pt-2 mt-1"
                      style={{ borderTop: '1px solid var(--admin-divider)' }}
                    >
                      <span className="font-bold text-base" style={{ color: 'var(--admin-text)' }}>
                        Valor Total
                      </span>
                      <span className="font-bold text-lg tabular-nums" style={{ color: 'var(--admin-accent)' }}>
                        {formatBRL(data.invoice.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Itens */}
                {data.items.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-faded)' }}>
                      Itens ({data.items.length})
                    </h3>
                    <div
                      className="rounded-xl overflow-hidden"
                      style={{
                        background: 'var(--admin-surface-hi)',
                        border: '1px solid var(--admin-divider)',
                      }}
                    >
                      {data.items.map((it, idx) => {
                        const ed = editingItems[it.id]
                        return (
                          <div
                            key={it.id}
                            className="px-4 py-3"
                            style={{
                              borderBottom: idx < data.items.length - 1 ? '1px solid var(--admin-divider)' : 'none',
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                                  {it.description}
                                </p>
                                {it.professional?.name && (
                                  <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                                    {it.professional.name}
                                  </p>
                                )}
                              </div>
                              {!editMode && (
                                <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                                  {formatBRL(it.total)}
                                </p>
                              )}
                              {editMode && (
                                <button
                                  type="button"
                                  onClick={() => removeItem(it.id)}
                                  disabled={submitting}
                                  aria-label="Remover item"
                                  className="p-1.5 rounded-lg disabled:opacity-30"
                                  style={{ color: 'var(--admin-danger,#EF4444)' }}
                                >
                                  <IconTrash size={14} />
                                </button>
                              )}
                            </div>

                            {editMode && (
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                                    Valor unitário (R$)
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={ed?.unit_price ?? ''}
                                    onChange={(e) =>
                                      setEditingItems((p) => ({ ...p, [it.id]: { ...(p[it.id] ?? { unit_price: '', discount: '' }), unit_price: e.target.value } }))
                                    }
                                    disabled={submitting}
                                    className="admin-input w-full px-2 py-1.5 text-sm tabular-nums"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                                    Desconto (R$)
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={ed?.discount ?? ''}
                                    onChange={(e) =>
                                      setEditingItems((p) => ({ ...p, [it.id]: { ...(p[it.id] ?? { unit_price: '', discount: '' }), discount: e.target.value } }))
                                    }
                                    disabled={submitting}
                                    className="admin-input w-full px-2 py-1.5 text-sm tabular-nums"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Pagamentos */}
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-faded)' }}>
                    Pagamentos
                  </h3>
                  {data.payments.length === 0 ? (
                    <div
                      className="rounded-xl p-4 text-center"
                      style={{
                        background: 'var(--admin-surface-hi)',
                        border: '1px dashed var(--admin-divider)',
                      }}
                    >
                      <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                        Nenhum pagamento registrado nesta comanda
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                        Registro de pagamentos múltiplos vem na próxima etapa
                      </p>
                    </div>
                  ) : (
                    <div
                      className="rounded-xl overflow-hidden"
                      style={{
                        background: 'var(--admin-surface-hi)',
                        border: '1px solid var(--admin-divider)',
                      }}
                    >
                      {data.payments.map((p, idx) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 px-4 py-3"
                          style={{
                            borderBottom: idx < data.payments.length - 1 ? '1px solid var(--admin-divider)' : 'none',
                          }}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                              {PAYMENT_METHOD_LABEL[p.payment_method] ?? p.payment_method}
                              {p.installments > 1 && ` · ${p.installments}x`}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                              Pago em {new Date(p.paid_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                            {formatBRL(p.amount)}
                          </p>
                        </div>
                      ))}
                      <div
                        className="flex items-center justify-between px-4 py-3"
                        style={{ background: 'var(--admin-surface)', borderTop: '1px solid var(--admin-divider)' }}
                      >
                        <span className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
                          Total Pago
                        </span>
                        <span className="text-sm font-bold tabular-nums" style={{ color: '#10B981' }}>
                          {formatBRL(data.payments.reduce((s, p) => s + p.amount, 0))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
