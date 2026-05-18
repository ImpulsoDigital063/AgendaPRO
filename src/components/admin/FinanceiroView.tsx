'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import FinancePeriodTabs from './FinancePeriodTabs'
import FinanceAppointmentList, { type FinanceRow } from './FinanceAppointmentList'
import { IconDollar, IconClock, IconCheck, IconChevronRight, IconSparkles } from '@/components/ui/Icon'
import { initialsFor, avatarGradient } from '@/lib/client-display'

export type AppointmentRow = {
  id: string
  client_name: string
  client_phone: string
  appointment_date: string
  start_time: string
  status: string
  service_name: string | null
  total_price: number | null
  paid_at: string | null
  payment_method: 'pix' | 'cash' | 'card' | 'courtesy' | null
  payment_card_type?: 'credit' | 'debit' | null
  payment_card_brand?: string | null
  payment_fee_percent?: number | null
  payment_installments?: number | null
  professional: { id: string; name: string; commission_percentage: number; employment_type?: string | null } | null
}

type Props = {
  appointments: AppointmentRow[]
  periodo: string
  totalExpenses?: number
}

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const PERIODO_LABEL: Record<string, string> = {
  hoje: 'Hoje',
  semana: 'Últimos 7 dias',
  mes: 'Este mês',
}

export default function FinanceiroView({ appointments, periodo, totalExpenses = 0 }: Props) {
  // Semantica financeira:
  // - Realizado = dinheiro QUE ENTROU em caixa (PIX/Dinheiro/Cartao).
  //   Cortesia NAO conta — eh brinde, nao receita. Bug histórico
  //   (CIC rodada 4): cortesia somava em Realizado E pagava comissao
  //   ao profissional sobre R$0. Dono perdia dois lados.
  // - Em aberto = total_price > 0 + status (confirmed/completed) +
  //   paid_at == null (atendimento marcado, ainda nao pago).
  // - Cortesias = brinde dado, conta separada (nao soma em receita).
  // - Faturado = Realizado + Em aberto (cortesia exclusa).
  const pagosReceita = appointments.filter(
    (a) => a.paid_at && a.total_price && a.payment_method !== 'courtesy'
  )
  const cortesias = appointments.filter(
    (a) => a.paid_at && a.total_price && a.payment_method === 'courtesy'
  )
  const naoPagos = appointments.filter(
    (a) =>
      a.paid_at == null &&
      a.total_price !== null &&
      a.total_price > 0 &&
      (a.status === 'confirmed' || a.status === 'completed')
  )
  const ativos = [...pagosReceita, ...naoPagos]

  const totalRealizado = pagosReceita.reduce((sum, a) => sum + (a.total_price ?? 0), 0)
  const totalCortesia = cortesias.reduce((sum, a) => sum + (a.total_price ?? 0), 0)
  const totalPendente = naoPagos.reduce((sum, a) => sum + (a.total_price ?? 0), 0)
  const totalFaturado = ativos.reduce((sum, a) => sum + (a.total_price ?? 0), 0)
  const ticketMedio = ativos.length > 0 ? totalFaturado / ativos.length : 0

  // Total de taxas (cartão · Pix com fee · etc) descontadas do bruto
  const totalTaxas = pagosReceita.reduce((sum, a) => {
    if (!a.payment_fee_percent || a.payment_fee_percent <= 0) return sum
    const price = a.total_price ?? 0
    return sum + (price * a.payment_fee_percent) / 100
  }, 0)
  const totalLiquido = totalRealizado - totalTaxas

  // Breakdown por método (recorta cortesia em metric separada acima).
  // pagosReceita ja exclui courtesy — byMethod soma so PIX/cash/card.
  // 'card' separado em credit/debit via payment_card_type.
  type MethodKey = 'pix' | 'cash' | 'card_credit' | 'card_debit' | 'card_other' | 'courtesy'
  const byMethod: Record<MethodKey, { gross: number; fees: number; count: number }> = {
    pix: { gross: 0, fees: 0, count: 0 },
    cash: { gross: 0, fees: 0, count: 0 },
    card_credit: { gross: 0, fees: 0, count: 0 },
    card_debit: { gross: 0, fees: 0, count: 0 },
    card_other: { gross: 0, fees: 0, count: 0 },
    courtesy: { gross: totalCortesia, fees: 0, count: cortesias.length },
  }
  for (const a of pagosReceita) {
    const price = a.total_price ?? 0
    const fee = a.payment_fee_percent ? (price * a.payment_fee_percent) / 100 : 0
    let key: MethodKey
    if (a.payment_method === 'pix') key = 'pix'
    else if (a.payment_method === 'cash') key = 'cash'
    else if (a.payment_method === 'card') {
      if (a.payment_card_type === 'credit') key = 'card_credit'
      else if (a.payment_card_type === 'debit') key = 'card_debit'
      else key = 'card_other'
    } else continue
    byMethod[key].gross += price
    byMethod[key].fees += fee
    byMethod[key].count += 1
  }

  // Agrupamento por profissional — comissao baseada em PAGOS DE RECEITA
  // (cortesia exclusa — profissional nao recebe comissao sobre brinde).
  type ProfEntry = {
    id: string
    name: string
    commission_percentage: number
    total: number
    count: number
  }
  const profMap: Record<string, ProfEntry> = {}
  for (const a of pagosReceita) {
    const prof = a.professional
    if (!prof) continue
    if ((prof.employment_type ?? 'commissioned') === 'employed') continue
    if (!profMap[prof.id]) {
      profMap[prof.id] = {
        id: prof.id,
        name: prof.name,
        commission_percentage: prof.commission_percentage ?? 0,
        total: 0,
        count: 0,
      }
    }
    profMap[prof.id].total += a.total_price ?? 0
    profMap[prof.id].count += 1
  }
  const profList = Object.values(profMap)
  const showCommission = profList.length > 1 || profList.some((p) => p.commission_percentage > 0)

  // Urgência: quantos não-pagos vencem nos próximos 7 dias
  // (appointment_date entre hoje e hoje+7). Dá ao dono prioridade
  // visual pra cobrar antes que escape.
  const urgentes = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const in7days = new Date(today)
    in7days.setDate(today.getDate() + 7)
    return naoPagos.filter((a) => {
      const d = new Date(a.appointment_date + 'T00:00:00')
      return d >= today && d <= in7days
    }).length
  }, [naoPagos])

  // Sparkline: timeline de receita por dia no período. SVG inline,
  // sem libs externas. Pra periodos curtos (hoje), não mostra.
  const sparklinePoints = useMemo(() => {
    if (periodo === 'hoje' || pagosReceita.length === 0) return null
    const map = new Map<string, number>()
    for (const a of pagosReceita) {
      map.set(a.appointment_date, (map.get(a.appointment_date) || 0) + (a.total_price ?? 0))
    }
    // Ordena cronologicamente
    const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
    if (sorted.length < 2) return null
    return sorted.map(([, v]) => v)
  }, [pagosReceita, periodo])

  const rows: FinanceRow[] = appointments.map((a) => ({
    id: a.id,
    client_name: a.client_name,
    appointment_date: a.appointment_date,
    start_time: a.start_time,
    status: a.status,
    service_name: a.service_name,
    total_price: a.total_price,
    paid_at: a.paid_at,
    payment_method: a.payment_method,
    professional_name: a.professional?.name ?? null,
  }))

  return (
    <div className="space-y-5 pb-24">
      {/* pb-24 reserva espaço pro FAB + bottom nav. Sem isso, conteúdo
          final (Comissão por profissional / lista) ficava cortado. */}
      <FinancePeriodTabs periodo={periodo} />

      {/* Hero KPI: Realizado (dinheiro real no caixa) */}
      <div
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, color-mix(in srgb, var(--brand-primary) 12%, var(--admin-surface)) 100%)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <div
          className="absolute -top-6 -right-6 w-28 h-28 rounded-full blur-2xl opacity-70 pointer-events-none"
          style={{ background: 'rgba(16,185,129,0.35)' }}
        />
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              Realizado · {PERIODO_LABEL[periodo]}
            </p>
            <p
              className="text-3xl font-extrabold mt-1 leading-none tabular-nums"
              style={{ color: 'var(--admin-text)' }}
            >
              {formatPrice(totalRealizado)}
            </p>
            <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-mute)' }}>
              {pagosReceita.length} atendimento{pagosReceita.length === 1 ? '' : 's'} pago{pagosReceita.length === 1 ? '' : 's'}
            </p>
            {sparklinePoints && sparklinePoints.length >= 2 && (
              <Sparkline values={sparklinePoints} color="#10B981" className="mt-2" />
            )}
          </div>
          <span
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(16,185,129,0.2)',
              color: '#16A34A',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
          >
            <IconCheck size={22} />
          </span>
        </div>
      </div>

      {/* Pendente + Faturado total + Ticket médio */}
      <div className="grid grid-cols-3 gap-2">
        <KpiTile
          label="Em aberto"
          value={formatPrice(totalPendente)}
          sub={
            // "Em aberto" = atendimentos confirmados/feitos sem paid_at.
            // NÃO é cobrança formal nem dívida — é projeção + lembrete
            // pro dono confirmar o pagamento conforme entra. Sistema
            // é educacional, não emissor de cobrança.
            // Sublabel "essa semana" so faz sentido em periodo "Mes"
            // (CIC rodada 4: hardcoded "essa semana" mesmo no filtro
            // "Hoje" confundia o dono).
            urgentes > 0 && periodo === 'mes'
              ? `${urgentes} essa semana`
              : `${naoPagos.length} pendente${naoPagos.length === 1 ? '' : 's'}`
          }
          subTone={urgentes > 0 ? 'warn' : 'neutral'}
          icon={<IconClock size={14} />}
          tone="warn"
        />
        <KpiTile
          label="Faturado"
          value={formatPrice(totalFaturado)}
          sub={`${ativos.length} no total`}
          icon={<IconDollar size={14} />}
          tone="neutral"
        />
        <KpiTile
          label="Ticket médio"
          value={formatPrice(ticketMedio)}
          sub="por atendimento"
          icon={<IconSparkles size={14} />}
          tone="accent"
        />
      </div>

      {/* Card LUCRO REAL — só na aba MÊS.
          Despesas geralmente são mensais (aluguel, salário, energia).
          Em "Hoje" ou "7 dias", lucro = receita-do-dia menos despesa-
          mensal-acumulada-até-hoje, dando número enganoso (-R$ 1k+
          quando receita do dia é R$ 0). Faz sentido só na escala
          completa do ciclo financeiro. */}
      {periodo === 'mes' && (
        <Link
          href="/admin/financeiro/despesas"
          className="block rounded-2xl p-4 transition-transform active:scale-[0.99]"
          style={{
            background:
              totalRealizado - totalExpenses >= 0
                ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))'
                : 'linear-gradient(135deg, rgba(239,68,68,0.14), rgba(239,68,68,0.04))',
            border: '1px solid var(--admin-border)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                Lucro real do mês
              </p>
              <p
                className="text-3xl font-extrabold mt-1 leading-none tabular-nums"
                style={{ color: totalRealizado - totalExpenses >= 0 ? '#10B981' : '#EF4444' }}
              >
                {formatPrice(totalRealizado - totalExpenses)}
              </p>
              <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-mute)' }}>
                {formatPrice(totalRealizado)} <span style={{ color: 'var(--admin-text-faded)' }}>recebido</span>
                {' · '}
                <span style={{ color: '#EF4444' }}>− {formatPrice(totalExpenses)}</span>{' '}
                <span style={{ color: 'var(--admin-text-faded)' }}>despesas</span>
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold flex-shrink-0" style={{ color: 'var(--admin-accent)' }}>
              Despesas
              <IconChevronRight size={14} />
            </div>
          </div>
        </Link>
      )}

      {/* Card de Taxas · Líquido — só se houve fees descontadas */}
      {totalTaxas > 0 && (
        <div
          className="rounded-2xl p-4 grid grid-cols-3 gap-3 text-center"
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
              Bruto
            </p>
            <p className="text-base font-bold tabular-nums mt-1" style={{ color: 'var(--admin-text)' }}>
              {formatPrice(totalRealizado)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
              Taxas
            </p>
            <p className="text-base font-bold tabular-nums mt-1" style={{ color: 'var(--admin-danger,#EF4444)' }}>
              − {formatPrice(totalTaxas)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
              Líquido
            </p>
            <p className="text-base font-bold tabular-nums mt-1" style={{ color: 'var(--admin-success,#10B981)' }}>
              {formatPrice(totalLiquido)}
            </p>
          </div>
        </div>
      )}

      {/* Breakdown por método de pagamento — só os que tem valor.
          Antes mostrava 4 cards mesmo com 3 zerados, ocupando metade
          da tela com info inútil. Se admin quer ver o resto, expande. */}
      {totalRealizado > 0 && (
        <MethodBreakdown byMethod={byMethod} />
      )}

      {/* Comissão por profissional (só se relevante) */}
      {showCommission && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
              Comissão por profissional
            </h2>
            {(() => {
              const totalComissao = profList.reduce(
                (sum, p) => sum + p.total * (p.commission_percentage / 100),
                0
              )
              if (totalComissao <= 0) return null
              return (
                <span className="text-[11px] tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>
                  {profList.length} prof.{profList.length === 1 ? '' : 's'} ·{' '}
                  <strong style={{ color: 'var(--admin-success, #10B981)' }}>
                    {formatPrice(totalComissao)}
                  </strong>
                </span>
              )
            })()}
          </div>
          <div className="space-y-2">
            {profList.map((prof) => {
              const commission = prof.total * (prof.commission_percentage / 100)
              return (
                <div key={prof.id} className="admin-card p-3.5">
                  <div className="flex items-center gap-3 mb-2.5">
                    <span
                      aria-hidden
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                      style={{
                        background: avatarGradient(prof.name),
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
                      }}
                    >
                      {initialsFor(prof.name)}
                    </span>
                    <p className="font-semibold text-sm flex-1 truncate" style={{ color: 'var(--admin-text)' }}>
                      {prof.name}
                    </p>
                    <span
                      className="text-[10px] font-bold px-2 py-1 rounded-full"
                      style={{
                        background: 'var(--admin-accent-bg)',
                        color: 'var(--admin-accent)',
                        border: '1px solid var(--admin-accent-border)',
                      }}
                    >
                      {prof.commission_percentage}%
                    </span>
                  </div>
                  <div
                    className="grid grid-cols-3 gap-2 pt-2.5"
                    style={{ borderTop: '1px solid var(--admin-divider)' }}
                  >
                    <ProfStat label="Faturou" value={formatPrice(prof.total)} />
                    <ProfStat label="Atendimentos" value={`${prof.count}`} />
                    <ProfStat label="Comissão" value={formatPrice(commission)} highlight />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Lista de agendamentos */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
          Agendamentos · {PERIODO_LABEL[periodo]}
        </h2>
        <FinanceAppointmentList items={rows} />
      </section>

      {/* Mais ações: subpáginas + export */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
          Mais
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/admin/financeiro/despesas"
            className="admin-card p-3 flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
              <span className="text-base font-bold">−</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--admin-text)' }}>
                Despesas
              </p>
              <p className="text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>
                Aluguel, produtos, salários
              </p>
            </div>
          </Link>

          <Link
            href="/admin/financeiro/cancelados"
            className="admin-card p-3 flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(148,163,184,0.18)', color: '#64748B' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--admin-text)' }}>
                Cancelados
              </p>
              <p className="text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>
                Cobrar tarifa / remarcar
              </p>
            </div>
          </Link>

          <Link
            href="/admin/financeiro/analises"
            className="admin-card p-3 flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(168,85,247,0.18)', color: '#A855F7' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--admin-text)' }}>
                Análises
              </p>
              <p className="text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>
                Gráficos, tendências, insights
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* FAB — ação rápida principal: adicionar despesa.
          Posicionado acima da BottomNav (~80px) com safe-area-inset.
          Z-50 fica abaixo de modais (z-100) mas acima do conteúdo. */}
      <Link
        href="/admin/financeiro/despesas"
        aria-label="Adicionar despesa"
        className="fixed z-40 right-4 flex items-center gap-2 px-4 h-12 rounded-full font-semibold text-sm transition-all active:scale-95"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
          background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
          color: '#fff',
          boxShadow: '0 10px 28px -8px rgba(59,130,246,0.5), 0 4px 12px -4px rgba(0,0,0,0.2)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Despesa
      </Link>
    </div>
  )
}

function KpiTile({
  label,
  value,
  sub,
  icon,
  tone,
  subTone = 'neutral',
}: {
  label: string
  value: string
  sub: string
  icon?: React.ReactNode
  tone: 'warn' | 'neutral' | 'accent'
  subTone?: 'neutral' | 'warn'
}) {
  const colorMap = {
    warn: 'var(--admin-warn)',
    neutral: 'var(--admin-text)',
    accent: 'var(--admin-accent)',
  }
  return (
    <div className="admin-card p-2.5">
      <div className="flex items-center gap-1 mb-0.5" style={{ color: 'var(--admin-text-faded)' }}>
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-wider truncate">
          {label}
        </p>
      </div>
      <p className="text-sm font-bold leading-tight tabular-nums truncate" style={{ color: colorMap[tone] }}>
        {value}
      </p>
      <p
        className="text-[10px] mt-1 truncate"
        style={{
          color: subTone === 'warn' ? 'var(--admin-warn)' : 'var(--admin-text-faded)',
          fontWeight: subTone === 'warn' ? 700 : 400,
        }}
      >
        {sub}
      </p>
    </div>
  )
}

/**
 * Sparkline minimalista — SVG inline, sem libs externas. Pega array
 * de valores e desenha linha + área preenchida sutil. Pra contexto
 * visual rápido nos KPIs principais (tendência, não exato).
 */
function Sparkline({
  values,
  color,
  className = '',
  height = 28,
}: {
  values: number[]
  color: string
  className?: string
  height?: number
}) {
  if (values.length < 2) return null
  const max = Math.max(...values, 1)
  const w = 100 // viewBox width fixo, escala via preserveAspectRatio
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = height - (v / max) * (height - 4) - 2
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  // Path de área (line + fechamento até bottom)
  const areaPath =
    `M0,${height} L` +
    points.replace(/ /g, ' L') +
    ` L${w},${height} Z`
  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block' }}
      aria-hidden
    >
      <path d={areaPath} fill={color} opacity="0.15" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/**
 * Breakdown de métodos de pagamento, mostrando só os com valor > 0.
 * Antes mostrava 4 cards mesmo com 3 zerados — desperdício de tela.
 * Se admin quiser ver os zerados, "Ver outros métodos" expande.
 */
type MethodTotals = { gross: number; fees: number; count: number }

function MethodBreakdown({
  byMethod,
}: {
  byMethod: Record<'pix' | 'cash' | 'card_credit' | 'card_debit' | 'card_other' | 'courtesy', MethodTotals>
}) {
  const all = [
    { key: 'pix' as const,         label: 'PIX',             letter: 'P', color: '#10B981' },
    { key: 'cash' as const,        label: 'Dinheiro',        letter: '$', color: '#16A34A' },
    { key: 'card_credit' as const, label: 'Cartão crédito',  letter: 'C', color: '#3B82F6' },
    { key: 'card_debit' as const,  label: 'Cartão débito',   letter: 'D', color: '#0EA5E9' },
    { key: 'card_other' as const,  label: 'Cartão (outro)',  letter: 'C', color: '#6366F1' },
    { key: 'courtesy' as const,    label: 'Cortesia',        letter: '•', color: '#A855F7' },
  ]
  const ativos = all.filter((m) => byMethod[m.key].gross > 0)
  const zerados = all.filter((m) => byMethod[m.key].gross === 0)

  if (ativos.length === 0) return null

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
        Recebido por método
      </h2>
      <div className="grid grid-cols-1 gap-2">
        {ativos.map((m) => (
          <MethodTile
            key={m.key}
            label={m.label}
            totals={byMethod[m.key]}
            letter={m.letter}
            color={m.color}
            isCourtesy={m.key === 'courtesy'}
          />
        ))}
      </div>
      {zerados.length > 0 && (
        <details className="mt-2">
          <summary
            className="cursor-pointer text-[11px] font-semibold py-1.5 px-2 rounded-lg"
            style={{ color: 'var(--admin-text-faded)' }}
          >
            Ver {zerados.length} método{zerados.length === 1 ? '' : 's'} sem recebimento
          </summary>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {zerados.map((m) => (
              <MethodTile
                key={m.key}
                label={m.label}
                totals={byMethod[m.key]}
                letter={m.letter}
                color={m.color}
                isCourtesy={m.key === 'courtesy'}
              />
            ))}
          </div>
        </details>
      )}
    </section>
  )
}

function MethodTile({
  label,
  totals,
  letter,
  color,
  isCourtesy = false,
}: {
  label: string
  totals: MethodTotals
  letter: string
  color: string
  isCourtesy?: boolean
}) {
  const has = totals.gross > 0
  const net = totals.gross - totals.fees
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  return (
    <div
      className="admin-card p-3"
      style={{ opacity: has ? 1 : 0.55 }}
    >
      <div className="flex items-center gap-3">
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
          style={{ background: `${color}1F`, color }}
        >
          {letter}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider truncate" style={{ color: 'var(--admin-text-faded)' }}>
            {label} {totals.count > 0 && `· ${totals.count}`}
          </p>
          <p className="text-sm font-bold tabular-nums leading-tight" style={{ color: 'var(--admin-text)' }}>
            {fmt(totals.gross)}
          </p>
        </div>
      </div>
      {has && !isCourtesy && totals.fees > 0 && (
        <div
          className="mt-2 pt-2 border-t flex justify-between text-[11px] tabular-nums"
          style={{ borderColor: 'var(--admin-divider)' }}
        >
          <span style={{ color: 'var(--admin-danger,#EF4444)' }}>− {fmt(totals.fees)} taxa</span>
          <span style={{ color: 'var(--admin-success,#10B981)' }}>{fmt(net)} líquido</span>
        </div>
      )}
    </div>
  )
}

function ProfStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
        {label}
      </p>
      <p
        className="font-bold text-sm mt-0.5 tabular-nums leading-tight"
        style={{ color: highlight ? 'var(--admin-success)' : 'var(--admin-text)' }}
      >
        {value}
      </p>
    </div>
  )
}
