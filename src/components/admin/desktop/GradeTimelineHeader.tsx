'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { IconChevronLeft, IconChevronRight, IconPlus, IconDollar, IconCheck, IconClock, IconCalendar } from '@/components/ui/Icon'
import { todayBR } from '@/lib/date-br'

type Props = {
  date: string // YYYY-MM-DD
  totalAppts: number
  /** Recebido hoje (R$) · soma dos paid_at != null */
  recebidoHoje?: number
  /** A receber hoje (R$) · soma dos confirmed/completed sem paid_at */
  aReceberHoje?: number
  /** Pendentes hoje (count) · status = pending */
  pendentesHoje?: number
  /** Quando true, oculta a linha de mini-KPIs (Recebido/A receber/Pendentes).
   *  Usado no Início, onde os mesmos KPIs já são renderizados pelo KPIsRow
   *  com 4 cards horizontais — duplicar polui visualmente. */
  hideKpis?: boolean
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function shiftDate(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatDate(date: string): string {
  const d = new Date(date + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

// CIC Onda 5C P0 #1: chamar `new Date()` direto no render causava
// React #418 (hydration mismatch) quando servidor (UTC) e browser (BR)
// estavam em dias diferentes na virada da meia-noite. Agora usa state
// + useEffect — server renderiza false, client hidrata e atualiza.

export default function GradeTimelineHeader({
  date,
  totalAppts,
  recebidoHoje = 0,
  aReceberHoje = 0,
  pendentesHoje = 0,
  hideKpis = false,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // todayClient só preenche após hidratação · evita mismatch SSR
  const [todayClient, setTodayClient] = useState<string | null>(null)
  useEffect(() => {
    setTodayClient(todayBR())
  }, [])
  const isCurrentDay = todayClient !== null && date === todayClient

  function navigateTo(newDate: string) {
    const params = new URLSearchParams(searchParams)
    params.set('date', newDate)
    // GradeTimeline agora é usado em /admin E /recepcao · respeita pathname atual
    // pra não jogar recep pra rota da Adm
    const basePath = pathname.startsWith('/recepcao') ? '/recepcao' : '/admin'
    router.push(`${basePath}?${params.toString()}`)
  }

  return (
    <div className="mb-4 space-y-3">
      {/* Mini KPIs do dia · padrão 3D premium · só renderiza se for HOJE
          E não estiver com hideKpis (caso da Home, que já tem KPIsRow em cima) */}
      {!hideKpis && isCurrentDay && (
        <div className="grid grid-cols-3 gap-2">
          <MiniKPI
            label="Recebido"
            value={formatBRL(recebidoHoje)}
            color="#10B981"
            colorDark="#059669"
            Icon={IconDollar}
          />
          <MiniKPI
            label="A receber"
            value={formatBRL(aReceberHoje)}
            color="#1AA9A8"
            colorDark="#0E7C7B"
            Icon={IconCheck}
          />
          <MiniKPI
            label="Pendentes"
            value={pendentesHoje.toString()}
            color="#F59E0B"
            colorDark="#D97706"
            Icon={IconClock}
            pulse={pendentesHoje > 0}
          />
        </div>
      )}

      {/* Data como título · acima da linha de navegação
          Cravado 28/05 Eduardo: "a data reposiciona em cima" pra tablet
          ler bem antes dos controles */}
      <div className="px-1">
        <p
          className="text-base sm:text-lg font-bold capitalize leading-tight"
          style={{ color: 'var(--admin-text)' }}
        >
          {formatDate(date)}
        </p>
        <p
          className="text-xs font-medium tabular-nums mt-0.5"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          {totalAppts} {totalAppts === 1 ? 'agendamento' : 'agendamentos'}
        </p>
      </div>

      {/* Linha de controles · navegação + botão Agendar (data agora vive acima) */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigateTo(todayBR())}
            className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all hover:-translate-y-px"
            style={{
              minHeight: 36,
              ...(isCurrentDay
                ? {
                    background: 'linear-gradient(180deg, var(--brand-primary, #1AA9A8) 0%, color-mix(in srgb, var(--brand-primary, #1AA9A8) 75%, black) 100%)',
                    color: '#fff',
                    borderTop: '1px solid rgba(255,255,255,0.25)',
                    boxShadow: '0 4px 12px -2px color-mix(in srgb, var(--brand-primary, #1AA9A8) 40%, transparent)',
                  }
                : {
                    background: 'var(--admin-surface)',
                    color: 'var(--admin-text-mute)',
                    border: '1px solid var(--admin-border)',
                  }),
            }}
          >
            Hoje
          </button>
          <button
            onClick={() => navigateTo(shiftDate(date, -1))}
            aria-label="Dia anterior"
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              background: 'var(--admin-surface)',
              color: 'var(--admin-text-mute)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <IconChevronLeft size={16} />
          </button>
          <button
            onClick={() => navigateTo(shiftDate(date, 1))}
            aria-label="Próximo dia"
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              background: 'var(--admin-surface)',
              color: 'var(--admin-text-mute)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <IconChevronRight size={16} />
          </button>

          {/* Calendário · pula direto pra qualquer data (date-picker nativo ·
              funciona no mobile e no desktop). O input transparente por cima do
              botão abre o seletor ao tocar. */}
          <div className="relative w-9 h-9">
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              className="w-9 h-9 rounded-lg flex items-center justify-center pointer-events-none"
              style={{
                background: 'var(--admin-surface)',
                color: 'var(--admin-text-mute)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <IconCalendar size={16} />
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => { if (e.target.value) navigateTo(e.target.value) }}
              aria-label="Escolher data no calendário"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Botões de ação · no MOBILE dividem a linha (flex-1 cada · não estoura
            num cel de 390px); no sm+ voltam a auto-width alinhados à direita.
            Registrar venda (balcão · verde) + Agendar (marca). Eduardo 09/06. */}
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto flex-wrap sm:flex-nowrap justify-end">
          {/* Vender produto → PDV direto (sem serviço/profissional). Antes o único
              caminho na agenda era "Registrar venda" (balcão), que exige serviço +
              profissional e travava a venda só de produto (Eduardo 03/07). Desktop/
              tablet só (mobile usa o atalho da tela Início). */}
          <Link
            href={`${pathname.startsWith('/recepcao') ? '/recepcao' : '/admin'}/produtos/vender`}
            className="hidden sm:inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-px"
            style={{
              minHeight: 44,
              background: 'linear-gradient(180deg, #6366F1 0%, #4F46E5 100%)',
              color: '#fff',
              borderTop: '1px solid rgba(255,255,255,0.30)',
              boxShadow: '0 8px 22px -8px rgba(79,70,229,0.55), 0 2px 4px rgba(0,0,0,0.08)',
            }}
            title="Vender produto (PDV) · balcão, sem serviço nem profissional"
          >
            <IconDollar size={14} /> Vender produto
          </Link>
          <Link
            href={`?balcao=1&date=${date}`}
            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-px"
            style={{
              minHeight: 44,
              background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
              color: '#fff',
              borderTop: '1px solid rgba(255,255,255,0.30)',
              boxShadow: '0 8px 22px -8px rgba(16,185,129,0.55), 0 2px 4px rgba(0,0,0,0.08)',
            }}
            title="Registrar venda de balcão · atende e registra agora, sem agendar"
          >
            <IconPlus size={14} /> Registrar venda
          </Link>

          {/* Agendar · mantém a cor da marca (brand-primary) · só Registrar venda é verde. */}
          <Link
            href={`?agendar=1&date=${date}`}
            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-px"
            style={{
              minHeight: 44,
              background: 'linear-gradient(180deg, var(--brand-primary, #1AA9A8) 0%, color-mix(in srgb, var(--brand-primary, #1AA9A8) 70%, black) 100%)',
              color: '#fff',
              borderTop: '1px solid rgba(255,255,255,0.25)',
              boxShadow: '0 8px 22px -8px color-mix(in srgb, var(--brand-primary, #1AA9A8) 55%, transparent), 0 2px 4px rgba(0,0,0,0.08)',
            }}
          >
            <IconPlus size={14} /> Agendar
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * Mini KPI card · padrão B-híbrido premium 3D.
 * Gradient sutil interno + border-top highlight + shadow longa colorida + hover lift.
 *
 * Exportado pra reuso em TimelineGridInteractive (cravado 28/05: Eduardo
 * pediu KPIs em cima da tabela de agendamento, não no header geral)
 */
export function MiniKPI({
  label,
  value,
  color,
  colorDark,
  Icon,
  pulse = false,
}: {
  label: string
  value: string
  color: string
  colorDark: string
  Icon: React.ComponentType<{ size?: number }>
  pulse?: boolean
}) {
  return (
    <div
      className="rounded-xl sm:rounded-2xl px-2 sm:px-3 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-2.5 transition-all hover:-translate-y-px min-w-0"
      style={{
        background: `linear-gradient(180deg, color-mix(in srgb, ${color} 8%, var(--admin-surface)) 0%, color-mix(in srgb, ${color} 14%, var(--admin-surface)) 100%)`,
        border: `1px solid color-mix(in srgb, ${color} 25%, var(--admin-border))`,
        borderTopColor: 'rgba(255,255,255,0.4)',
        boxShadow: `0 8px 22px -10px color-mix(in srgb, ${color} 35%, transparent), 0 2px 4px rgba(0,0,0,0.04)`,
      }}
    >
      <span
        className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${pulse ? 'admin-pulse-warn' : ''}`}
        style={{
          background: `linear-gradient(135deg, ${color} 0%, ${colorDark} 100%)`,
          color: '#fff',
          boxShadow: `0 4px 8px -2px color-mix(in srgb, ${colorDark} 45%, transparent), inset 0 1px 0 rgba(255,255,255,0.3)`,
        }}
      >
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider leading-none truncate" style={{ color: 'var(--admin-text-mute)' }}>
          {label}
        </p>
        <p className="text-sm sm:text-base font-extrabold tabular-nums leading-tight mt-0.5 truncate" style={{ color: 'var(--admin-text)' }}>
          {value}
        </p>
      </div>
    </div>
  )
}
