'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  IconDollar,
  IconCheck,
  IconClock,
  IconStar,
} from '@/components/ui/Icon'

type AppointmentForCash = {
  id: string
  total_price: number | null
  paid_at: string | null
  payment_method: string | null
  payment_card_type: string | null
  payment_fee_percent: number | null
  client_name: string
}

type ClosingRow = {
  id: string
  closing_date: string
  closed_at: string
  total_gross_cents: number
  total_net_cents: number
  cash_diff_cents: number | null
}

type Props = {
  businessId: string
  professionalId: string
  recepName: string
  todayAppts: AppointmentForCash[]
  closings: ClosingRow[]
  alreadyClosedToday: boolean
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function dateBR(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function CaixaView({
  businessId,
  professionalId,
  recepName,
  todayAppts,
  closings,
  alreadyClosedToday,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [cashPhysical, setCashPhysical] = useState('')
  const [notes, setNotes] = useState('')
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Cálculo de totais agregados
  const totals = useMemo(() => {
    const t = {
      pix: 0,
      cash: 0,
      card_credit: 0,
      card_debit: 0,
      card_total: 0,
      courtesy: 0,
      points: 0,
      fees: 0,
      gross: 0,
      net: 0,
      count: todayAppts.length,
    }
    for (const a of todayAppts) {
      const price = (a.total_price || 0) * 100
      t.gross += price
      switch (a.payment_method) {
        case 'pix':
          t.pix += price
          break
        case 'cash':
          t.cash += price
          break
        case 'card':
          t.card_total += price
          if (a.payment_card_type === 'credit') t.card_credit += price
          else if (a.payment_card_type === 'debit') t.card_debit += price
          // taxa
          if (a.payment_fee_percent && a.payment_fee_percent > 0) {
            t.fees += Math.round((price * a.payment_fee_percent) / 100)
          }
          break
        case 'courtesy':
          t.courtesy += price
          break
        case 'points':
          t.points += 1
          break
      }
    }
    t.net = t.gross - t.fees
    return t
  }, [todayAppts])

  const physicalCents = useMemo(() => {
    const n = parseFloat(cashPhysical.replace(',', '.'))
    if (isNaN(n) || n < 0) return null
    return Math.round(n * 100)
  }, [cashPhysical])

  const cashDiff = physicalCents != null ? physicalCents - totals.cash : null

  async function handleClose() {
    if (alreadyClosedToday) {
      setError('Caixa de hoje já fechado.')
      return
    }
    if (physicalCents == null) {
      setError('Informe a contagem de dinheiro físico antes de fechar.')
      return
    }
    setError(null)
    setClosing(true)
    const today = new Date().toISOString().split('T')[0]

    const { error: e } = await supabase.from('cash_closings').insert({
      business_id: businessId,
      closed_by_professional_id: professionalId,
      closing_date: today,
      total_pix_cents: totals.pix,
      total_cash_cents: totals.cash,
      total_card_credit_cents: totals.card_credit,
      total_card_debit_cents: totals.card_debit,
      total_card_fees_cents: totals.fees,
      total_courtesy_cents: totals.courtesy,
      total_points_redeemed: totals.points,
      total_gross_cents: totals.gross,
      total_net_cents: totals.net,
      cash_physical_count_cents: physicalCents,
      cash_diff_cents: cashDiff,
      notes: notes.trim() || null,
    })

    setClosing(false)
    if (e) {
      setError(`Erro: ${e.message}`)
      return
    }
    setDone(true)
    router.refresh()
  }

  return (
    <div className="relative max-w-lg mx-auto px-4 pb-32 space-y-4">
      {/* Resumo de hoje */}
      <div className="admin-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
            Resumo de hoje
          </p>
          <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
            {totals.count} pagamento{totals.count !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-2">
          <Row label="PIX" value={formatBRL(totals.pix)} icon="PIX" color="#10B981" />
          <Row label="Dinheiro" value={formatBRL(totals.cash)} icon="$" color="#16A34A" />
          <Row label="Cartão crédito" value={formatBRL(totals.card_credit)} icon="▭" color="var(--admin-accent)" />
          <Row label="Cartão débito" value={formatBRL(totals.card_debit)} icon="▭" color="var(--admin-accent)" />
          {totals.courtesy > 0 && (
            <Row label="Cortesia" value={formatBRL(totals.courtesy)} icon="✿" color="var(--admin-text-mute)" />
          )}
          {totals.points > 0 && (
            <Row label="Resgates de pontos" value={`${totals.points}`} icon="★" color="var(--admin-warn)" />
          )}
        </div>

        <div className="pt-3 border-t" style={{ borderColor: 'var(--admin-divider)' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
              Bruto
            </p>
            <p className="text-base font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
              {formatBRL(totals.gross)}
            </p>
          </div>
          {totals.fees > 0 && (
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
                Taxas de cartão
              </p>
              <p className="text-base font-bold tabular-nums" style={{ color: 'var(--admin-danger,#EF4444)' }}>
                − {formatBRL(totals.fees)}
              </p>
            </div>
          )}
          <div
            className="flex items-center justify-between mt-2 pt-2 border-t"
            style={{ borderColor: 'var(--admin-divider)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
              Líquido
            </p>
            <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--admin-success,#10B981)' }}>
              {formatBRL(totals.net)}
            </p>
          </div>
        </div>
      </div>

      {/* Conferência de espécie + fechamento */}
      {!alreadyClosedToday ? (
        <div className="admin-card p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
            Conferência de espécie
          </p>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-mute)' }}>
              Quanto tem no caixa físico?
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--admin-text-faded)' }}>
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={cashPhysical}
                onChange={(e) => setCashPhysical(e.target.value)}
                placeholder="0,00"
                className="admin-input w-full pl-8 pr-3 py-2.5 text-sm tabular-nums"
              />
            </div>
            {cashDiff != null && (
              <p
                className="text-xs mt-2 inline-flex items-center gap-1.5"
                style={{
                  color:
                    cashDiff === 0
                      ? 'var(--admin-success,#10B981)'
                      : cashDiff > 0
                        ? 'var(--admin-warn)'
                        : 'var(--admin-danger,#EF4444)',
                }}
              >
                {cashDiff === 0 && <><IconCheck size={12} /> Bate certinho com o sistema</>}
                {cashDiff > 0 && <>Sobra de {formatBRL(cashDiff)} (mais que o sistema diz)</>}
                {cashDiff < 0 && <>Falta {formatBRL(Math.abs(cashDiff))} (menos que o sistema diz)</>}
              </p>
            )}
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-mute)' }}>
              Anotações (opcional)
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex: 'Cliente Y pagou metade em pix e metade em dinheiro'"
              className="admin-input w-full px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{ background: 'color-mix(in srgb, var(--admin-danger,#EF4444) 12%, transparent)', color: 'var(--admin-danger,#EF4444)' }}
            >
              {error}
            </p>
          )}

          {done ? (
            <div
              className="text-sm px-3 py-3 rounded-lg inline-flex items-center gap-2"
              style={{
                background: 'color-mix(in srgb, var(--admin-success,#10B981) 12%, transparent)',
                color: 'var(--admin-success,#10B981)',
              }}
            >
              <IconCheck size={16} /> Caixa fechado com sucesso · {recepName}
            </div>
          ) : (
            <button
              onClick={handleClose}
              disabled={closing}
              className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              {closing ? 'Fechando…' : 'Fechar caixa do dia'}
            </button>
          )}
        </div>
      ) : (
        <div
          className="admin-card p-4 inline-flex items-center gap-2 text-sm"
          style={{ color: 'var(--admin-success,#10B981)' }}
        >
          <IconCheck size={16} /> Caixa de hoje já foi fechado
        </div>
      )}

      {/* Histórico de fechamentos */}
      {closings.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
            Últimos fechamentos
          </p>
          {closings.map((c) => (
            <div key={c.id} className="admin-card p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                  {dateBR(c.closing_date)}
                </p>
                <p className="text-base font-bold tabular-nums" style={{ color: 'var(--admin-success,#10B981)' }}>
                  {formatBRL(c.total_net_cents)}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                <span>Bruto {formatBRL(c.total_gross_cents)}</span>
                {c.cash_diff_cents != null && c.cash_diff_cents !== 0 && (
                  <span style={{ color: c.cash_diff_cents > 0 ? 'var(--admin-warn)' : 'var(--admin-danger,#EF4444)' }}>
                    {c.cash_diff_cents > 0 ? `+${formatBRL(c.cash_diff_cents)} sobra` : `${formatBRL(c.cash_diff_cents)} falta`}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--admin-text-2)' }}>
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
          style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
        >
          {icon}
        </span>
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
        {value}
      </span>
    </div>
  )
}
