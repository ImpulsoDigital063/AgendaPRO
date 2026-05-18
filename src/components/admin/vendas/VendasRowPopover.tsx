'use client'

import { useEffect } from 'react'
import { IconClose, IconWhatsapp, IconPencil, IconTrash, IconUser, IconExternalLink } from '@/components/ui/Icon'

export type SaleRow = {
  id: string
  appointment_date: string
  start_time: string
  end_time?: string | null
  client_name: string | null
  client_phone?: string | null
  service_name: string | null
  total_price: number | null
  status: string
  paid_at: string | null
  payment_method: string | null
  invoice_item_id: string | null
  professional: { name: string } | null
}

export type InvoiceItemRef = {
  id: string
  invoice: { invoice_number: number; status: string } | null
}

type Props = {
  sale: SaleRow
  invoiceRef?: InvoiceItemRef
  onClose: () => void
}

function formatDateLong(d: string): string {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

function formatBRL(v: number | null): string {
  if (v == null) return 'R$ 0,00'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending', label: 'Horário Marcado' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'completed', label: 'Concluído' },
  { value: 'no_show', label: 'Faltou' },
  { value: 'cancelled', label: 'Cancelado' },
]

function statusLabel(value: string): string {
  return STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export default function VendasRowPopover({ sale, invoiceRef, onClose }: Props) {
  // Esc fecha
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const isInvoiced = !!sale.invoice_item_id && invoiceRef?.invoice
  const isPaid = !!sale.paid_at
  const isPending = !isInvoiced && !isPaid && sale.status !== 'cancelled'

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      {/* Overlay clicável */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />

      {/* Drawer à direita */}
      <div
        className="absolute top-0 right-0 bottom-0 flex flex-col"
        style={{
          width: 'min(420px, 100vw)',
          background: 'var(--admin-surface)',
          borderLeft: '1px solid var(--admin-border)',
          boxShadow: '-8px 0 24px rgba(0,0,0,0.25)',
        }}
      >
        {/* Top: ações + close */}
        <div
          className="flex items-center gap-1 px-3 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--admin-divider)' }}
        >
          <button
            type="button"
            aria-label="Enviar lembrete"
            title="Enviar lembrete"
            disabled
            className="p-2 rounded-lg disabled:opacity-30"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            <IconWhatsapp size={16} />
          </button>
          <button
            type="button"
            aria-label="Editar"
            title="Editar atendimento"
            disabled
            className="p-2 rounded-lg disabled:opacity-30"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            <IconPencil size={16} />
          </button>
          <button
            type="button"
            aria-label="Excluir"
            title="Excluir"
            disabled
            className="p-2 rounded-lg disabled:opacity-30"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            <IconTrash size={16} />
          </button>
          <button
            type="button"
            aria-label="Ver cliente"
            title="Ver cliente"
            disabled
            className="p-2 rounded-lg disabled:opacity-30"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            <IconUser size={16} />
          </button>
          <div className="flex-1" />
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

        {/* Conteúdo principal */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {/* Serviço (título) */}
          <h2 className="text-lg font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
            {sale.service_name ?? 'Atendimento'}
          </h2>

          {/* Cliente */}
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            {sale.client_name ?? '—'}
          </p>

          {/* Data + hora */}
          <p className="text-sm capitalize" style={{ color: 'var(--admin-text-mute)' }}>
            {formatDateLong(sale.appointment_date)}
            {' · '}
            <span className="tabular-nums">{sale.start_time.slice(0, 5)}</span>
            {sale.end_time && (
              <>
                {' até '}
                <span className="tabular-nums">{sale.end_time.slice(0, 5)}</span>
              </>
            )}
          </p>

          {/* Profissional */}
          {sale.professional?.name && (
            <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>
              {sale.professional.name}
            </p>
          )}

          {/* Valor */}
          <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
            {formatBRL(sale.total_price)}
          </p>

          {/* Divisor */}
          <div style={{ borderTop: '1px solid var(--admin-divider)' }} />

          {/* Status do atendimento */}
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
              style={{ color: 'var(--admin-text-faded)' }}
            >
              Status do atendimento
            </p>
            <select
              defaultValue={sale.status}
              disabled
              className="admin-input w-full py-2 px-3 text-sm disabled:opacity-60"
              title="Mudança de status vem na próxima etapa"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  ✓ {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Linha Comanda */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
            style={{
              background: isInvoiced
                ? 'color-mix(in srgb, var(--admin-accent) 12%, transparent)'
                : isPaid
                  ? 'color-mix(in srgb, #10B981 12%, transparent)'
                  : 'var(--admin-surface-hi)',
            }}
          >
            <span
              className="text-xs font-semibold flex-1"
              style={{
                color: isInvoiced
                  ? 'var(--admin-accent)'
                  : isPaid
                    ? '#10B981'
                    : 'var(--admin-text-mute)',
              }}
            >
              {isInvoiced
                ? `✓ Comanda Fechada: #${invoiceRef!.invoice!.invoice_number}`
                : isPaid
                  ? '✓ Pago direto'
                  : '○ Sem Comanda'}
            </span>
            {isInvoiced && (
              <button
                type="button"
                aria-label="Ver comanda"
                disabled
                className="p-1 rounded disabled:opacity-30"
                style={{ color: 'var(--admin-accent)' }}
              >
                <IconExternalLink size={14} />
              </button>
            )}
          </div>

          {/* Botão FATURAR · só pra Sem Fatura */}
          {isPending && (
            <button
              type="button"
              disabled
              className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-60"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
              title="Fluxo de Faturar vem na próxima etapa (1.6)"
            >
              FATURAR
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
