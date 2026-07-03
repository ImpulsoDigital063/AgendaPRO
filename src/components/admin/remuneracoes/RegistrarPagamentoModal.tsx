'use client'

import { todayBR } from '@/lib/date-br'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IconClose, IconArrowLeft, IconCheck } from '@/components/ui/Icon'

type PendingItem = {
  id: string
  paid_at: string
  service_name: string | null
  client_name: string | null
  total_price: number | null
  commissionValue: number
}

type Props = {
  professionalId: string
  professionalName: string
  defaultCommissionPercent: number
  periodStart: string // YYYY-MM-DD
  periodEnd: string // YYYY-MM-DD
  onClose: () => void
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function formatPeriod(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
  const e = new Date(end + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
  return `${s} até ${e}`
}

export default function RegistrarPagamentoModal({
  professionalId,
  professionalName,
  defaultCommissionPercent,
  periodStart,
  periodEnd,
  onClose,
}: Props) {
  const router = useRouter()
  const [items, setItems] = useState<PendingItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state step 2
  const [notes, setNotes] = useState('')
  const [paymentDate, setPaymentDate] = useState(todayBR())
  const [paymentAmount, setPaymentAmount] = useState('')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    const sb = createClient()
    async function load() {
      setLoading(true)
      const fromIso = new Date(periodStart + 'T00:00:00').toISOString()
      const toEnd = new Date(periodEnd + 'T00:00:00')
      toEnd.setDate(toEnd.getDate() + 1)
      const { data, error: err } = await sb
        .from('appointments')
        .select('id, paid_at, service_name, client_name, total_price')
        .eq('professional_id', professionalId)
        .gte('paid_at', fromIso)
        .lt('paid_at', toEnd.toISOString())
        .is('commission_payment_id', null)
        .not('paid_at', 'is', null)
        .order('paid_at', { ascending: false })

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      const normalized: PendingItem[] = (data ?? []).map((a) => ({
        id: a.id,
        paid_at: a.paid_at!,
        service_name: a.service_name,
        client_name: a.client_name,
        total_price: a.total_price,
        commissionValue: (Number(a.total_price ?? 0) * defaultCommissionPercent) / 100,
      }))

      setItems(normalized)
      setSelectedIds(new Set(normalized.map((i) => i.id)))
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedItems = items.filter((i) => selectedIds.has(i.id))
  const totalSelected = selectedItems.reduce((s, i) => s + i.commissionValue, 0)

  // Sync paymentAmount when total changes
  useEffect(() => {
    setPaymentAmount(totalSelected.toFixed(2).replace('.', ','))
  }, [totalSelected])

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function submit() {
    const paidAmount = parseFloat(paymentAmount.replace(',', '.')) || 0
    if (paidAmount <= 0) {
      setError('Informe um valor de pagamento maior que zero')
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/admin/commission-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        professionalId,
        appointmentIds: Array.from(selectedIds),
        periodStart,
        periodEnd,
        paidAmount,
        notes: notes.trim() || null,
        paidAt: new Date(paymentDate + 'T12:00:00').toISOString(),
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'falha_ao_pagar')
      setSubmitting(false)
      return
    }
    onClose()
    router.refresh()
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
              {step === 1 ? 'Pagamento de Comissão' : 'Confirmar Pagamento'}
            </h2>
            <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
              {professionalName}
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
              Carregando remunerações pendentes…
            </p>
          ) : items.length === 0 ? (
            <p className="text-center text-sm py-10" style={{ color: 'var(--admin-text-mute)' }}>
              Nenhuma remuneração pendente nesse período.
            </p>
          ) : step === 1 ? (
            <div>
              <p className="text-sm mb-3" style={{ color: 'var(--admin-text-2)' }}>
                Selecione as remunerações desejadas para registrar o pagamento:
              </p>
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'var(--admin-surface)',
                  border: '1px solid var(--admin-border)',
                  maxHeight: '50vh',
                  overflowY: 'auto',
                }}
              >
                {items.map((it, idx) => {
                  const checked = selectedIds.has(it.id)
                  return (
                    <label
                      key={it.id}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
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
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                          {it.service_name ?? 'Atendimento'}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
                          {formatDate(it.paid_at)} · {it.client_name ?? '—'} · Base {formatBRL(Number(it.total_price ?? 0))}
                        </p>
                      </div>
                      <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-accent)' }}>
                        {formatBRL(it.commissionValue)}
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
                <div className="flex items-center justify-between text-sm mb-1">
                  <span style={{ color: 'var(--admin-text-mute)' }}>Selecionados</span>
                  <span className="font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    {selectedIds.size}
                  </span>
                </div>
                <div
                  className="flex items-center justify-between text-lg pt-2 mt-2"
                  style={{ borderTop: '1px solid var(--admin-divider)' }}
                >
                  <span className="font-bold" style={{ color: 'var(--admin-text)' }}>Total</span>
                  <span className="font-bold tabular-nums" style={{ color: 'var(--admin-accent)' }}>
                    {formatBRL(totalSelected)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            // Step 2 · Form
            <div className="max-w-md mx-auto mt-6">
              <div
                className="rounded-2xl p-6"
                style={{
                  background: 'var(--admin-surface)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                <div className="text-center mb-5">
                  <span
                    className="inline-flex w-14 h-14 rounded-full items-center justify-center mb-3"
                    style={{ background: 'color-mix(in srgb, var(--admin-accent) 14%, transparent)', color: 'var(--admin-accent)' }}
                  >
                    <IconCheck size={26} />
                  </span>
                  <h3 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
                    {professionalName}
                  </h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
                    Período: {formatPeriod(periodStart, periodEnd)}
                  </p>
                  <p className="text-xs mt-2" style={{ color: 'var(--admin-text-2)' }}>
                    <b>{selectedIds.size}</b> {selectedIds.size === 1 ? 'remuneração selecionada' : 'remunerações selecionadas'}
                  </p>
                  <p className="text-xl font-bold tabular-nums mt-1" style={{ color: 'var(--admin-accent)' }}>
                    Valor a pagar: {formatBRL(totalSelected)}
                  </p>
                </div>

                {error && (
                  <p
                    className="text-xs mb-3 px-3 py-2 rounded-lg"
                    style={{
                      background: 'color-mix(in srgb, var(--admin-danger,#EF4444) 14%, transparent)',
                      color: 'var(--admin-danger,#EF4444)',
                    }}
                  >
                    Erro: {error}
                  </p>
                )}

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                      Observações (Opcional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={submitting}
                      rows={2}
                      className="admin-input w-full px-3 py-2 text-sm"
                      placeholder="Anotação interna sobre esse pagamento"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                      Data do Pagamento
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      disabled={submitting}
                      className="admin-input w-full px-3 py-2 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                      Valor do Pagamento (R$)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      disabled={submitting}
                      className="admin-input w-full px-3 py-2 text-sm tabular-nums"
                    />
                    <p className="text-[10px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                      Pode editar pra pagar valor parcial · default = total selecionado
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider"
                    style={{
                      background: 'var(--admin-surface-hi)',
                      color: 'var(--admin-text-mute)',
                      border: '1px solid var(--admin-border)',
                    }}
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting || selectedIds.size === 0}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider disabled:opacity-50"
                    style={{ background: 'var(--admin-accent)', color: '#fff' }}
                  >
                    {submitting ? 'Salvando…' : 'Salvar'}
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
