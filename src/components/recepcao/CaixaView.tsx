'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { todayBR } from '@/lib/date-br'
import { logActivity } from '@/lib/activity-log'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'
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
  /** Desconto rateado da comanda (centavos) · caixa soma o líquido. */
  discount_cents?: number
  /**
   * O que a cliente PAGOU (invoices.total) quando a comanda tem produto —
   * combo ou vendido junto. total_price sozinho é só o serviço, e o caixa
   * fechava por baixo: R$195 numa conta de R$290 (Eduardo 22/07).
   */
  charged_total?: number | null
}

type ClosingRow = {
  id: string
  closing_date: string
  closed_at: string
  total_gross_cents: number
  total_net_cents: number
  cash_diff_cents: number | null
}

type CashMovement = {
  id: string
  type: 'sangria' | 'suprimento'
  amount_cents: number
  reason: string | null
  created_at: string
}

type Props = {
  businessId: string
  professionalId: string
  recepName: string
  todayAppts: AppointmentForCash[]
  closings: ClosingRow[]
  alreadyClosedToday: boolean
  /** v91 (29/05/2026) · contagem de atendimentos do dia (exclui cancelled / no_show) */
  todayCount?: number
  /** v91 · quantos atendimentos ainda não pagos */
  pendingCount?: number
  /** v91 · soma em centavos do que falta receber hoje */
  pendingValueCents?: number
  /** Recep não vê histórico de fechamentos passados · Luana cravou 28/05. */
  isReceptionist?: boolean
  /** Abertura do caixa de HOJE (fundo de troco) · null se ainda não abriu. */
  opening?: { opening_amount_cents: number; opened_at: string } | null
  /** Movimentos do dia (sangria/suprimento) · ajustam o esperado na gaveta. */
  movements?: CashMovement[]
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
  todayCount = 0,
  pendingCount = 0,
  pendingValueCents = 0,
  isReceptionist = false,
  opening = null,
  movements = [],
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  // Abertura de caixa (fundo de troco / valor inicial do dia).
  const openingCents = opening?.opening_amount_cents ?? 0
  const [openingAmount, setOpeningAmount] = useState('')
  const [openingBusy, setOpeningBusy] = useState(false)

  // Movimentos do caixa no dia (sangria/suprimento)
  const suprimentoCents = movements.filter((m) => m.type === 'suprimento').reduce((s, m) => s + m.amount_cents, 0)
  const sangriaCents = movements.filter((m) => m.type === 'sangria').reduce((s, m) => s + m.amount_cents, 0)
  const [movType, setMovType] = useState<'sangria' | 'suprimento' | null>(null)
  const [movAmount, setMovAmount] = useState('')
  const [movReason, setMovReason] = useState('')
  const [movBusy, setMovBusy] = useState(false)

  const [cashPhysical, setCashPhysical] = useState('')
  const [cardPhysical, setCardPhysical] = useState('')
  const [pixPhysical, setPixPhysical] = useState('')
  const [notes, setNotes] = useState('')
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // v91 · Relógio vivo no header · atualiza a cada 1s.
  // Inicializa null pra evitar hydration mismatch (server vs client time).
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  async function handleOpen() {
    const n = parseFloat(openingAmount.replace(',', '.'))
    if (isNaN(n) || n < 0) {
      setError('Informe o valor inicial do caixa (fundo de troco).')
      return
    }
    setError(null)
    setOpeningBusy(true)
    const today = todayBR()
    const cents = Math.round(n * 100)
    const { error: e } = await supabase.from('cash_openings').insert({
      business_id: businessId,
      opening_date: today,
      opening_amount_cents: cents,
      opened_by_professional_id: professionalId,
    })
    setOpeningBusy(false)
    if (e) {
      setError(`Erro ao abrir caixa: ${e.message}`)
      return
    }
    logActivity({
      business_id: businessId,
      professional_id: professionalId,
      action: 'open_cash',
      target_type: 'cash_opening',
      description: `Caixa aberto · fundo de troco R$${(cents / 100).toFixed(2).replace('.', ',')}`,
    })
    router.refresh()
  }

  async function handleMovement() {
    if (!movType) return
    const n = parseFloat(movAmount.replace(',', '.'))
    if (isNaN(n) || n <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }
    setError(null)
    setMovBusy(true)
    const today = todayBR()
    const cents = Math.round(n * 100)
    const { error: e } = await supabase.from('cash_movements').insert({
      business_id: businessId,
      movement_date: today,
      type: movType,
      amount_cents: cents,
      reason: movReason.trim() || null,
      created_by_professional_id: professionalId,
    })
    setMovBusy(false)
    if (e) {
      setError(`Erro ao registrar: ${e.message}`)
      return
    }
    logActivity({
      business_id: businessId,
      professional_id: professionalId,
      action: movType === 'sangria' ? 'cash_sangria' : 'cash_suprimento',
      target_type: 'cash_movement',
      description: `${movType === 'sangria' ? 'Sangria' : 'Suprimento'} de R$${(cents / 100).toFixed(2).replace('.', ',')}${movReason.trim() ? ` · ${movReason.trim()}` : ''}`,
    })
    setMovType(null)
    setMovAmount('')
    setMovReason('')
    router.refresh()
  }

  // v91 · Modal de confirmação antes de fechar (Marko cravou: não pode fechar por engano).
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)

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
      // Líquido = bruto − desconto rateado da comanda. É o que entrou de fato no
      // caixa (Eduardo 03/06). Bruto inflava o esperado e gerava falta falsa.
      // charged_total já vem líquido de desconto da comanda (é invoices.total),
      // então não abate discount_cents de novo — senão desconta em dobro.
      const price = a.charged_total != null
        ? Math.round(a.charged_total * 100)
        : Math.round((a.total_price || 0) * 100) - (a.discount_cents || 0)
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

  // Esperado na gaveta = fundo de troco + dinheiro recebido + suprimentos − sangrias.
  // Sem abertura/movimento, vira só (contado − recebido) · comportamento antigo.
  const expectedCashCents = openingCents + totals.cash + suprimentoCents - sangriaCents
  const cashDiff = physicalCents != null ? physicalCents - expectedCashCents : null

  const cardPhysicalCents = useMemo(() => {
    const n = parseFloat(cardPhysical.replace(',', '.'))
    if (isNaN(n) || n < 0) return null
    return Math.round(n * 100)
  }, [cardPhysical])
  // Usa card_total (não credit+debit) · cartão sem tipo definido também conta,
  // senão a conferência esperaria menos que o real e acusaria sobra falsa.
  const cardDiff = cardPhysicalCents != null ? cardPhysicalCents - totals.card_total : null

  const pixPhysicalCents = useMemo(() => {
    const n = parseFloat(pixPhysical.replace(',', '.'))
    if (isNaN(n) || n < 0) return null
    return Math.round(n * 100)
  }, [pixPhysical])
  const pixDiff = pixPhysicalCents != null ? pixPhysicalCents - totals.pix : null

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
    const today = todayBR()

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
      opening_amount_cents: openingCents,
      cash_physical_count_cents: physicalCents,
      cash_diff_cents: cashDiff,
      card_physical_count_cents: cardPhysicalCents,
      card_diff_cents: cardDiff,
      pix_physical_count_cents: pixPhysicalCents,
      pix_diff_cents: pixDiff,
      notes: notes.trim() || null,
    })

    setClosing(false)
    if (e) {
      setError(`Erro: ${e.message}`)
      return
    }
    logActivity({
      business_id: businessId,
      professional_id: professionalId,
      action: 'close_cash',
      target_type: 'cash_closing',
      description: `Caixa de ${today} fechado · líquido R$${(totals.net / 100).toFixed(2).replace('.', ',')}${cashDiff && cashDiff !== 0 ? ` · ${cashDiff > 0 ? 'sobra' : 'falta'} de R$${Math.abs(cashDiff / 100).toFixed(2).replace('.', ',')}` : ''}`,
    })
    setDone(true)
    router.refresh()
  }

  return (
    <div className="relative max-w-lg md:max-w-7xl mx-auto px-4 md:px-6 pb-32 space-y-4">
      {/* v91 · Header de identificação · data por extenso, horário vivo,
         operadora logada, status do caixa. Letícia opera o dia inteiro · precisa
         saber qual dia/hora/quem · e Marko ver "Letícia fechou às X" via log. */}
      <div className="admin-card p-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
            Operadora
          </p>
          <p className="text-base font-bold mt-0.5 truncate" style={{ color: 'var(--admin-text)' }}>
            {recepName}
          </p>
          <p className="text-xs mt-1 capitalize" style={{ color: 'var(--admin-text-mute)' }}>
            {now
              ? now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
              : '—'}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
            Horário
          </p>
          <p className="text-2xl font-bold tabular-nums mt-0.5" style={{ color: 'var(--admin-accent)' }}>
            {now
              ? now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : '--:--:--'}
          </p>
          {(() => {
            const st = alreadyClosedToday
              ? { label: 'Caixa fechado', color: 'var(--admin-warn)', dot: '#F59E0B' }
              : opening
                ? { label: 'Caixa aberto', color: 'var(--admin-success,#10B981)', dot: '#10B981' }
                : { label: 'Caixa não aberto', color: 'var(--admin-text-mute)', dot: '#94A3B8' }
            return (
              <span className="inline-flex items-center gap-1.5 text-[11px] mt-1" style={{ color: st.color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />
                {st.label}
              </span>
            )
          })()}
        </div>
      </div>

      {/* Abertura de caixa · fundo de troco do dia (entra na conferência) */}
      {!alreadyClosedToday && (
        opening ? (
          <div className="admin-card p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
                Caixa aberto
              </p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                Fundo de troco: <b style={{ color: 'var(--admin-text)' }}>{formatBRL(openingCents)}</b>
                {' · '}às {new Date(opening.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <span style={{ color: 'var(--admin-success,#10B981)' }}><IconCheck size={18} /></span>
          </div>
        ) : (
          <div className="admin-card p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
                Abrir caixa
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                Quanto de dinheiro já está na gaveta pra dar troco (fundo de troco). Entra na conferência do fechamento. Se começa zerada, ponha 0.
              </p>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--admin-text-faded)' }}>R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                placeholder="Ex: 100,00"
                className="admin-input w-full pl-8 pr-3 py-2.5 text-sm tabular-nums"
              />
            </div>
            {error && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'color-mix(in srgb, var(--admin-danger,#EF4444) 12%, transparent)', color: 'var(--admin-danger,#EF4444)' }}>
                {error}
              </p>
            )}
            <button
              onClick={handleOpen}
              disabled={openingBusy}
              className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              {openingBusy ? 'Abrindo…' : 'Abrir caixa'}
            </button>
          </div>
        )
      )}

      {/* Movimentos do caixa · sangria (saída) + suprimento (entrada) · só com caixa aberto */}
      {opening && !alreadyClosedToday && (
        <div className="admin-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
              Movimentos do caixa
            </p>
            {(suprimentoCents > 0 || sangriaCents > 0) && (
              <span className="text-[11px] tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>
                {suprimentoCents > 0 && <span style={{ color: 'var(--admin-success,#10B981)' }}>+{formatBRL(suprimentoCents)} </span>}
                {sangriaCents > 0 && <span style={{ color: 'var(--admin-danger,#EF4444)' }}>−{formatBRL(sangriaCents)}</span>}
              </span>
            )}
          </div>

          {movType === null ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setMovType('suprimento'); setMovAmount(''); setMovReason(''); setError(null) }}
                className="py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'color-mix(in srgb, var(--admin-success,#10B981) 14%, transparent)', color: 'var(--admin-success,#10B981)', border: '1px solid color-mix(in srgb, var(--admin-success,#10B981) 30%, transparent)' }}
              >
                + Suprimento
              </button>
              <button
                onClick={() => { setMovType('sangria'); setMovAmount(''); setMovReason(''); setError(null) }}
                className="py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'color-mix(in srgb, var(--admin-danger,#EF4444) 12%, transparent)', color: 'var(--admin-danger,#EF4444)', border: '1px solid color-mix(in srgb, var(--admin-danger,#EF4444) 30%, transparent)' }}
              >
                − Sangria
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                {movType === 'sangria' ? 'Sangria (retirada de dinheiro)' : 'Suprimento (reforço de dinheiro)'}
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--admin-text-faded)' }}>R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={movAmount}
                  onChange={(e) => setMovAmount(e.target.value)}
                  placeholder="Valor"
                  autoFocus
                  className="admin-input w-full pl-8 pr-3 py-2.5 text-sm tabular-nums"
                />
              </div>
              <input
                type="text"
                value={movReason}
                onChange={(e) => setMovReason(e.target.value)}
                placeholder={movType === 'sangria' ? 'Motivo (ex: depósito no banco)' : 'Motivo (ex: reforço de troco)'}
                className="admin-input w-full px-3 py-2.5 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setMovType(null); setMovAmount(''); setMovReason('') }}
                  className="flex-1 py-2 rounded-xl font-semibold text-sm"
                  style={{ background: 'transparent', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleMovement}
                  disabled={movBusy}
                  className="flex-1 py-2 rounded-xl font-semibold text-sm disabled:opacity-40"
                  style={{ background: 'var(--admin-accent)', color: '#fff' }}
                >
                  {movBusy ? 'Salvando…' : 'Registrar'}
                </button>
              </div>
            </div>
          )}

          {movements.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: 'var(--admin-divider)' }}>
              {movements.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs min-w-0 truncate" style={{ color: 'var(--admin-text-mute)' }}>
                    {m.type === 'sangria' ? 'Sangria' : 'Suprimento'}
                    {m.reason ? ` · ${m.reason}` : ''}
                    {' · '}
                    {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span
                    className="text-sm font-semibold tabular-nums flex-shrink-0"
                    style={{ color: m.type === 'sangria' ? 'var(--admin-danger,#EF4444)' : 'var(--admin-success,#10B981)' }}
                  >
                    {m.type === 'sangria' ? '−' : '+'}{formatBRL(m.amount_cents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
          {/* Cartão = total (card_total). Antes só existiam as linhas crédito/débito;
              cartão sem tipo definido (payment_card_type NULL) sumia do resumo mas
              entrava no Bruto → dinheiro invisível + sobra falsa no fechamento.
              Crédito/débito viram sub-detalhe só quando o tipo foi informado. */}
          <Row label="Cartão" value={formatBRL(totals.card_total)} icon="▭" color="var(--admin-accent)" />
          {totals.card_credit > 0 && (
            <Row label="· crédito" value={formatBRL(totals.card_credit)} icon=" " color="var(--admin-text-mute)" />
          )}
          {totals.card_debit > 0 && (
            <Row label="· débito" value={formatBRL(totals.card_debit)} icon=" " color="var(--admin-text-mute)" />
          )}
          {totals.courtesy > 0 && (
            <Row label="Cortesia" value={formatBRL(totals.courtesy)} icon="✿" color="var(--admin-text-mute)" />
          )}
          {totals.points > 0 && (
            <Row label="Resgates de pontos" value={`${totals.points}`} icon="★" color="var(--admin-warn)" />
          )}
        </div>

        {/* v91 · Atendimentos do dia + a receber · Letícia sabe o que falta antes de fechar */}
        {(todayCount > 0 || pendingCount > 0) && (
          <div className="pt-3 border-t" style={{ borderColor: 'var(--admin-divider)' }}>
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
                Atendimentos do dia
              </p>
              <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                {todayCount}
              </p>
            </div>
            {pendingCount > 0 && (
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-sm" style={{ color: 'var(--admin-warn)' }}>
                  A receber ainda hoje · {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
                </p>
                <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-warn)' }}>
                  {formatBRL(pendingValueCents)}
                </p>
              </div>
            )}
          </div>
        )}

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
            Conferência por método
          </p>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
            Confere cada método com o valor real (relatório maquininha, extrato Pix, dinheiro contado).
          </p>

          {/* Conferência Cartão */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-mute)' }}>
              Maquininha — total (crédito + débito)
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--admin-text-faded)' }}>
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={cardPhysical}
                onChange={(e) => setCardPhysical(e.target.value)}
                placeholder={`Sistema: ${formatBRL(totals.card_total)}`}
                className="admin-input w-full pl-8 pr-3 py-2.5 text-sm tabular-nums"
              />
            </div>
            {cardDiff != null && (
              <p
                className="text-xs mt-2 inline-flex items-center gap-1.5"
                style={{
                  color:
                    cardDiff === 0
                      ? 'var(--admin-success,#10B981)'
                      : cardDiff > 0
                        ? 'var(--admin-warn)'
                        : 'var(--admin-danger,#EF4444)',
                }}
              >
                {cardDiff === 0 && <><IconCheck size={12} /> Bate certinho</>}
                {cardDiff > 0 && <>Maquininha {formatBRL(cardDiff)} a mais que o sistema</>}
                {cardDiff < 0 && <>Maquininha {formatBRL(Math.abs(cardDiff))} a menos que o sistema</>}
              </p>
            )}
          </div>

          {/* Conferência Pix */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-mute)' }}>
              Pix — entrou no extrato do dia
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--admin-text-faded)' }}>
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={pixPhysical}
                onChange={(e) => setPixPhysical(e.target.value)}
                placeholder={`Sistema: ${formatBRL(totals.pix)}`}
                className="admin-input w-full pl-8 pr-3 py-2.5 text-sm tabular-nums"
              />
            </div>
            {pixDiff != null && (
              <p
                className="text-xs mt-2 inline-flex items-center gap-1.5"
                style={{
                  color:
                    pixDiff === 0
                      ? 'var(--admin-success,#10B981)'
                      : pixDiff > 0
                        ? 'var(--admin-warn)'
                        : 'var(--admin-danger,#EF4444)',
                }}
              >
                {pixDiff === 0 && <><IconCheck size={12} /> Bate certinho</>}
                {pixDiff > 0 && <>Pix {formatBRL(pixDiff)} a mais que o sistema</>}
                {pixDiff < 0 && <>Pix {formatBRL(Math.abs(pixDiff))} a menos que o sistema</>}
              </p>
            )}
          </div>

          {/* Conferência Dinheiro · existia · agora terceiro */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-mute)' }}>
              Dinheiro — contado na gaveta
            </p>
            {(openingCents > 0 || suprimentoCents > 0 || sangriaCents > 0) && (
              <p className="text-[11px] mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                Esperado: fundo {formatBRL(openingCents)} + recebido {formatBRL(totals.cash)}
                {suprimentoCents > 0 && <> + suprimento {formatBRL(suprimentoCents)}</>}
                {sangriaCents > 0 && <> − sangria {formatBRL(sangriaCents)}</>}
                {' = '}<b style={{ color: 'var(--admin-text-mute)' }}>{formatBRL(expectedCashCents)}</b>
              </p>
            )}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--admin-text-faded)' }}>
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={cashPhysical}
                onChange={(e) => setCashPhysical(e.target.value)}
                placeholder={`Esperado: ${formatBRL(expectedCashCents)}`}
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
              onClick={() => {
                if (physicalCents == null) {
                  setError('Informe a contagem de dinheiro físico antes de fechar.')
                  return
                }
                setError(null)
                setConfirmCloseOpen(true)
              }}
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

      {/* v91 · Confirmação antes de fechar caixa · Marko cravou: não pode fechar por engano */}
      <ConfirmActionModal
        open={confirmCloseOpen}
        title="Fechar caixa do dia?"
        message={[
          `Vai fechar o caixa de ${dateBR(todayBR())}.`,
          ``,
          `Líquido: ${formatBRL(totals.net)}`,
          cashDiff != null && cashDiff !== 0
            ? `Diferença no dinheiro: ${cashDiff > 0 ? '+' : '−'}${formatBRL(Math.abs(cashDiff))}`
            : '',
          pendingCount > 0
            ? ``
            : '',
          pendingCount > 0
            ? `ATENÇÃO: ${pendingCount} atendimento${pendingCount !== 1 ? 's' : ''} ainda sem pagamento (${formatBRL(pendingValueCents)}).`
            : '',
          ``,
          `Após fechar, só Marko consegue reabrir.`,
        ].filter(Boolean).join('\n')}
        confirmLabel="Sim, fechar"
        cancelLabel="Voltar"
        tone={pendingCount > 0 || (cashDiff != null && Math.abs(cashDiff) > 10000) ? 'warn' : 'neutral'}
        loading={closing}
        onConfirm={async () => {
          setConfirmCloseOpen(false)
          await handleClose()
        }}
        onClose={() => setConfirmCloseOpen(false)}
      />

      {/* Histórico de fechamentos · recep não vê (Luana cravou 28/05) */}
      {!isReceptionist && closings.length > 0 && (
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
