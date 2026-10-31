'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconChevronLeft, IconChevronRight, IconClose } from '@/components/ui/Icon'

/* Calendário do mês com a quantidade de atendimentos por dia.
   Wanessa (28/09/2026): "queria visualizar a agenda de forma ampliada, o mês
   todo, e nos dias de agendamento a quantidade. Pra eu não ter que entrar dia
   por dia pra ver se tem agendamento."

   Substitui o seletor de data nativo do ícone de calendário: pular pra uma
   data continua a um toque, e agora o toque já mostra onde tem movimento. */

type Props = {
  open: boolean
  /** Dia aberto na grade (YYYY-MM-DD) · o calendário abre no mês dele. */
  date: string
  /** Hoje em Brasília (YYYY-MM-DD) · null antes de hidratar. */
  today: string | null
  /** Mesmos filtros de coluna da grade, pra contagem bater com o dia aberto. */
  onlyProfessionalId?: string
  excludeProfessionalIds?: string[]
  onPick: (date: string) => void
  onClose: () => void
}

type ItemDia = { id: string; hora: string; servico: string; cliente: string; prof: string | null }

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function shiftMes(mes: string, delta: number): string {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function nomeMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number)
  const nome = new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return nome[0].toUpperCase() + nome.slice(1)
}

function nomeDia(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  const nome = new Date(Date.UTC(a, m - 1, d)).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  return nome[0].toUpperCase() + nome.slice(1)
}

// Serviço repetido no dia vira uma linha só: "2x Hidratação", no horário do primeiro.
function agrupar(itens: ItemDia[]) {
  const grupos = new Map<string, { servico: string; hora: string; n: number }>()
  for (const i of itens) {
    const g = grupos.get(i.servico)
    if (g) g.n += 1
    else grupos.set(i.servico, { servico: i.servico, hora: i.hora, n: 1 })
  }
  return [...grupos.values()]
}

export default function CalendarioMesModal({
  open, date, today, onlyProfessionalId, excludeProfessionalIds, onPick, onClose,
}: Props) {
  const [mes, setMes] = useState(date.slice(0, 7))
  const [dias, setDias] = useState<Record<string, number> | null>(null)
  const [itens, setItens] = useState<Record<string, ItemDia[]>>({})
  const [bloqueios, setBloqueios] = useState<Record<string, string[]>>({})
  const [google, setGoogle] = useState(false)
  // Tocar no dia mostra a lista aqui mesmo (Eduardo 31/10): sair do mês pra
  // saber o que tem no dia era o motivo de a Izanara seguir no Google.
  const [selecionado, setSelecionado] = useState<string | null>(date)
  const listaRef = useRef<HTMLDivElement>(null)
  const [erro, setErro] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])

  // Toda vez que abre, volta pro mês do dia que está na grade.
  useEffect(() => { if (open) { setMes(date.slice(0, 7)); setSelecionado(date) } }, [open, date])

  const excludeKey = (excludeProfessionalIds ?? []).join(',')
  useEffect(() => {
    if (!open) return
    let vivo = true
    setDias(null)
    setErro(false)
    const qs = new URLSearchParams({ mes })
    if (onlyProfessionalId) qs.set('only', onlyProfessionalId)
    if (excludeKey) qs.set('exclude', excludeKey)
    fetch(`/api/admin/agenda/mes?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => {
        if (!vivo) return
        setDias(j.dias ?? {})
        setItens(j.itens ?? {})
        setBloqueios(j.bloqueios ?? {})
        setGoogle(j.google === true)
      })
      .catch(() => { if (vivo) setErro(true) })
    return () => { vivo = false }
  }, [open, mes, onlyProfessionalId, excludeKey])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !portalReady) return null

  const [ano, m] = mes.split('-').map(Number)
  const primeiroDow = new Date(Date.UTC(ano, m - 1, 1)).getUTCDay()
  const totalDias = new Date(Date.UTC(ano, m, 0)).getUTCDate()
  const celulas: (number | null)[] = [
    ...Array.from({ length: primeiroDow }, () => null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ]
  const totalMes = dias ? Object.values(dias).reduce((s, n) => s + n, 0) : null
  const diaDaLista = selecionado?.startsWith(mes) ? selecionado : null
  const itensDaLista = diaDaLista ? itens[diaDaLista] ?? [] : []
  const bloqueiosDaLista = diaDaLista ? bloqueios[diaDaLista] ?? [] : []
  const refGoogle = (diaDaLista ?? `${mes}-01`).split('-').map(Number)
  const urlGoogle = `https://calendar.google.com/calendar/r/month/${refGoogle[0]}/${refGoogle[1]}/${refGoogle[2]}`

  function escolherDia(iso: string) {
    setSelecionado(iso)
    // No celular a lista fica embaixo da grade.
    requestAnimationFrame(() => listaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Agenda do mês"
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-6xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-3 sm:p-4 pb-6 sm:pb-4"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setMes((x) => shiftMes(x, -1))}
            aria-label="Mês anterior"
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--admin-surface)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }}
          >
            <IconChevronLeft size={16} />
          </button>
          <div className="text-center min-w-0">
            <p className="text-base font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
              {nomeMes(mes)}
            </p>
            <p className="text-[11px] font-medium tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>
              {erro
                ? 'Não foi possível carregar'
                : totalMes === null
                  ? 'Carregando…'
                  : `${totalMes} ${totalMes === 1 ? 'agendamento' : 'agendamentos'} no mês`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMes((x) => shiftMes(x, 1))}
              aria-label="Próximo mês"
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--admin-surface)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }}
            >
              <IconChevronRight size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              <IconClose size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-3 lg:gap-4">
        <div className="min-w-0">
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1">
          {SEMANA.map((d, i) => (
            <p key={i} className="text-center text-[10px] font-bold uppercase" style={{ color: 'var(--admin-text-faded)' }}>{d}</p>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {celulas.map((dia, i) => {
            if (dia === null) return <div key={i} />
            const iso = `${mes}-${String(dia).padStart(2, '0')}`
            const n = dias?.[iso] ?? 0
            const escolhido = iso === diaDaLista
            const hoje = iso === today
            const linhas = [
              ...(bloqueios[iso] ?? []).map((t) => ({ pc: t, cel: t.split(': ').pop() ?? t, bloqueio: true })),
              ...agrupar(itens[iso] ?? []).map((g) => {
                const nome = `${g.n > 1 ? `${g.n}x ` : ''}${g.servico}`
                return { pc: `${g.hora} ${nome}`, cel: nome, bloqueio: false }
              }),
            ]
            return (
              <button
                key={i}
                type="button"
                onClick={() => escolherDia(iso)}
                aria-pressed={escolhido}
                className="min-w-0 min-h-[76px] sm:min-h-[104px] rounded-lg sm:rounded-xl p-1 sm:p-1.5 flex flex-col gap-0.5 text-left transition-transform active:scale-95"
                style={{
                  background: n > 0 ? 'color-mix(in srgb, var(--brand-primary, #1AA9A8) 10%, transparent)' : 'transparent',
                  border: `1.5px solid ${escolhido ? 'var(--brand-primary, #1AA9A8)' : 'transparent'}`,
                  color: 'var(--admin-text)',
                }}
                aria-label={`${dia}, ${n} ${n === 1 ? 'agendamento' : 'agendamentos'}`}
              >
                <span className="flex items-center justify-between gap-1">
                  <span
                    className="text-sm font-semibold tabular-nums leading-none w-6 h-6 -ml-0.5 -mt-0.5 rounded-full flex items-center justify-center"
                    style={hoje ? { background: 'var(--brand-primary, #1AA9A8)', color: '#fff' } : undefined}
                  >
                    {dia}
                  </span>
                  <span
                    className="text-[10px] font-bold tabular-nums leading-none"
                    style={{ color: 'var(--brand-primary, #1AA9A8)', visibility: n > 0 ? 'visible' : 'hidden' }}
                  >
                    {n}
                  </span>
                </span>
                {linhas.slice(0, 3).map((l, j) => (
                  <span
                    key={j}
                    className={`${j === 2 ? 'hidden sm:block' : 'block'} truncate text-[9px] sm:text-[11px] leading-tight`}
                    style={{ color: l.bloqueio ? 'var(--admin-danger, #DC2626)' : 'var(--admin-text-2)', fontWeight: l.bloqueio ? 700 : 500 }}
                  >
                    <span className="sm:hidden">{l.cel}</span>
                    <span className="hidden sm:inline">{l.pc}</span>
                  </span>
                ))}
                {linhas.length > 3 && (
                  <span className="hidden sm:block text-[10px] font-semibold leading-tight" style={{ color: 'var(--admin-text-2)' }}>
                    +{linhas.length - 3}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        </div>

        <div ref={listaRef} className="min-w-0 flex flex-col gap-2">
          {diaDaLista ? (
            <>
              <p className="text-sm font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>{nomeDia(diaDaLista)}</p>
              {bloqueiosDaLista.map((t) => (
                <p key={t} className="text-xs font-bold" style={{ color: 'var(--admin-danger, #DC2626)' }}>{t}</p>
              ))}
              {itensDaLista.length === 0 && bloqueiosDaLista.length === 0 && (
                <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>Nenhum atendimento neste dia.</p>
              )}
              {itensDaLista.map((i) => (
                <div key={i.id} className="rounded-xl px-3 py-2" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
                  <p className="text-sm font-semibold break-words" style={{ color: 'var(--admin-text)' }}>
                    <span className="tabular-nums">{i.hora}</span> · {i.servico}
                  </p>
                  <p className="text-xs break-words" style={{ color: 'var(--admin-text-mute)' }}>
                    {i.cliente}{i.prof ? ` · ${i.prof}` : ''}
                  </p>
                </div>
              ))}
              <button
                type="button"
                onClick={() => onPick(diaDaLista)}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: 'var(--brand-primary, #1AA9A8)' }}
              >
                Abrir este dia na agenda
              </button>
            </>
          ) : (
            <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>Toque em um dia para ver os atendimentos.</p>
          )}
          {google && (
            <a
              href={urlGoogle}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-center"
              style={{ background: 'var(--admin-surface)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
            >
              Abrir no Google Agenda
            </a>
          )}
        </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
