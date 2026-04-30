'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Professional, WorkingHours } from '@/lib/types'
import { IconCheck, IconInfo, IconClose, IconCopy, IconPlus } from '@/components/ui/Icon'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'
import MoreActionsMenu, { type MoreAction } from '@/components/admin/MoreActionsMenu'
import StickyActionBar from '@/components/admin/StickyActionBar'

type Props = {
  professionals: Professional[]
  initialWorkingHours: WorkingHours[]
}

const DAYS = [
  { id: 0, label: 'Dom', full: 'Domingo', short: 'D' },
  { id: 1, label: 'Seg', full: 'Segunda', short: 'S' },
  { id: 2, label: 'Ter', full: 'Terça', short: 'T' },
  { id: 3, label: 'Qua', full: 'Quarta', short: 'Q' },
  { id: 4, label: 'Qui', full: 'Quinta', short: 'Q' },
  { id: 5, label: 'Sex', full: 'Sexta', short: 'S' },
  { id: 6, label: 'Sáb', full: 'Sábado', short: 'S' },
]

const DURATIONS = [15, 20, 30, 40, 45, 60, 75, 90, 120]
const COMMERCIAL_DAYS = [1, 2, 3, 4, 5]
const COMMERCIAL_PLUS_SAT_DAYS = [1, 2, 3, 4, 5, 6]
const COMMERCIAL_START = '09:00'
const COMMERCIAL_END = '18:00'
const COMMERCIAL_SLOT = 30

function formatDuration(min: number) {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

function toMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** Soma das horas de TODOS os períodos abertos da semana */
function diffHoursPerWeek(schedule: Schedule) {
  let total = 0
  for (const d of DAYS) {
    const c = schedule[d.id]
    if (!c.active) continue
    for (const p of c.periods) {
      const minutes = toMin(p.end_time) - toMin(p.start_time)
      if (minutes > 0) total += minutes
    }
  }
  return total / 60
}

/**
 * Períodos de atendimento dentro de um dia. Antes do v31 só havia 1
 * período contínuo por dia. Agora pode ter N (manhã + tarde com pausa
 * de almoço, por exemplo).
 */
type Period = {
  start_time: string
  end_time: string
  /** ID da row em working_hours — undefined se ainda não foi salvo */
  existingId?: string
}

type DayConfig = {
  active: boolean
  periods: Period[]
  /** slot_duration é por DIA — todos os períodos do dia compartilham */
  slot_duration: number
}

type Schedule = Record<number, DayConfig>

function buildSchedule(hours: WorkingHours[], professionalId: string): Schedule {
  const schedule: Schedule = {}
  DAYS.forEach(({ id }) => {
    const dayHours = hours
      .filter((h) => h.professional_id === professionalId && h.day_of_week === id)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))

    if (dayHours.length === 0) {
      schedule[id] = {
        active: false,
        periods: [{ start_time: '09:00', end_time: '18:00' }],
        slot_duration: 40,
      }
    } else {
      schedule[id] = {
        active: true,
        periods: dayHours.map((h) => ({
          start_time: h.start_time.slice(0, 5),
          end_time: h.end_time.slice(0, 5),
          existingId: h.id,
        })),
        // Todos os períodos do dia têm o mesmo slot_duration por contrato.
        // Pega do primeiro pra refletir.
        slot_duration: dayHours[0].slot_duration,
      }
    }
  })
  return schedule
}

function snapshot(s: Schedule): string {
  return DAYS.map((d) => {
    const cfg = s[d.id]
    if (!cfg.active) return `${d.id}:off`
    const ps = cfg.periods.map((p) => `${p.start_time}-${p.end_time}`).join(',')
    return `${d.id}:${ps}/${cfg.slot_duration}`
  }).join('|')
}

/**
 * Calcula um split sugerido pra "Adicionar pausa". Pega o último
 * período e tenta cortar ao meio com 1h de pausa. Ex: 9-18 → 9-12 + 13-18.
 * Se o último período for muito curto pra cortar, adiciona um período
 * novo após o último.
 */
function suggestNewPeriodFromExisting(periods: Period[]): Period[] {
  if (periods.length === 0) {
    return [{ start_time: '09:00', end_time: '12:00' }, { start_time: '13:00', end_time: '18:00' }]
  }
  const last = periods[periods.length - 1]
  const startM = toMin(last.start_time)
  const endM = toMin(last.end_time)
  const span = endM - startM

  if (span >= 240) {
    // Período de 4h+ — corta no meio com 1h de pausa
    const middle = startM + Math.floor(span / 2)
    const pauseEnd = middle + 60
    const fmt = (m: number) =>
      `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
    const newPeriods = [...periods.slice(0, -1)]
    newPeriods.push({ start_time: last.start_time, end_time: fmt(middle) })
    newPeriods.push({ start_time: fmt(pauseEnd), end_time: last.end_time })
    return newPeriods
  }

  // Período curto — adiciona novo bloco após o atual com 1h de pausa
  const nextStartM = endM + 60
  const nextEndM = Math.min(nextStartM + 240, 22 * 60)
  const fmt = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  return [...periods, { start_time: fmt(nextStartM), end_time: fmt(nextEndM) }]
}

/** Detecta sobreposição entre períodos do mesmo dia (avisar usuário) */
function periodsOverlap(periods: Period[]): boolean {
  if (periods.length < 2) return false
  const sorted = [...periods].sort((a, b) => a.start_time.localeCompare(b.start_time))
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start_time < sorted[i - 1].end_time) return true
  }
  return false
}

export default function HorariosTab({ professionals, initialWorkingHours }: Props) {
  const activeProfessionals = professionals.filter((p) => p.active)
  const [selectedProfId, setSelectedProfId] = useState(activeProfessionals[0]?.id ?? '')
  const [workingHours, setWorkingHours] = useState(initialWorkingHours)
  const [schedule, setSchedule] = useState<Schedule>(
    buildSchedule(initialWorkingHours, activeProfessionals[0]?.id ?? '')
  )
  const [savedSnapshot, setSavedSnapshot] = useState<string>(() =>
    snapshot(buildSchedule(initialWorkingHours, activeProfessionals[0]?.id ?? ''))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const [confirmDayOff, setConfirmDayOff] = useState<number | null>(null)
  const [copyFromDay, setCopyFromDay] = useState<number | null>(null)
  const [copyTargets, setCopyTargets] = useState<Set<number>>(new Set())

  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  const isDirty = useMemo(() => snapshot(schedule) !== savedSnapshot, [schedule, savedSnapshot])

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  const openDays = DAYS.filter((d) => schedule[d.id]?.active).length
  const hoursPerWeek = diffHoursPerWeek(schedule)

  function handleSelectProf(profId: string) {
    setSelectedProfId(profId)
    const next = buildSchedule(workingHours, profId)
    setSchedule(next)
    setSavedSnapshot(snapshot(next))
    setSaved(false)
  }

  function toggleDay(dayId: number) {
    const isActive = schedule[dayId].active
    const hasExisting = schedule[dayId].periods.some((p) => p.existingId)
    if (isActive && hasExisting) {
      // Confirma só se já tinha período salvo (pode ter agendamentos)
      setConfirmDayOff(dayId)
      return
    }
    setSchedule((prev) => ({
      ...prev,
      [dayId]: { ...prev[dayId], active: !prev[dayId].active },
    }))
    setSaved(false)
  }

  function confirmDeactivate() {
    if (confirmDayOff === null) return
    setSchedule((prev) => ({
      ...prev,
      [confirmDayOff]: { ...prev[confirmDayOff], active: false },
    }))
    setSaved(false)
    setConfirmDayOff(null)
  }

  function updatePeriod(dayId: number, periodIndex: number, field: 'start_time' | 'end_time', value: string) {
    setSchedule((prev) => {
      const day = prev[dayId]
      const newPeriods = day.periods.map((p, i) => (i === periodIndex ? { ...p, [field]: value } : p))
      return { ...prev, [dayId]: { ...day, periods: newPeriods } }
    })
    setSaved(false)
  }

  function addPeriod(dayId: number) {
    setSchedule((prev) => {
      const day = prev[dayId]
      const newPeriods = suggestNewPeriodFromExisting(day.periods)
      return { ...prev, [dayId]: { ...day, periods: newPeriods } }
    })
    setSaved(false)
  }

  function removePeriod(dayId: number, periodIndex: number) {
    setSchedule((prev) => {
      const day = prev[dayId]
      if (day.periods.length <= 1) return prev // mantém pelo menos 1 periodo
      const newPeriods = day.periods.filter((_, i) => i !== periodIndex)
      return { ...prev, [dayId]: { ...day, periods: newPeriods } }
    })
    setSaved(false)
  }

  function updateSlotDuration(dayId: number, value: number) {
    setSchedule((prev) => ({
      ...prev,
      [dayId]: { ...prev[dayId], slot_duration: value },
    }))
    setSaved(false)
  }

  function applyPreset(activeDays: number[]) {
    setSchedule((prev) => {
      const next = { ...prev }
      for (const d of DAYS) {
        if (activeDays.includes(d.id)) {
          next[d.id] = {
            active: true,
            periods: [{ start_time: COMMERCIAL_START, end_time: COMMERCIAL_END }],
            slot_duration: COMMERCIAL_SLOT,
          }
        } else {
          next[d.id] = { ...next[d.id], active: false }
        }
      }
      return next
    })
    setSaved(false)
  }

  function applyCommercial() {
    applyPreset(COMMERCIAL_DAYS)
  }

  function applyCommercialSat() {
    applyPreset(COMMERCIAL_PLUS_SAT_DAYS)
  }

  function closeAll() {
    setSchedule((prev) => {
      const next = { ...prev }
      for (const d of DAYS) next[d.id] = { ...next[d.id], active: false }
      return next
    })
    setSaved(false)
  }

  function openCopyModal(dayId: number) {
    setCopyFromDay(dayId)
    const isWorkday = COMMERCIAL_DAYS.includes(dayId)
    const defaults = isWorkday
      ? new Set(COMMERCIAL_DAYS.filter((d) => d !== dayId))
      : new Set<number>()
    setCopyTargets(defaults)
  }

  function applyCopy() {
    if (copyFromDay === null) return
    const src = schedule[copyFromDay]
    setSchedule((prev) => {
      const next = { ...prev }
      copyTargets.forEach((dayId) => {
        next[dayId] = {
          active: true,
          // Copia os períodos SEM os existingId — vão virar inserts novos no save
          periods: src.periods.map((p) => ({ start_time: p.start_time, end_time: p.end_time })),
          slot_duration: src.slot_duration,
        }
      })
      return next
    })
    setSaved(false)
    setCopyFromDay(null)
    setCopyTargets(new Set())
  }

  /**
   * Save: estratégia DELETE-ALL + INSERT-NEW por dia.
   * Mais simples que reconciliar UPDATE/INSERT/DELETE quando a
   * quantidade de períodos muda. Working_hours não tem FK pra
   * appointments, então delete é seguro — agendamentos têm seu próprio
   * start_time/end_time/appointment_date independentes.
   */
  async function handleSave() {
    if (!selectedProfId || saving) return
    setSaving(true)

    const newWorkingHours: WorkingHours[] = workingHours.filter(
      (w) => w.professional_id !== selectedProfId
    )
    const nextSchedule: Schedule = { ...schedule }

    // Delete TODAS as rows desse profissional primeiro
    await supabase
      .from('working_hours')
      .delete()
      .eq('professional_id', selectedProfId)

    // Insert os novos períodos (apenas dias ativos com período válido)
    for (const day of DAYS) {
      const config = nextSchedule[day.id]
      if (!config.active) {
        nextSchedule[day.id] = {
          ...config,
          periods: config.periods.map((p) => ({ ...p, existingId: undefined })),
        }
        continue
      }

      const newPeriods: Period[] = []
      for (const period of config.periods) {
        if (period.start_time >= period.end_time) continue // pula inválidos
        const { data } = await supabase
          .from('working_hours')
          .insert({
            professional_id: selectedProfId,
            day_of_week: day.id,
            start_time: period.start_time,
            end_time: period.end_time,
            slot_duration: config.slot_duration,
          })
          .select()
          .single()

        if (data) {
          newWorkingHours.push(data)
          newPeriods.push({
            start_time: period.start_time,
            end_time: period.end_time,
            existingId: data.id,
          })
        }
      }
      nextSchedule[day.id] = { ...config, periods: newPeriods }
    }

    setWorkingHours(newWorkingHours)
    setSchedule(nextSchedule)
    setSavedSnapshot(snapshot(nextSchedule))
    setSaving(false)
    setSaved(true)

    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSaved(false), 2200)
  }

  if (activeProfessionals.length === 0) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
          Nenhum profissional ativo. Adicione um profissional primeiro.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 pb-24 relative">
      {/* Seletor de profissional */}
      {activeProfessionals.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {activeProfessionals.map((p) => {
            const isActive = selectedProfId === p.id
            return (
              <button
                key={p.id}
                onClick={() => handleSelectProf(p.id)}
                className="relative px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                style={
                  isActive
                    ? {
                        background:
                          'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
                        color: '#FFFFFF',
                        border: '1px solid transparent',
                        boxShadow:
                          '0 8px 24px -6px color-mix(in srgb, var(--admin-accent) 55%, transparent)',
                      }
                    : {
                        background: 'var(--admin-surface)',
                        color: 'var(--admin-text-2)',
                        border: '1px solid var(--admin-border)',
                      }
                }
              >
                {p.name}
              </button>
            )
          })}
        </div>
      )}

      {/* KPI compacto + Ajuda */}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div className="admin-card p-2.5">
          <p
            className="text-[10px] font-semibold uppercase tracking-wider truncate"
            style={{ color: 'var(--admin-text-faded)' }}
          >
            Disponibilidade da semana
          </p>
          <p
            className="text-sm font-bold leading-tight tabular-nums truncate mt-0.5"
            style={{ color: 'var(--admin-text)' }}
          >
            {openDays} dia{openDays === 1 ? '' : 's'} aberto{openDays === 1 ? '' : 's'} ·{' '}
            {hoursPerWeek.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h/semana
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowHelp((s) => !s)}
          className="admin-card px-3 flex items-center gap-1.5 text-xs font-semibold transition-colors"
          style={{
            color: showHelp ? 'var(--admin-accent)' : 'var(--admin-text-mute)',
          }}
          aria-expanded={showHelp}
        >
          <IconInfo size={14} />
          Como funciona
        </button>
      </div>

      {/* Texto explicativo colapsável */}
      {showHelp && (
        <div
          className="rounded-xl px-4 py-3 text-xs leading-relaxed space-y-2"
          style={{
            background: 'var(--admin-accent-bg)',
            border: '1px solid var(--admin-accent-border)',
            color: 'var(--admin-text-2)',
          }}
        >
          <p>
            <strong style={{ color: 'var(--admin-accent)' }}>Intervalo</strong> é a régua de
            horários que o cliente enxerga (ex: 30min mostra 09:00, 09:30, 10:00…). A{' '}
            <strong>duração real</strong> do agendamento vem do serviço escolhido — um corte de
            45min ocupa 1.5 intervalos.
          </p>
          <p>
            <strong style={{ color: 'var(--admin-accent)' }}>Pausa</strong> serve pra fechar o
            almoço (ex: 12-13). Adicione quantos blocos quiser por dia — manhã, tarde, noite. Os
            períodos não podem se sobrepor.
          </p>
        </div>
      )}

      {/* Quick actions — atalhos de preenchimento em massa */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={applyCommercial}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-full transition-all"
          style={{
            background: 'var(--admin-input-bg)',
            color: 'var(--admin-text-2)',
            border: '1px solid var(--admin-border)',
          }}
        >
          Comercial (Seg-Sex 9-18)
        </button>
        <button
          type="button"
          onClick={applyCommercialSat}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-full transition-all"
          style={{
            background: 'var(--admin-input-bg)',
            color: 'var(--admin-text-2)',
            border: '1px solid var(--admin-border)',
          }}
        >
          Seg-Sáb (9-18)
        </button>
        <button
          type="button"
          onClick={closeAll}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-full transition-all"
          style={{
            background: 'var(--admin-input-bg)',
            color: 'var(--admin-text-mute)',
            border: '1px solid var(--admin-border)',
          }}
        >
          Fechar tudo
        </button>
      </div>

      {/* Grade de dias */}
      <div className="space-y-2">
        {DAYS.map((day) => {
          const config = schedule[day.id]
          const isActive = config.active

          if (!isActive) {
            return (
              <div
                key={day.id}
                className="rounded-2xl px-4 py-2.5 flex items-center gap-3"
                style={{
                  background: 'var(--admin-surface)',
                  border: '1px solid var(--admin-border)',
                  opacity: 0.85,
                }}
              >
                <Toggle active={false} onClick={() => toggleDay(day.id)} dayLabel={day.full} />
                <button
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  className="flex-1 min-w-0 text-left text-sm font-semibold truncate"
                  style={{ color: 'var(--admin-text-mute)' }}
                >
                  {day.full}
                </button>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--admin-text-faded)' }}>
                  Fechado
                </span>
              </div>
            )
          }

          // Card expandido — dia ativo com 1+ períodos
          const dayActions: MoreAction[] = [
            {
              label: 'Aplicar para outros dias',
              icon: <IconCopy size={15} />,
              onClick: () => openCopyModal(day.id),
            },
            {
              label: 'Marcar como fechado',
              icon: <IconClose size={15} />,
              onClick: () => toggleDay(day.id),
              destructive: true,
              separatorAbove: true,
            },
          ]

          // Resumo do horário pra mostrar no header (todos os períodos)
          const summary = config.periods
            .map((p) => `${p.start_time}–${p.end_time}`)
            .join(' · ')

          const overlap = periodsOverlap(config.periods)

          return (
            <div
              key={day.id}
              className="rounded-2xl overflow-hidden transition-all duration-200"
              style={{
                background: 'var(--admin-surface)',
                border: overlap
                  ? '1px solid var(--admin-danger, #EF4444)'
                  : '1px solid color-mix(in srgb, var(--admin-accent) 45%, transparent)',
                boxShadow:
                  '0 6px 20px -8px color-mix(in srgb, var(--admin-accent) 35%, transparent)',
              }}
            >
              <div className="flex items-center px-4 py-3 gap-3">
                <Toggle active onClick={() => toggleDay(day.id)} dayLabel={day.full} />
                <button
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  className="flex-1 min-w-0 text-left text-sm font-semibold truncate"
                  style={{ color: 'var(--admin-text)' }}
                >
                  {day.full}
                </button>
                <span
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg flex-shrink-0 tabular-nums"
                  style={{
                    background: 'var(--admin-accent-bg)',
                    color: 'var(--admin-accent)',
                    border: '1px solid var(--admin-accent-border)',
                    maxWidth: 200,
                  }}
                  title={summary}
                >
                  {summary}
                </span>
                <MoreActionsMenu actions={dayActions} ariaLabel={`Ações de ${day.full}`} />
              </div>

              <div className="px-4 pb-4 space-y-2.5">
                {/* Períodos */}
                {config.periods.map((period, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl p-3 space-y-2"
                    style={{
                      background: 'var(--admin-input-bg)',
                      border: '1px solid var(--admin-border)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--admin-text-faded)' }}
                      >
                        {config.periods.length === 1 ? 'Horário' : `Período ${idx + 1}`}
                      </p>
                      {config.periods.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePeriod(day.id, idx)}
                          aria-label="Remover período"
                          className="p-1 rounded-md transition-opacity hover:opacity-70"
                          style={{ color: 'var(--admin-text-faded)' }}
                        >
                          <IconClose size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label
                          className="text-[10px] font-medium uppercase tracking-wider mb-1 block"
                          style={{ color: 'var(--admin-text-mute)' }}
                        >
                          Abertura
                        </label>
                        <input
                          type="time"
                          value={period.start_time}
                          onChange={(e) => updatePeriod(day.id, idx, 'start_time', e.target.value)}
                          className="admin-input w-full px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label
                          className="text-[10px] font-medium uppercase tracking-wider mb-1 block"
                          style={{ color: 'var(--admin-text-mute)' }}
                        >
                          Fechamento
                        </label>
                        <input
                          type="time"
                          value={period.end_time}
                          onChange={(e) => updatePeriod(day.id, idx, 'end_time', e.target.value)}
                          className="admin-input w-full px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Botão adicionar pausa */}
                <button
                  type="button"
                  onClick={() => addPeriod(day.id)}
                  className="w-full text-xs font-semibold py-2 rounded-xl transition-all flex items-center justify-center gap-1.5"
                  style={{
                    background: 'transparent',
                    color: 'var(--admin-accent)',
                    border: '1px dashed color-mix(in srgb, var(--admin-accent) 40%, transparent)',
                  }}
                >
                  <IconPlus size={14} />
                  Adicionar pausa (almoço, intervalo)
                </button>

                {/* Aviso se sobreposição */}
                {overlap && (
                  <p
                    className="text-[11px] px-3 py-2 rounded-lg"
                    style={{
                      background: 'color-mix(in srgb, var(--admin-danger, #EF4444) 12%, transparent)',
                      color: 'var(--admin-danger, #EF4444)',
                      border: '1px solid color-mix(in srgb, var(--admin-danger, #EF4444) 30%, transparent)',
                    }}
                  >
                    Os períodos estão sobrepostos. Ajuste antes de salvar.
                  </p>
                )}

                {/* Slot duration */}
                <div>
                  <label
                    className="text-[11px] font-medium uppercase tracking-wider mb-1.5 block"
                    style={{ color: 'var(--admin-text-mute)' }}
                  >
                    Intervalo entre horários
                  </label>
                  <select
                    value={config.slot_duration}
                    onChange={(e) => updateSlotDuration(day.id, Number(e.target.value))}
                    className="admin-input w-full px-3 py-2 text-sm"
                  >
                    {DURATIONS.map((d) => (
                      <option key={d} value={d}>
                        {formatDuration(d)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <StickyActionBar
        dirty={isDirty}
        saving={saving}
        saved={saved}
        onSave={handleSave}
        offsetBottom={72}
        saveLabel="Salvar horários"
      />

      <ConfirmActionModal
        open={confirmDayOff !== null}
        title={`Fechar ${confirmDayOff !== null ? DAYS[confirmDayOff].full : ''}?`}
        message="Os clientes deixam de ver esse dia na agenda online. Agendamentos futuros já marcados não são removidos automaticamente — vale conferir antes."
        confirmLabel="Sim, fechar"
        cancelLabel="Voltar"
        tone="warn"
        onConfirm={confirmDeactivate}
        onClose={() => setConfirmDayOff(null)}
      />

      <CopyToDaysModal
        open={copyFromDay !== null}
        sourceDay={copyFromDay !== null ? DAYS[copyFromDay] : null}
        sourceConfig={copyFromDay !== null ? schedule[copyFromDay] : null}
        targets={copyTargets}
        onToggleTarget={(dayId) => {
          setCopyTargets((prev) => {
            const next = new Set(prev)
            if (next.has(dayId)) next.delete(dayId)
            else next.add(dayId)
            return next
          })
        }}
        onApply={applyCopy}
        onClose={() => {
          setCopyFromDay(null)
          setCopyTargets(new Set())
        }}
      />
    </div>
  )
}

// =============================================================================
// Toggle reutilizado
// =============================================================================
function Toggle({
  active,
  onClick,
  dayLabel,
}: {
  active: boolean
  onClick: () => void
  dayLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
      style={
        active
          ? {
              background:
                'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
              boxShadow:
                '0 0 14px -2px color-mix(in srgb, var(--admin-accent) 65%, transparent)',
            }
          : {
              background: 'var(--admin-surface-hover)',
              border: '1px solid var(--admin-border)',
            }
      }
      aria-pressed={active}
      aria-label={`${active ? 'Desativar' : 'Ativar'} ${dayLabel}`}
    >
      <span
        className="absolute top-0.5 left-0 w-5 h-5 rounded-full shadow-md transition-transform duration-200"
        style={{
          background: '#FFFFFF',
          transform: active ? 'translateX(22px)' : 'translateX(2px)',
        }}
      />
    </button>
  )
}

// =============================================================================
// Modal de copiar pra outros dias
// =============================================================================
function CopyToDaysModal({
  open,
  sourceDay,
  sourceConfig,
  targets,
  onToggleTarget,
  onApply,
  onClose,
}: {
  open: boolean
  sourceDay: (typeof DAYS)[number] | null
  sourceConfig: DayConfig | null
  targets: Set<number>
  onToggleTarget: (dayId: number) => void
  onApply: () => void
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open || !sourceDay || !sourceConfig) return null

  const summary = sourceConfig.periods
    .map((p) => `${p.start_time}–${p.end_time}`)
    .join(' · ')

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
        }}
      >
        <div className="flex items-start justify-between p-5 pb-2">
          <div className="min-w-0">
            <h3
              className="text-base font-bold leading-tight"
              style={{ color: 'var(--admin-text)' }}
            >
              Aplicar horário de {sourceDay.full}
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
              {summary} · {formatDuration(sourceConfig.slot_duration)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 rounded-full transition-opacity hover:opacity-70"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            <IconClose size={18} />
          </button>
        </div>
        <p className="px-5 pb-3 text-xs" style={{ color: 'var(--admin-text-2)' }}>
          Selecione os dias que vão receber a mesma configuração:
        </p>
        <div className="px-5 pb-5 space-y-1.5">
          {DAYS.filter((d) => d.id !== sourceDay.id).map((d) => {
            const checked = targets.has(d.id)
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onToggleTarget(d.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left"
                style={{
                  background: checked
                    ? 'var(--admin-accent-bg)'
                    : 'var(--admin-input-bg)',
                  border: checked
                    ? '1px solid var(--admin-accent-border)'
                    : '1px solid var(--admin-border)',
                }}
              >
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{
                    background: checked
                      ? 'linear-gradient(135deg, var(--brand-primary, #3B82F6), var(--brand-secondary, #06B6D4))'
                      : 'transparent',
                    border: checked ? '1px solid transparent' : '1.5px solid var(--admin-border-hi)',
                  }}
                >
                  {checked && <IconCheck size={12} color="#FFFFFF" strokeWidth={4} />}
                </span>
                <span
                  className="font-semibold text-sm"
                  style={{ color: checked ? 'var(--admin-accent)' : 'var(--admin-text-2)' }}
                >
                  {d.full}
                </span>
              </button>
            )
          })}
        </div>
        <div
          className="flex flex-col-reverse sm:flex-row gap-2 p-4 sm:justify-end"
          style={{
            background: 'rgba(0,0,0,0.18)',
            borderTop: '1px solid var(--admin-popover-border, #E2E8F0)',
          }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{
              background: 'transparent',
              color: 'var(--admin-text-2)',
              border: '1px solid var(--admin-border)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onApply}
            disabled={targets.size === 0}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-transform hover:translate-y-[-1px] disabled:opacity-40 disabled:translate-y-0"
            style={{
              background:
                'linear-gradient(135deg, var(--brand-primary, #3B82F6), var(--brand-secondary, #06B6D4))',
              color: '#FFFFFF',
              boxShadow: '0 8px 22px -6px rgba(59,130,246,0.5)',
            }}
          >
            Aplicar em {targets.size} dia{targets.size === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  )
}
