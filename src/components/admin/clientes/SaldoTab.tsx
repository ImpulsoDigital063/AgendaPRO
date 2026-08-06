'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IconPlus, IconTrash } from '@/components/ui/Icon'
import AddCreditoModal from './AddCreditoModal'

type Credit = {
  id: string
  date: string
  amount: number
  origin: string
  payment_method: string | null
  used_in_invoice_id: string | null
  used_in_appointment_id?: string | null
  expires_at?: string | null
  notes: string | null
  professional: { name: string } | null
}

const ORIGEM_LABEL: Record<string, string> = {
  advance: 'Pagamento Adiantado',
  other: 'Outros',
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  credit: 'Cartão de Crédito',
  debit: 'Cartão de Débito',
  transfer: 'Transferência',
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
}

type Props = {
  customerId: string
  customerName: string
  businessId: string
}

export default function SaldoTab({ customerId, customerName, businessId }: Props) {
  const router = useRouter()
  const [credits, setCredits] = useState<Credit[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  async function load() {
    setLoading(true)
    const sb = createClient()
    const { data } = await sb
      .from('customer_credits')
      .select('id, date, amount, origin, payment_method, used_in_invoice_id, used_in_appointment_id, expires_at, notes, professional:professionals(name)')
      .eq('customer_id', customerId)
      .order('date', { ascending: false })
    const normalized: Credit[] = (data ?? []).map((row) => {
      const r = row as unknown as {
        id: string
        date: string
        amount: number
        origin: string
        payment_method: string | null
        used_in_invoice_id: string | null
        used_in_appointment_id: string | null
        expires_at: string | null
        notes: string | null
        professional: { name: string } | { name: string }[] | null
      }
      const prof = Array.isArray(r.professional) ? r.professional[0] ?? null : r.professional
      return {
        id: r.id,
        date: r.date,
        amount: Number(r.amount),
        origin: r.origin,
        payment_method: r.payment_method,
        used_in_invoice_id: r.used_in_invoice_id,
        used_in_appointment_id: r.used_in_appointment_id ?? null,
        expires_at: r.expires_at ?? null,
        notes: r.notes,
        professional: prof,
      }
    })
    setCredits(normalized)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  /* v113 · disponivel = nao usado em comanda NEM em sinal, e dentro da
     validade. Antes contava credito ja gasto no sinal e credito vencido —
     a dona via saldo que o pagamento ia recusar. */
  const agora = Date.now()
  const estaDisponivel = (c: { used_in_invoice_id: string | null; used_in_appointment_id?: string | null; expires_at?: string | null }) =>
    !c.used_in_invoice_id && !c.used_in_appointment_id && (!c.expires_at || new Date(c.expires_at).getTime() >= agora)
  const totalDisponivel = credits.filter(estaDisponivel).reduce((s, c) => s + Number(c.amount), 0)
  const totalUsado = credits.filter((c) => c.used_in_invoice_id || c.used_in_appointment_id).reduce((s, c) => s + Number(c.amount), 0)

  return (
    <div className="space-y-4">
      {/* Sumário */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
            Saldo Disponível
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: '#10B981' }}>
            {formatBRL(totalDisponivel)}
          </p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
            Já Utilizado
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: 'var(--admin-text-mute)' }}>
            {formatBRL(totalUsado)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
          {credits.length} {credits.length === 1 ? 'crédito' : 'créditos'}
        </p>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          <IconPlus size={14} /> Adicionar Crédito
        </button>
      </div>

      {loading ? (
        <p className="text-center text-sm py-10" style={{ color: 'var(--admin-text-mute)' }}>
          Carregando…
        </p>
      ) : credits.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
            Este cliente não possui nenhum crédito.
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
        >
          {credits.map((c, idx) => {
            const usado = !!c.used_in_invoice_id
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: idx < credits.length - 1 ? '1px solid var(--admin-divider)' : 'none' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                    {ORIGEM_LABEL[c.origin] ?? c.origin}
                    {c.payment_method && ` · ${METHOD_LABEL[c.payment_method] ?? c.payment_method}`}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
                    {formatDate(c.date)}
                    {c.professional?.name && ` · ${c.professional.name}`}
                    {c.notes && ` · ${c.notes}`}
                  </p>
                </div>
                <p className="text-sm font-bold tabular-nums" style={{ color: usado ? 'var(--admin-text-mute)' : '#10B981' }}>
                  {formatBRL(Number(c.amount))}
                </p>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
                  style={{
                    background: usado
                      ? 'color-mix(in srgb, var(--admin-text-mute) 14%, transparent)'
                      : 'color-mix(in srgb, #10B981 14%, transparent)',
                    color: usado ? 'var(--admin-text-mute)' : '#10B981',
                  }}
                >
                  {usado ? 'Utilizado' : 'Disponível'}
                </span>
                {!usado && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm('Remover esse crédito?')) return
                      const res = await fetch(`/api/admin/customers/${customerId}/credits?creditId=${c.id}`, { method: 'DELETE' })
                      if (res.ok) {
                        await load()
                        router.refresh()
                      }
                    }}
                    aria-label="Remover"
                    className="p-1.5 rounded-lg"
                    style={{ color: 'var(--admin-danger,#EF4444)' }}
                  >
                    <IconTrash size={14} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <AddCreditoModal
          customerId={customerId}
          customerName={customerName}
          businessId={businessId}
          onClose={() => setShowAdd(false)}
          onSaved={async () => {
            setShowAdd(false)
            await load()
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
