'use client'

import { useState } from 'react'
import VendasRowPopover, { type SaleRow, type InvoiceItemRef } from './VendasRowPopover'

type Props = {
  sales: SaleRow[]
  invoicesById: Record<string, InvoiceItemRef>
}

function formatBRL(v: number | null): string {
  if (v == null) return 'R$ 0,00'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string): string {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function describeStatus(a: SaleRow, invoicesById: Record<string, InvoiceItemRef>): {
  label: string
  tone: 'pending' | 'paid' | 'invoiced' | 'cancelled' | 'courtesy'
} {
  // Vocabulário UNIFICADO (Eduardo 09/06): serviço (vira comanda) e produto
  // (venda direta) liam diferente ("Fatura Fechada" vs "Pago"). Agora os dois
  // falam a mesma língua — Pago / A receber — e o nº da comanda vira só detalhe.
  if (a.status === 'cancelled') return { label: 'Cancelada', tone: 'cancelled' }
  if (a.payment_method === 'courtesy') return { label: 'Cortesia', tone: 'courtesy' }
  const inv = a.invoice_item_id ? invoicesById[a.invoice_item_id]?.invoice : null
  const num = inv ? ` · #${inv.invoice_number}` : ''
  if (inv?.status === 'cancelled') return { label: `Cancelada${num}`, tone: 'cancelled' }
  // Pago = comanda fechada OU pagamento direto registrado.
  if (inv?.status === 'closed' || a.paid_at) return { label: `Pago${num}`, tone: 'paid' }
  // A receber = comanda aberta (aguardando) ou sem pagamento ainda.
  return { label: `A receber${num}`, tone: 'pending' }
}

export default function VendasTable({ sales, invoicesById }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = sales.find((s) => s.id === selectedId) ?? null

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  background: 'var(--admin-surface-hi)',
                  borderBottom: '1px solid var(--admin-border)',
                }}
              >
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Data</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Cliente</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Descrição</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Profissional</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Valor</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Situação</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s, idx) => {
                const st = describeStatus(s, invoicesById)
                const toneColor = {
                  pending: 'var(--admin-text-mute)',
                  paid: '#10B981',
                  invoiced: 'var(--admin-accent)',
                  cancelled: 'var(--admin-danger,#EF4444)',
                  courtesy: '#EC4899',
                }[st.tone]
                // Detecta linhas vizinhas da MESMA comanda (faixa lateral
                // pra deixar visualmente claro que estão agrupadas).
                const myInv = s.invoice_item_id ? invoicesById[s.invoice_item_id]?.invoice?.invoice_number : null
                const prev = idx > 0 ? sales[idx - 1] : null
                const next = idx < sales.length - 1 ? sales[idx + 1] : null
                const prevInv = prev?.invoice_item_id ? invoicesById[prev.invoice_item_id]?.invoice?.invoice_number : null
                const nextInv = next?.invoice_item_id ? invoicesById[next.invoice_item_id]?.invoice?.invoice_number : null
                const groupedWithPrev = myInv !== null && myInv === prevInv
                const groupedWithNext = myInv !== null && myInv === nextInv
                const inGroup = groupedWithPrev || groupedWithNext
                return (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: idx < sales.length - 1 ? '1px solid var(--admin-divider)' : 'none',
                      borderLeft: inGroup ? `3px solid var(--admin-accent)` : '3px solid transparent',
                      background: inGroup ? 'color-mix(in srgb, var(--admin-accent) 3%, transparent)' : 'transparent',
                    }}
                  >
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                        {formatDate(s.appointment_date)}
                      </p>
                      <p className="text-[11px] tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>
                        {s.start_time.slice(0, 5)}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top" style={{ color: 'var(--admin-text)' }}>
                      {s.client_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 align-top" style={{ color: 'var(--admin-text-2)' }}>
                      <span className="inline-flex items-center gap-2">
                        {s.kind && (
                          <span
                            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
                            style={s.kind === 'product'
                              ? { color: '#9333EA', background: 'rgba(147,51,234,0.10)' }
                              : { color: 'var(--admin-accent)', background: 'var(--admin-accent-bg)' }}
                          >
                            {s.kind === 'product' ? 'Produto' : 'Serviço'}
                          </span>
                        )}
                        <span>{s.service_name ?? '—'}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top" style={{ color: 'var(--admin-text-2)' }}>
                      {s.professional?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 align-top text-right tabular-nums font-semibold" style={{ color: 'var(--admin-text)' }}>
                      {formatBRL(s.total_price)}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedId(s.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold cursor-pointer hover:underline"
                        style={{ color: toneColor }}
                      >
                        {st.label}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <VendasRowPopover
          sale={selected}
          invoiceRef={selected.invoice_item_id ? invoicesById[selected.invoice_item_id] : undefined}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  )
}
