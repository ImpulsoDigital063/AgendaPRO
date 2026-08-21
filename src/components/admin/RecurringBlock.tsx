'use client'

/**
 * Bloco "Repetir atendimento" — usado no modal do desktop e no formulário do
 * mobile/recepção. Extraído do AgendarModal em 20/08/2026 (item 6 do CAF).
 * Aparência e comportamento idênticos ao original.
 */

import { buildRecurringDates, buildRecurringDatesByWeekdays, DIAS_SEMANA, type FreqRecorrencia } from '@/lib/recorrencia'

export default function RecurringBlock({
  enabled,
  onToggle,
  freq,
  onChangeFreq,
  count,
  onChangeCount,
  startDate,
  weekdays,
  onChangeWeekdays,
}: {
  enabled: boolean
  onToggle: (v: boolean) => void
  freq: FreqRecorrencia
  onChangeFreq: (f: FreqRecorrencia) => void
  count: number
  onChangeCount: (n: number) => void
  startDate: string
  /** Dias da semana escolhidos (0=dom … 6=sáb). undefined = recurso desligado
   *  pra esse negócio, e o bloco nem mostra a opção. */
  weekdays?: number[]
  onChangeWeekdays?: (dias: number[]) => void
}) {
  const podeEscolherDias = Array.isArray(weekdays) && typeof onChangeWeekdays === 'function'
  const porDiasDaSemana = podeEscolherDias && weekdays!.length > 0
  const dates = enabled && startDate
    ? porDiasDaSemana
      ? buildRecurringDatesByWeekdays(startDate, weekdays!, Math.max(1, Math.min(count, 52)))
      : buildRecurringDates(startDate, freq, Math.max(1, Math.min(count, 52)))
    : []

  function alternarDia(d: number) {
    if (!onChangeWeekdays || !weekdays) return
    onChangeWeekdays(weekdays.includes(d) ? weekdays.filter((x) => x !== d) : [...weekdays, d].sort())
  }
  return (
    <div
      className="rounded-2xl p-3 space-y-3"
      style={{
        background: 'var(--admin-surface-hi)',
        border: enabled ? '1px solid color-mix(in srgb, var(--admin-accent) 40%, transparent)' : '1px solid var(--admin-border)',
      }}
    >
      <label className="flex items-center justify-between cursor-pointer">
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
            Repetir atendimento
          </p>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
            Cliente que marca toda semana, mês, etc
          </p>
        </div>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="w-5 h-5 cursor-pointer"
        />
      </label>

      {enabled && (
        <div className="space-y-3">
          {podeEscolherDias && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                Dias da semana
              </label>
              <div className="flex gap-1">
                {DIAS_SEMANA.map((rotulo, dia) => {
                  const on = weekdays!.includes(dia)
                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => alternarDia(dia)}
                      className="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                      style={{
                        background: on ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
                        color: on ? '#fff' : 'var(--admin-text-2)',
                        border: '1px solid var(--admin-border)',
                      }}
                    >
                      {rotulo}
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                {porDiasDaSemana
                  ? 'Marca nesses dias, sempre no mesmo horário, até fechar as sessões.'
                  : 'Sem escolher dia, repete no mesmo dia da semana da primeira data.'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div style={{ display: porDiasDaSemana ? 'none' : undefined }}>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                Frequência
              </label>
              <select
                value={freq}
                onChange={(e) => onChangeFreq(e.target.value as FreqRecorrencia)}
                className="w-full px-2.5 py-2 pr-8 rounded-lg text-sm"
                style={{
                  background: `var(--admin-input-bg) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>") no-repeat right 0.625rem center`,
                  border: '1px solid var(--admin-border)',
                  color: 'var(--admin-text)',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                }}
              >
                <option value="weekly">Toda semana</option>
                <option value="biweekly">A cada 2 semanas</option>
                <option value="monthly">Todo mês</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                {porDiasDaSemana ? 'Total de sessões' : 'Quantidade (inclui hoje)'}
              </label>
              <input
                type="number"
                min={2}
                max={52}
                value={count}
                onChange={(e) => onChangeCount(Math.max(2, Math.min(52, parseInt(e.target.value, 10) || 2)))}
                className="admin-input w-full px-2.5 py-2 rounded-lg text-sm tabular-nums"
              />
            </div>
          </div>

          {dates.length > 0 && (
            <div
              className="rounded-lg p-2.5 text-[11px] space-y-1"
              style={{
                background: 'var(--admin-input-bg)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <p className="font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)', fontSize: 10 }}>
                Vai criar {dates.length} agendamento{dates.length !== 1 ? 's' : ''}
              </p>
              <p style={{ color: 'var(--admin-text-2)' }}>
                {dates.slice(0, 6).map((d) => {
                  const dt = new Date(d + 'T12:00:00')
                  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                }).join(' · ')}
                {dates.length > 6 && ` · ... +${dates.length - 6}`}
              </p>
              <p className="italic" style={{ color: 'var(--admin-text-faded)' }}>
                Se algum horário estiver ocupado o sistema avisa qual.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
