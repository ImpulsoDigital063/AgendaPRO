'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { IconChevronLeft, IconChevronRight, IconPlus, IconDollar, IconCheck, IconClock, IconCalendar, IconGift } from '@/components/ui/Icon'
import { todayBR } from '@/lib/date-br'
import { PACOTE_ENABLED } from '@/lib/feature-flags'
import CalendarioMesModal from './CalendarioMesModal'
import CalendarioMesLateral from './CalendarioMesLateral'
import { useAgendaTelaCheia } from './useAgendaTelaCheia'

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
  /** v98d · esconde as ações de caixa/estoque (Vender produto · Resgatar pacote ·
   *  Registrar venda), deixando só navegação de dia + Agendar. Usado no painel
   *  da profissional, que não opera caixa. Default false = admin e recepção
   *  seguem com todos os botões. */
  hideCaixaActions?: boolean
  /** v145 · false = esconde o botão Agendar (grade só de leitura) */
  podeAgendar?: boolean
  /**
   * Negócio vende produto no balcão (v141 · 27/08/2026).
   *
   * FALSE esconde só o "Registrar venda" — clínica que presta serviço e não
   * vende nada tinha um botão verde e grande oferecendo o que ela não faz.
   * Pedido do Gustavo (CAF) via Eduardo. "Resgatar pacote" fica: ele não usa
   * hoje mas pode passar a usar, e tem gate próprio.
   */
  vendasBalcao?: boolean
  /** Filtros de coluna da grade · repassados pro calendário do mês contar
   *  só o que aparece ao abrir o dia (aba Eu / painel da profissional). */
  onlyProfessionalId?: string
  excludeProfessionalIds?: string[]
  /** Tela cheia (04/11/2026) · mostra o botão "Tela cheia". Só /admin e /recepcao. */
  permiteTelaCheia?: boolean
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

/** Área que está hospedando a grade · v98d somou /profissional às duas antigas. */
function areaBasePath(pathname: string): string {
  if (pathname.startsWith('/recepcao')) return '/recepcao'
  if (pathname.startsWith('/profissional')) return '/profissional'
  return '/admin'
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

/* Versão curta pro celular (31/08/2026): "seg, 31 de ago" no lugar de
   "segunda-feira, 31 de agosto". Na linha de controles de um aparelho de
   363px sobram ~150px pra data — o formato longo truncaria em
   "segunda-feira, 31 d…", que informa menos que a forma curta inteira. */
function formatDateCurto(date: string): string {
  const d = new Date(date + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

/* Tela cheia no celular (04/11/2026): "qua., 04/11". A linha única tem Hoje,
   ‹ ›, a data e Sair; "Qua., 04 De Nov." truncava em 390px. */
function formatDateMini(date: string): string {
  const d = new Date(date + 'T12:00:00')
  const dia = d.toLocaleDateString('pt-BR', { weekday: 'short' })
  return `${dia} ${date.slice(8, 10)}/${date.slice(5, 7)}`
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
  hideCaixaActions = false,
  podeAgendar = true,
  vendasBalcao = true,
  onlyProfessionalId,
  excludeProfessionalIds,
  permiteTelaCheia = false,
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
  const [mesAberto, setMesAberto] = useState(false)
  const telaCheia = useAgendaTelaCheia(permiteTelaCheia)
  const cheia = telaCheia.ativo

  function navigateTo(newDate: string) {
    const params = new URLSearchParams(searchParams)
    params.set('date', newDate)
    // GradeTimeline é usado em /admin, /recepcao E /profissional (v98d) ·
    // respeita o pathname atual pra não jogar ninguém pra rota da Adm
    router.push(`${areaBasePath(pathname)}?${params.toString()}`)
  }

  if (cheia) {
    const btnBase = 'h-11 lg:h-9 rounded-lg flex items-center justify-center flex-shrink-0'
    const btnNeutro = { background: 'var(--admin-surface)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }
    return (
      <>
        {/* TELA CHEIA · cabeçalho de 1 linha (todos os tamanhos). Alvos de 44px
            abaixo de 1024px (tablet do balcão / celular); 36px no computador. */}
        <div
          className="flex flex-nowrap items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5"
          style={{ background: 'var(--admin-surface)', borderBottom: '1px solid var(--admin-divider)' }}
        >
          <button
            type="button"
            onClick={() => navigateTo(todayBR())}
            className={`${btnBase} px-3 text-xs font-bold uppercase tracking-wider`}
            style={isCurrentDay
              ? { background: 'var(--brand-primary, #1AA9A8)', color: '#fff' }
              : btnNeutro}
          >
            Hoje
          </button>
          <button type="button" onClick={() => navigateTo(shiftDate(date, -1))} aria-label="Dia anterior" className={`${btnBase} w-11 lg:w-9`} style={btnNeutro}>
            <IconChevronLeft size={18} />
          </button>
          <button type="button" onClick={() => navigateTo(shiftDate(date, 1))} aria-label="Próximo dia" className={`${btnBase} w-11 lg:w-9`} style={btnNeutro}>
            <IconChevronRight size={18} />
          </button>

          {/* Data = botão do mês (tablet e celular). No computador o mês já
              está no painel lateral, então aqui é só texto. */}
          <button
            type="button"
            onClick={() => setMesAberto(true)}
            aria-label={`Ver agenda do mês · ${formatDate(date)}`}
            className="min-w-0 flex-1 h-11 lg:h-auto lg:pointer-events-none flex items-center gap-2 px-2 rounded-lg text-left"
          >
            <span className="lg:hidden flex-shrink-0" style={{ color: 'var(--brand-primary, #1AA9A8)' }}>
              <IconCalendar size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm sm:text-base font-bold capitalize leading-tight truncate" style={{ color: 'var(--admin-text)' }}>
                <span className="sm:hidden">{formatDateMini(date)}</span>
                <span className="hidden sm:inline">{formatDate(date)}</span>
              </span>
              <span className="block text-[11px] font-medium tabular-nums leading-tight truncate" style={{ color: 'var(--admin-text-mute)' }}>
                {totalAppts} {totalAppts === 1 ? 'agendamento' : 'agendamentos'}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={telaCheia.desligar}
            aria-label="Sair da tela cheia"
            title="Sair da tela cheia (Esc)"
            className={`${btnBase} min-w-11 lg:min-w-9 gap-1.5 px-2.5 sm:px-3 text-xs font-bold`}
            style={{ ...btnNeutro, color: 'var(--admin-text-2)' }}
          >
            <IconTelaCheia sair size={16} />
            <span className="sm:hidden">Sair</span>
            <span className="hidden sm:inline">Sair da tela cheia</span>
          </button>
        </div>

        {/* Computador (≥1024px): mês fixo à esquerda; o CSS da tela cheia
            empurra a grade 264px pra direita. */}
        <aside
          className="hidden lg:block overflow-y-auto"
          style={{
            position: 'fixed',
            top: 0,
            bottom: 0,
            left: 0,
            width: 264,
            background: 'var(--admin-surface)',
            borderRight: '1px solid var(--admin-divider)',
          }}
          aria-label="Calendário do mês"
        >
          <CalendarioMesLateral
            date={date}
            today={todayClient}
            onlyProfessionalId={onlyProfessionalId}
            excludeProfessionalIds={excludeProfessionalIds}
            onPick={navigateTo}
          />
        </aside>

        <CalendarioMesModal
          open={mesAberto}
          date={date}
          today={todayClient}
          onlyProfessionalId={onlyProfessionalId}
          excludeProfessionalIds={excludeProfessionalIds}
          onPick={(d) => { setMesAberto(false); navigateTo(d) }}
          onClose={() => setMesAberto(false)}
        />
      </>
    )
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
          ler bem antes dos controles.

          v? 31/08/2026 · SÓ NO DESKTOP a partir de agora (hidden lg:block).
          No celular esse bloco custava ~55px acima da grade, e a grade tinha
          ZERO hora visível num aparelho de 794px. A data não sumiu: ela passa
          a viver DENTRO da linha de navegação abaixo, no `lg:hidden`.
          Desktop (≥1024px) continua exatamente como o Eduardo cravou em 28/05. */}
      <div className="hidden lg:block px-1">
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

          {/* Calendário do MÊS com a quantidade de atendimentos por dia
              (Wanessa, 28/09/2026 · mobile e desktop). Era o seletor de data
              nativo: pulava pro dia, mas não mostrava onde tinha movimento —
              ela entrava dia por dia pra descobrir. */}
          <button
            type="button"
            onClick={() => setMesAberto(true)}
            aria-label="Ver agenda do mês"
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              background: 'var(--admin-surface)',
              color: 'var(--admin-text-mute)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <IconCalendar size={16} />
          </button>
          <CalendarioMesModal
            open={mesAberto}
            date={date}
            today={todayClient}
            onlyProfessionalId={onlyProfessionalId}
            excludeProfessionalIds={excludeProfessionalIds}
            onPick={(d) => { setMesAberto(false); navigateTo(d) }}
            onClose={() => setMesAberto(false)}
          />

          {/* Data no CELULAR · lg:hidden (31/08/2026).
              Substitui o bloco de título que agora só existe em desktop. Fica
              na mesma linha dos controles: economiza ~55px acima da grade, que
              num aparelho de 794px é meia hora de agenda a mais.
              min-w-0 + truncate porque em 363px, depois de Hoje/‹/›/calendário,
              sobram ~150px — sem isso a data empurraria a linha e quebraria. */}
          <div className="lg:hidden min-w-0 pl-1">
            <p
              className="text-sm font-bold capitalize leading-tight truncate"
              style={{ color: 'var(--admin-text)' }}
            >
              {formatDateCurto(date)}
            </p>
            <p
              className="text-[11px] font-medium tabular-nums leading-tight truncate"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              {totalAppts} {totalAppts === 1 ? 'agendamento' : 'agendamentos'}
            </p>
          </div>
        </div>

        {/* Botões de ação · no MOBILE dividem a linha (flex-1 cada · não estoura
            num cel de 390px); no sm+ voltam a auto-width alinhados à direita.
            Registrar venda (balcão · verde) + Agendar (marca). Eduardo 09/06. */}
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto flex-wrap sm:flex-nowrap justify-end">
          {/* Tela cheia (04/11/2026) · só a grade, pra recepção deixar aberta no
              balcão. Celular: só ícone (a linha já tem Registrar venda + Agendar). */}
          {permiteTelaCheia && (
            <button
              type="button"
              onClick={telaCheia.ligar}
              aria-label="Tela cheia"
              title="Tela cheia · só a agenda na tela"
              className="order-last sm:order-first inline-flex flex-none items-center justify-center gap-1.5 px-3 sm:px-4 rounded-xl text-sm font-bold transition-all hover:-translate-y-px"
              style={{
                minHeight: 44,
                minWidth: 44,
                background: 'color-mix(in srgb, var(--brand-primary, #1AA9A8) 12%, var(--admin-surface))',
                color: 'color-mix(in srgb, var(--brand-primary, #1AA9A8) 80%, black)',
                border: '1.5px solid var(--brand-primary, #1AA9A8)',
              }}
            >
              <IconTelaCheia size={16} />
              <span className="hidden sm:inline">Tela cheia</span>
            </button>
          )}
          {/* "Vender produto" SAIU do cabecalho (Eduardo 08/08): eram quatro
              botoes e dois faziam o mesmo verbo. O PDV agora e alcancado de
              dentro do "Registrar venda", que e onde a duvida aparece — e
              continua no menu, em Produtos. Quatro botoes lado a lado viram
              paralisia; a dona le todos antes de clicar em um. */}
          {/* Resgatar pacote → busca o cliente, mostra os pacotes ativos e abre o
              agendamento pré-preenchido (Eduardo 24/07). Gated pelo PACOTE_ENABLED. */}
          {PACOTE_ENABLED && !hideCaixaActions && (
            <Link
              href={`?resgatar=1&date=${date}`}
              className="hidden sm:inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-px"
              style={{
                minHeight: 44,
                background: 'linear-gradient(180deg, #9333EA 0%, #7C3AED 100%)',
                color: '#fff',
                borderTop: '1px solid rgba(255,255,255,0.30)',
                boxShadow: '0 8px 22px -8px rgba(124,58,237,0.55), 0 2px 4px rgba(0,0,0,0.08)',
              }}
              title="Resgatar sessão de pacote · busca o cliente e abre o agendamento pronto"
            >
              <IconGift size={14} /> Resgatar pacote
            </Link>
          )}
          {!hideCaixaActions && vendasBalcao && (
          <Link
            href={`?balcao=1&date=${date}`}
            data-tour="registrar-venda"
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
          )}

          {/* Agendar · mantém a cor da marca (brand-primary) · só Registrar venda é verde.
              v145 · some quando a grade é só de leitura (profissional que vê a
              agenda mas não marca — decisão do negócio). */}
          {podeAgendar && (
          <Link
            href={`?agendar=1&date=${date}`}
            data-tour="agendar"
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
          )}
        </div>
      </div>
    </div>
  )
}

/** Ícone de expandir (4 cantos pra fora) · `sair` = cantos pra dentro. */
function IconTelaCheia({ size = 16, sair = false }: { size?: number; sair?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {sair ? (
        <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
      ) : (
        <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
      )}
    </svg>
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
