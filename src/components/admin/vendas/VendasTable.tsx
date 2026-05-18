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
  tone: 'pending' | 'paid' | 'invoiced' | 'cancelled'
} {
  if (a.status === 'cancelled') return { label: 'Cancelada', tone: 'cancelled' }
  if (a.invoice_item_id) {
    const inv = invoicesById[a.invoice_item_id]
    if (inv?.invoice) {
      if (inv.invoice.status === 'closed') {
        return { label: `#${inv.invoice.invoice_number} · Fatura Fechada`, tone: 'invoiced' }
      }
      if (inv.invoice.status === 'open') {
        return { label: `#${inv.invoice.invoice_number} · Aberta`, tone: 'invoiced' }
      }
      if (inv.invoice.status === 'cancelled') {
        return { label: `#${inv.invoice.invoice_number} · Cancelada`, tone: 'cancelled' }
      }
    }
  }
  if (a.paid_at) return { label: 'Pago', tone: 'paid' }
  return { label: 'Sem Fatura · Pendente', tone: 'pending' }
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
                }[st.tone]
                return (
                  <tr
                    key={s.id}
                    style={{ borderBottom: idx < sales.length - 1 ? '1px solid var(--admin-divider)' : 'none' }}
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
                      {s.service_name ?? '—'}
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
