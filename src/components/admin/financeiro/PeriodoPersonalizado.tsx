'use client'

/**
 * Período personalizado do Financeiro — pedido da Letícia (Viva Cacheada).
 *
 * v2 (13/09/2026, depois do print do Eduardo): a 1ª versão usava dois campos
 * `type="date"` num painel ancorado no botão. No celular o painel abria pra
 * fora da tela (aparecia só "DE" e "Aplicar" cortados) e o rótulo estourava a
 * barra. Agora é **calendário de verdade**: clica no dia inicial, clica no
 * final, o intervalo fica marcado — dentro de uma janela sobre a tela (mesmo
 * padrão dos outros modais do painel), que não tem como ser cortada.
 *
 * λ.fuso: nada de `new Date()` cru nem `setHours` pra montar dia. Tudo sai de
 * string YYYY-MM-DD e de `date-br.ts`; quando precisa virar Date pra pegar o
 * dia da semana, ancora ao meio-dia UTC.
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname } from 'next/navigation'
import { todayBR, monthBoundsBR, formatDateBR } from '@/lib/date-br'
import { IconCalendar, IconChevronLeft, IconChevronRight, IconClose } from '@/components/ui/Icon'

/** Mesmo teto do servidor (financeiro/page.tsx): janela maior cai no padrão. */
const MAX_DIAS = 366

const DIAS_CURTOS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

type Props = {
  de?: string
  ate?: string
  ativo: boolean
  estilo: 'aba' | 'pilula'
}

/** Dia da semana (0=Dom) de um YYYY-MM-DD, ancorado ao meio-dia UTC. */
function diaDaSemana(ymd: string): number {
  return new Date(ymd + 'T12:00:00Z').getUTCDay()
}

/** Soma meses a um YYYY-MM. */
function mesVizinho(ym: string, delta: number): string {
  const ano = Number(ym.slice(0, 4))
  const mes = Number(ym.slice(5, 7)) - 1 + delta
  const anoAlvo = ano + Math.floor(mes / 12)
  const mesAlvo = ((mes % 12) + 12) % 12
  return `${anoAlvo}-${String(mesAlvo + 1).padStart(2, '0')}`
}

function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000) + 1
}

export default function PeriodoPersonalizado({ de, ate, ativo, estilo }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const hoje = todayBR()

  const [aberto, setAberto] = useState(false)
  const [mesVisivel, setMesVisivel] = useState((de ?? hoje).slice(0, 7))
  const [inicio, setInicio] = useState<string | null>(de ?? null)
  const [fim, setFim] = useState<string | null>(ate ?? null)
  const [portalPronto, setPortalPronto] = useState(false)

  useEffect(() => { setPortalPronto(true) }, [])

  useEffect(() => {
    if (!aberto) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [aberto])

  function abrir() {
    setInicio(de ?? null)
    setFim(ate ?? null)
    setMesVisivel((de ?? hoje).slice(0, 7))
    setAberto(true)
  }

  /** 1º clique marca o início; 2º fecha o intervalo. Clique antes do início
   *  recomeça dali — é o que a pessoa quer dizer ao voltar no calendário. */
  function escolherDia(dia: string) {
    if (dia > hoje) return
    if (!inicio || fim) { setInicio(dia); setFim(null); return }
    if (dia < inicio) { setInicio(dia); return }
    setFim(dia)
  }

  const total = inicio && fim ? diasEntre(inicio, fim) : 0
  const longoDemais = total > MAX_DIAS
  const podeAplicar = !!inicio && !!fim && !longoDemais

  function aplicar() {
    if (!podeAplicar) return
    router.push(`${pathname}?periodo=custom&de=${inicio}&ate=${fim}`)
    setAberto(false)
  }

  function limpar() {
    setInicio(null)
    setFim(null)
    router.push(pathname)
    setAberto(false)
  }

  // ── Botão na barra ────────────────────────────────────────────────────────
  // Rótulo curto de propósito: no celular a barra tem 4 itens e o texto longo
  // empurrava o último pra fora da tela (print do Eduardo, 13/09).
  const rotulo = ativo && de && ate ? `${de.slice(8, 10)}/${de.slice(5, 7)}–${ate.slice(8, 10)}/${ate.slice(5, 7)}` : 'Período'

  const classeBotao =
    estilo === 'aba'
      ? 'w-full py-2 text-[13px] sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1 truncate'
      : 'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap'

  const estiloBotao = ativo
    ? estilo === 'aba'
      ? {
          background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
          color: '#fff',
          boxShadow: '0 6px 14px rgba(59,130,246,0.3)',
        }
      : { background: 'var(--admin-accent)', color: '#fff' }
    : { background: 'transparent', color: 'var(--admin-text-mute)' }

  // ── Grade do mês ──────────────────────────────────────────────────────────
  const { start: primeiroDia, end: ultimoDia } = monthBoundsBR(mesVisivel)
  const vazios = diaDaSemana(primeiroDia)
  const totalDias = Number(ultimoDia.slice(8, 10))
  const celulas: (string | null)[] = [
    ...Array(vazios).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => `${mesVisivel}-${String(i + 1).padStart(2, '0')}`),
  ]

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={() => setAberto(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
          maxHeight: '90vh',
        }}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between p-5 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--admin-text-faded)' }}>
              Escolher período
            </p>
            <h3 className="text-base font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
              {inicio && fim
                ? `${formatDateBR(inicio)} a ${formatDateBR(fim)}`
                : inicio
                  ? `${formatDateBR(inicio)} — escolha o dia final`
                  : 'Toque no primeiro dia'}
            </h3>
            {inicio && fim && (
              <p className="text-xs mt-0.5" style={{ color: longoDemais ? '#DC2626' : 'var(--admin-text-mute)' }}>
                {longoDemais ? `Máximo de ${MAX_DIAS} dias` : `${total} ${total === 1 ? 'dia' : 'dias'}`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ color: 'var(--admin-text-mute)' }}
            aria-label="Fechar"
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Calendário */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setMesVisivel(mesVizinho(mesVisivel, -1))}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--admin-surface-hi)', color: 'var(--admin-text)' }}
              aria-label="Mês anterior"
            >
              <IconChevronLeft size={16} />
            </button>
            <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
              {MESES[Number(mesVisivel.slice(5, 7)) - 1]} {mesVisivel.slice(0, 4)}
            </p>
            <button
              type="button"
              onClick={() => setMesVisivel(mesVizinho(mesVisivel, 1))}
              disabled={mesVisivel >= hoje.slice(0, 7)}
              className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30"
              style={{ background: 'var(--admin-surface-hi)', color: 'var(--admin-text)' }}
              aria-label="Próximo mês"
            >
              <IconChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DIAS_CURTOS.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-bold uppercase py-1" style={{ color: 'var(--admin-text-faded)' }}>
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {celulas.map((dia, i) => {
              if (!dia) return <div key={`v${i}`} />
              const futuro = dia > hoje
              const ehInicio = dia === inicio
              const ehFim = dia === fim
              const noMeio = !!inicio && !!fim && dia > inicio && dia < fim
              const pontas = ehInicio || ehFim
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => escolherDia(dia)}
                  disabled={futuro}
                  className="aspect-square rounded-lg text-sm font-semibold transition-all disabled:opacity-25"
                  style={{
                    background: pontas
                      ? 'var(--admin-accent)'
                      : noMeio
                        ? 'color-mix(in srgb, var(--admin-accent) 18%, transparent)'
                        : 'transparent',
                    color: pontas ? '#fff' : 'var(--admin-text)',
                    border: dia === hoje && !pontas ? '1px solid var(--admin-accent)' : '1px solid transparent',
                  }}
                >
                  {Number(dia.slice(8, 10))}
                </button>
              )
            })}
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2 p-4 pt-3 flex-shrink-0" style={{ borderTop: '1px solid var(--admin-divider)' }}>
          <button
            type="button"
            onClick={limpar}
            className="px-4 py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'transparent', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }}
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={aplicar}
            disabled={!podeAplicar}
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{
              background: podeAplicar ? 'var(--admin-accent)' : 'var(--admin-surface-hi)',
              color: podeAplicar ? '#fff' : 'var(--admin-text-faded)',
            }}
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className={estilo === 'aba' ? 'flex-1 min-w-0' : ''}>
      <button type="button" onClick={abrir} className={classeBotao} style={estiloBotao}>
        <IconCalendar size={14} />
        <span className="truncate">{rotulo}</span>
      </button>
      {aberto && portalPronto && createPortal(modal, document.body)}
    </div>
  )
}
