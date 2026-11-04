'use client'

/* Calendário do mês FIXO na lateral · só na tela cheia da agenda, só ≥1024px
   (Eduardo, 04/11/2026). Mesma fonte do CalendarioMesModal
   (/api/admin/agenda/mes): dias com atendimento marcados, hoje destacado,
   toque pula a grade pra data. Tablet e celular abrem o modal pelo botão da
   data no cabeçalho. */

import { useEffect, useState } from 'react'
import { IconChevronLeft, IconChevronRight } from '@/components/ui/Icon'
import { shiftMes, nomeMes } from './CalendarioMesModal'

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

type Props = {
  date: string
  today: string | null
  onlyProfessionalId?: string
  excludeProfessionalIds?: string[]
  onPick: (date: string) => void
}

export default function CalendarioMesLateral({ date, today, onlyProfessionalId, excludeProfessionalIds, onPick }: Props) {
  const [mes, setMes] = useState(date.slice(0, 7))
  const [mesDaData, setMesDaData] = useState(date.slice(0, 7))
  // Grade trocou de mês (◀ ▶ / Hoje): o painel acompanha.
  if (date.slice(0, 7) !== mesDaData) {
    setMesDaData(date.slice(0, 7))
    setMes(date.slice(0, 7))
  }
  const [dias, setDias] = useState<Record<string, number> | null>(null)
  const [erro, setErro] = useState(false)

  const excludeKey = (excludeProfessionalIds ?? []).join(',')
  useEffect(() => {
    let vivo = true
    const qs = new URLSearchParams({ mes })
    if (onlyProfessionalId) qs.set('only', onlyProfessionalId)
    if (excludeKey) qs.set('exclude', excludeKey)
    fetch(`/api/admin/agenda/mes?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => { if (vivo) { setDias(j.dias ?? {}); setErro(false) } })
      .catch(() => { if (vivo) setErro(true) })
    return () => { vivo = false }
  }, [mes, onlyProfessionalId, excludeKey])

  const [ano, m] = mes.split('-').map(Number)
  const primeiroDow = new Date(Date.UTC(ano, m - 1, 1)).getUTCDay()
  const totalDias = new Date(Date.UTC(ano, m, 0)).getUTCDate()
  const celulas: (number | null)[] = [
    ...Array.from({ length: primeiroDow }, () => null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ]
  const totalMes = dias ? Object.values(dias).reduce((s, n) => s + n, 0) : null

  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-1">
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
          <p className="text-sm font-bold leading-tight truncate" style={{ color: 'var(--admin-text)' }}>{nomeMes(mes)}</p>
          <p className="text-[11px] font-medium tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>
            {erro ? 'Não foi possível carregar' : totalMes === null ? 'Carregando…' : `${totalMes} no mês`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMes((x) => shiftMes(x, 1))}
          aria-label="Próximo mês"
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--admin-surface)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }}
        >
          <IconChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {SEMANA.map((d, i) => (
          <p key={i} className="text-center text-[10px] font-bold uppercase" style={{ color: 'var(--admin-text-faded)' }}>{d}</p>
        ))}
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
              aria-pressed={aberto}
              aria-label={`${dia}, ${n} ${n === 1 ? 'agendamento' : 'agendamentos'}`}
              className="h-10 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-transform active:scale-95"
              style={{
                background: aberto
                  ? 'var(--brand-primary, #1AA9A8)'
                  : n > 0 ? 'color-mix(in srgb, var(--brand-primary, #1AA9A8) 10%, transparent)' : 'transparent',
                color: aberto ? '#fff' : 'var(--admin-text)',
                boxShadow: hoje && !aberto ? 'inset 0 0 0 1.5px var(--brand-primary, #1AA9A8)' : undefined,
              }}
            >
              <span className={`text-[13px] tabular-nums leading-none ${hoje ? 'font-extrabold' : 'font-semibold'}`}>{dia}</span>
              <span
                className="text-[9px] font-bold tabular-nums leading-none"
                style={{ color: aberto ? '#fff' : 'var(--brand-primary, #1AA9A8)', visibility: n > 0 ? 'visible' : 'hidden' }}
              >
                {n}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
