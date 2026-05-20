'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IconClose, IconArrowLeft, IconCheck } from '@/components/ui/Icon'

type PendingItem = {
  id: string
  appointment_date: string
  start_time: string
  service_name: string | null
  total_price: number | null
  professional_name: string | null
}

type Props = {
  businessId: string
  customerName: string
  customerId: string | null
  triggerAppointmentId: string
  onClose: () => void
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string): string {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function FaturarModal({ businessId, customerName, customerId, triggerAppointmentId, onClose }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<PendingItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Esc fecha
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Carrega itens pendentes do mesmo cliente
  useEffect(() => {
    const sb = createClient()
    async function load() {
      setLoading(true)
      // Busca pelo nome (já que client_id pode ser null)
      let query = sb
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          service_name,
          total_price,
          professional:professionals(name)
        `)
        .eq('business_id', businessId)
        .is('invoice_item_id', null)
        .is('paid_at', null)
        .neq('status', 'cancelled')

      if (customerId) {
        query = query.eq('customer_id', customerId)
      } else {
        query = query.eq('client_name', customerName)
      }

      const { data, error: err } = await query
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(50)

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      const normalized: PendingItem[] = (data ?? []).map((a) => {
        const row = a as unknown as {
          id: string
          appointment_date: string
          start_time: string
          service_name: string | null
          total_price: number | null
          professional: { name: string } | { name: string }[] | null
        }
        const prof = row.professional
        const profName = Array.isArray(prof) ? prof[0]?.name ?? null : prof?.name ?? null
        return {
          id: row.id,
          appointment_date: row.appointment_date,
          start_time: row.start_time,
          service_name: row.service_name,
          total_price: row.total_price,
          professional_name: profName,
        }
      })

      setItems(normalized)
      // Pré-marca o atendimento que disparou + outros pendentes
      const ids = new Set(normalized.map((i) => i.id))
      ids.add(triggerAppointmentId)
      setSelectedIds(ids)
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedItems = items.filter((i) => selectedIds.has(i.id))
  const subtotal = selectedItems.reduce((s, i) => s + (i.total_price ?? 0), 0)

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function confirmar() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          appointmentIds: Array.from(selectedIds),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'falha_ao_faturar')
        setSubmitting(false)
        return
      }
      // Sucesso · fecha + refresh
      onClose()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'erro_desconhecido')
      setSubmitting(false)
    }
  }

  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])
  if (!portalReady) return null

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} />

      <div
        className="absolute inset-x-0 top-0 bottom-0 flex flex-col mx-auto"
        style={{
          maxWidth: 720,
          background: 'var(--admin-bg)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
          style={{
            background: 'var(--admin-surface)',
            borderBottom: '1px solid var(--admin-border)',
          }}
        >
          <button
            type="button"
            onClick={step === 2 ? () => setStep(1) : onClose}
            aria-label="Voltar"
            className="p-2 rounded-lg"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            <IconArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h2 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
              {step === 1 ? 'Comanda' : 'Confirmar Faturamento'}
            </h2>
            <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
              {customerName}
            </p>
          </div>
          {step === 1 && (
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={selectedIds.size === 0}
              className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-40"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              Continuar
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
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="text-center text-sm py-10" style={{ color: 'var(--admin-text-mute)' }}>
              Carregando itens pendentes…
            </p>
          ) : items.length === 0 ? (
            <p className="text-center text-sm py-10" style={{ color: 'var(--admin-text-mute)' }}>
              Nenhum item pendente pra faturar.
            </p>
          ) : step === 1 ? (
            <div>
              <p className="text-sm mb-3" style={{ color: 'var(--admin-text-2)' }}>
                Selecione os itens para gerar a fatura:
              </p>
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'var(--admin-surface)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                {items.map((it, idx) => {
                  const checked = selectedIds.has(it.id)
                  return (
                    <label
                      key={it.id}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                      style={{
                        borderBottom: idx < items.length - 1 ? '1px solid var(--admin-divider)' : 'none',
                        background: checked ? 'color-mix(in srgb, var(--admin-accent) 6%, transparent)' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(it.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                          {it.service_name ?? 'Atendimento'}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                          {formatDate(it.appointment_date)} · {it.start_time.slice(0, 5)}
                          {it.professional_name && ` · ${it.professional_name}`}
                        </p>
                      </div>
                      <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                        {formatBRL(it.total_price ?? 0)}
                      </p>
                    </label>
                  )
                })}
              </div>

              {/* Sumário */}
              <div
                className="mt-4 rounded-2xl p-4"
                style={{
                  background: 'var(--admin-surface)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                <div className="flex items-center justify-between text-sm mb-2">
                  <span style={{ color: 'var(--admin-text-mute)' }}>Itens selecionados</span>
                  <span className="font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    {selectedIds.size}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span style={{ color: 'var(--admin-text-mute)' }}>Subtotal</span>
                  <span className="font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    {formatBRL(subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span style={{ color: 'var(--admin-text-mute)' }}>Descontos</span>
                  <span className="font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    R$ 0,00
                  </span>
                </div>
                <div
                  className="flex items-center justify-between text-lg pt-2 mt-2"
                  style={{ borderTop: '1px solid var(--admin-divider)' }}
                >
                  <span className="font-bold" style={{ color: 'var(--admin-text)' }}>Total</span>
                  <span className="font-bold tabular-nums" style={{ color: 'var(--admin-accent)' }}>
                    {formatBRL(subtotal)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            // Step 2 · Confirmação
            <div className="max-w-md mx-auto mt-10">
              <div
                className="rounded-2xl p-6 text-center"
                style={{
                  background: 'var(--admin-surface)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                <span
                  className="inline-flex w-14 h-14 rounded-full items-center justify-center mb-4"
                  style={{ background: 'color-mix(in srgb, var(--admin-accent) 14%, transparent)', color: 'var(--admin-accent)' }}
                >
                  <IconCheck size={26} />
                </span>
                <h3 className="text-base font-bold mb-2" style={{ color: 'var(--admin-text)' }}>
                  Tem certeza?
                </h3>
                <p className="text-sm mb-5" style={{ color: 'var(--admin-text-mute)' }}>
                  Você vai gerar a comanda de <b style={{ color: 'var(--admin-text)' }}>{selectedIds.size}</b>{' '}
                  {selectedIds.size === 1 ? 'item' : 'itens'} no valor total de{' '}
                  <b style={{ color: 'var(--admin-accent)' }}>{formatBRL(subtotal)}</b>.
                </p>

                {error && (
                  <p
                    className="text-xs mb-4 px-3 py-2 rounded-lg"
                    style={{
                      background: 'color-mix(in srgb, var(--admin-danger,#EF4444) 14%, transparent)',
                      color: 'var(--admin-danger,#EF4444)',
                    }}
                  >
                    Erro: {error}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider"
                    style={{
                      background: 'var(--admin-surface)',
                      color: 'var(--admin-text-mute)',
                      border: '1px solid var(--admin-border)',
                    }}
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={confirmar}
                    disabled={submitting || selectedIds.size === 0}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider disabled:opacity-50"
                    style={{ background: 'var(--admin-accent)', color: '#fff' }}
                  >
                    {submitting ? 'Faturando…' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
