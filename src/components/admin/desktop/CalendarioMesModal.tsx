'use client'

import { useEffect, useState } from 'react'
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

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function shiftMes(mes: string, delta: number): string {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function nomeMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export default function CalendarioMesModal({
  open, date, today, onlyProfessionalId, excludeProfessionalIds, onPick, onClose,
}: Props) {
  const [mes, setMes] = useState(date.slice(0, 7))
  const [dias, setDias] = useState<Record<string, number> | null>(null)
  const [erro, setErro] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])

  // Toda vez que abre, volta pro mês do dia que está na grade.
  useEffect(() => { if (open) setMes(date.slice(0, 7)) }, [open, date])

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
      .then((j) => { if (vivo) setDias(j.dias ?? {}) })
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
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-4 pb-6 sm:pb-4"
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
            <p className="text-base font-bold capitalize leading-tight" style={{ color: 'var(--admin-text)' }}>
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

        <div className="grid grid-cols-7 gap-1 mb-1">
          {SEMANA.map((d, i) => (
            <p key={i} className="text-center text-[10px] font-bold uppercase" style={{ color: 'var(--admin-text-faded)' }}>{d}</p>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {celulas.map((dia, i) => {
            if (dia === null) return <div key={i} />
            const iso = `${mes}-${String(dia).padStart(2, '0')}`
            const n = dias?.[iso] ?? 0
            const aberto = iso === date
            const hoje = iso === today
            return (
              <button
                key={i}
                type="button"
                onClick={() => onPick(iso)}
                className="aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-transform active:scale-95"
                style={{
                  background: aberto
                    ? 'var(--brand-primary, #1AA9A8)'
                    : n > 0
                      ? 'color-mix(in srgb, var(--brand-primary, #1AA9A8) 10%, transparent)'
                      : 'transparent',
                  border: hoje && !aberto ? '1.5px solid var(--brand-primary, #1AA9A8)' : '1px solid transparent',
                  color: aberto ? '#fff' : 'var(--admin-text)',
                }}
                aria-label={`${dia}, ${n} ${n === 1 ? 'agendamento' : 'agendamentos'}`}
              >
                <span className="text-sm font-semibold tabular-nums leading-none">{dia}</span>
                <span
                  className="text-[10px] font-bold tabular-nums leading-none"
                  style={{ color: aberto ? 'rgba(255,255,255,0.9)' : 'var(--brand-primary, #1AA9A8)', visibility: n > 0 ? 'visible' : 'hidden' }}
                >
                  {n}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
