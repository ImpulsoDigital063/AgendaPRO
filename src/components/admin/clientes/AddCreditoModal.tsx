'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { IconClose, IconArrowLeft } from '@/components/ui/Icon'

type Professional = { id: string; name: string }

type Props = {
  customerId: string
  customerName: string
  businessId: string
  onClose: () => void
  onSaved: () => void
}

const ORIGEM_OPTIONS = [
  { value: 'advance', label: 'Pagamento Adiantado' },
  { value: 'other', label: 'Outros' },
]

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'credit', label: 'Cartão de Crédito' },
  { value: 'debit', label: 'Cartão de Débito' },
  { value: 'transfer', label: 'Transferência' },
]

export default function AddCreditoModal({ customerId, customerName, businessId, onClose, onSaved }: Props) {
  const [profs, setProfs] = useState<Professional[]>([])
  const [professionalId, setProfessionalId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [origin, setOrigin] = useState<'advance' | 'other'>('advance')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sb = createClient()
    async function load() {
      const { data } = await sb
        .from('professionals')
        .select('id, name')
        .eq('business_id', businessId)
        .eq('active', true)
        .order('name')
      setProfs((data ?? []) as Professional[])
    }
    load()
  }, [businessId])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function save() {
    const amt = parseFloat(amount.replace(',', '.'))
    if (!amt || amt <= 0) {
      setError('Informe um valor maior que zero')
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await fetch(`/api/admin/customers/${customerId}/credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amt,
        date,
        origin,
        professionalId: professionalId || null,
        paymentMethod: paymentMethod || null,
        notes: notes.trim() || null,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'falha')
      setSubmitting(false)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div
        className="absolute inset-x-0 top-0 bottom-0 flex flex-col mx-auto"
        style={{ maxWidth: 560, background: 'var(--admin-bg)' }}
      >
        <div
          className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
          style={{ background: 'var(--admin-surface)', borderBottom: '1px solid var(--admin-border)' }}
        >
          <button type="button" onClick={onClose} aria-label="Voltar" className="p-2 rounded-lg" style={{ color: 'var(--admin-text-mute)' }}>
            <IconArrowLeft size={18} />
          </button>
          <h2 className="flex-1 text-base font-bold" style={{ color: 'var(--admin-text)' }}>
            Adicionar Crédito
          </h2>
          <button
            type="button"
            onClick={save}
            disabled={submitting}
            className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            style={{ background: 'var(--admin-accent)', color: '#fff' }}
          >
            {submitting ? 'Salvando…' : 'Salvar'}
          </button>
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-2 rounded-lg" style={{ color: 'var(--admin-text-mute)' }}>
            <IconClose size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{
              background: 'color-mix(in srgb, var(--admin-danger,#EF4444) 14%, transparent)',
              color: 'var(--admin-danger,#EF4444)',
            }}>
              {error}
            </p>
          )}

          <div className="rounded-2xl p-5 space-y-3" style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
          }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                Cliente
              </p>
              <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{customerName}</p>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={submitting}
                className="admin-input w-full px-3 py-2 text-sm tabular-nums"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                Profissional
              </label>
              <select
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                disabled={submitting}
                className="admin-input w-full px-3 py-2 text-sm"
              >
                <option value="">— Não vincular —</option>
                {profs.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <p className="text-[10px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                Quando vinculado, o crédito conta na comissão desse profissional.
              </p>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                Valor do Crédito (R$) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={submitting}
                placeholder="0,00"
                className="admin-input w-full px-3 py-2 text-sm tabular-nums"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                  Origem
                </label>
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value as 'advance' | 'other')}
                  disabled={submitting}
                  className="admin-input w-full px-3 py-2 text-sm"
                >
                  {ORIGEM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                  Forma de Pagamento
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={submitting}
                  className="admin-input w-full px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {PAYMENT_METHODS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                Observações
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                rows={2}
                className="admin-input w-full px-3 py-2 text-sm"
                placeholder="Anotação interna (opcional)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
