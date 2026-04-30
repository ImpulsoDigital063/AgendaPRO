'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Professional, WorkingHours } from '@/lib/types'
import { IconCheck, IconInfo, IconClose, IconCopy } from '@/components/ui/Icon'
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
const COMMERCIAL_START = '09:00'
const COMMERCIAL_END = '18:00'
const COMMERCIAL_SLOT = 30

function formatDuration(min: number) {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

function diffHoursPerWeek(schedule: Schedule) {
  let total = 0
  for (const d of DAYS) {
    const c = schedule[d.id]
    if (!c.active) continue
    const [sh, sm] = c.start_time.split(':').map(Number)
    const [eh, em] = c.end_time.split(':').map(Number)
    const minutes = eh * 60 + em - (sh * 60 + sm)
    if (minutes > 0) total += minutes
  }
  return total / 60
}

type DayConfig = {
  active: boolean
  start_time: string
  end_time: string
  slot_duration: number
  existingId?: string
}

type Schedule = Record<number, DayConfig>

function buildSchedule(hours: WorkingHours[], professionalId: string): Schedule {
  const schedule: Schedule = {}
  DAYS.forEach(({ id }) => {
    const existing = hours.find(
      (h) => h.professional_id === professionalId && h.day_of_week === id
    )
    schedule[id] = existing
      ? {
          active: true,
          start_time: existing.start_time.slice(0, 5),
          end_time: existing.end_time.slice(0, 5),
          slot_duration: existing.slot_duration,
          existingId: existing.id,
        }
      : { active: false, start_time: '09:00', end_time: '18:00', slot_duration: 40 }
  })
  return schedule
}

function snapshot(s: Schedule): string {
  return DAYS.map(
    (d) =>
      `${d.id}:${s[d.id].active ? `${s[d.id].start_time}-${s[d.id].end_time}/${s[d.id].slot_duration}` : 'off'}`,
  ).join('|')
}

export default function HorariosTab({ professionals, initialWorkingHours }: Props) {
  const activeProfessionals = professionals.filter((p) => p.active)
  const [selectedProfId, setSelectedProfId] = useState(activeProfessionals[0]?.id ?? '')
  const [workingHours, setWorkingHours] = useState(initialWorkingHours)
  const [schedule, setSchedule] = useState<Schedule>(
    buildSchedule(initialWorkingHours, activeProfessionals[0]?.id ?? ''),
  )
  const [savedSnapshot, setSavedSnapshot] = useState<string>(() =>
    snapshot(buildSchedule(initialWorkingHours, activeProfessionals[0]?.id ?? '')),
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
    if (isActive && schedule[dayId].existingId) {
      // Confirma só se já estava salvo (pode ter agendamentos)
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

  function updateDay(dayId: number, field: keyof DayConfig, value: string | number) {
    setSchedule((prev) => ({
      ...prev,
      [dayId]: { ...prev[dayId], [field]: value },
    }))
    setSaved(false)
  }

  function applyCommercial() {
    setSchedule((prev) => {
      const next = { ...prev }
      for (const d of DAYS) {
        if (COMMERCIAL_DAYS.includes(d.id)) {
          next[d.id] = {
            ...next[d.id],
            active: true,
            start_time: COMMERCIAL_START,
            end_time: COMMERCIAL_END,
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
    // Default: marca os outros dias úteis (se origem é dia útil)
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
          ...next[dayId],
          active: true,
          start_time: src.start_time,
          end_time: src.end_time,
          slot_duration: src.slot_duration,
        }
      })
      return next
    })
    setSaved(false)
    setCopyFromDay(null)
    setCopyTargets(new Set())
  }

  async function handleSave() {
    if (!selectedProfId || saving) return
    setSaving(true)

    const newWorkingHours = [...workingHours]
    const nextSchedule: Schedule = { ...schedule }

    for (const day of DAYS) {
      const config = nextSchedule[day.id]

      if (config.active) {
        if (config.existingId) {
          await supabase
            .from('working_hours')
            .update({
              start_time: config.start_time,
              end_time: config.end_time,
              slot_duration: config.slot_duration,
            })
            .eq('id', config.existingId)
        } else {
          const { data } = await supabase
            .from('working_hours')
            .insert({
              professional_id: selectedProfId,
              day_of_week: day.id,
              start_time: config.start_time,
              end_time: config.end_time,
              slot_duration: config.slot_duration,
            })
            .select()
            .single()
          if (data) {
            newWorkingHours.push(data)
            nextSchedule[day.id] = { ...config, existingId: data.id }
          }
        }
      } else if (config.existingId) {
        await supabase.from('working_hours').delete().eq('id', config.existingId)
        const idx = newWorkingHours.findIndex((h) => h.id === config.existingId)
        if (idx >= 0) newWorkingHours.splice(idx, 1)
        nextSchedule[day.id] = { ...config, existingId: undefined }
      }
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
          className="rounded-xl px-4 py-3 text-xs leading-relaxed"
          style={{
            background: 'var(--admin-accent-bg)',
            border: '1px solid var(--admin-accent-border)',
            color: 'var(--admin-text-2)',
          }}
        >
          <strong style={{ color: 'var(--admin-accent)' }}>Intervalo</strong> é a régua de horários
          que o cliente enxerga (ex: 15min mostra 09:00, 09:15, 09:30…). A{' '}
          <strong>duração real</strong> do agendamento vem do serviço escolhido — um corte de 30min
          ocupa 2 intervalos, uma progressiva de 2h ocupa 8. O sistema bloqueia sozinho os horários
          que não cabem ou conflitam.
        </div>
      )}

      {/* Quick actions */}
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
            // Linha compacta para dias fechados
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

          // Card expandido para dias ativos
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

          return (
            <div
              key={day.id}
              className="rounded-2xl overflow-hidden transition-all duration-200"
              style={{
                background: 'var(--admin-surface)',
                border: '1px solid color-mix(in srgb, var(--admin-accent) 45%, transparent)',
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
                  className="text-xs font-medium px-2.5 py-1 rounded-lg flex-shrink-0 tabular-nums"
                  style={{
                    background: 'var(--admin-accent-bg)',
                    color: 'var(--admin-accent)',
                    border: '1px solid var(--admin-accent-border)',
                  }}
                >
                  {config.start_time} – {config.end_time}
                </span>
                <MoreActionsMenu actions={dayActions} ariaLabel={`Ações de ${day.full}`} />
              </div>

              <div className="px-4 pb-4 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      className="text-[11px] font-medium uppercase tracking-wider mb-1.5 block"
                      style={{ color: 'var(--admin-text-mute)' }}
                    >
                      Abertura
                    </label>
                    <input
                      type="time"
                      value={config.start_time}
                      onChange={(e) => updateDay(day.id, 'start_time', e.target.value)}
                      className="admin-input w-full px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label
                      className="text-[11px] font-medium uppercase tracking-wider mb-1.5 block"
                      style={{ color: 'var(--admin-text-mute)' }}
                    >
                      Fechamento
                    </label>
                    <input
                      type="time"
                      value={config.end_time}
                      onChange={(e) => updateDay(day.id, 'end_time', e.target.value)}
                      className="admin-input w-full px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="text-[11px] font-medium uppercase tracking-wider mb-1.5 block"
                    style={{ color: 'var(--admin-text-mute)' }}
                  >
                    Intervalo entre horários
                  </label>
                  <select
                    value={config.slot_duration}
                    onChange={(e) => updateDay(day.id, 'slot_duration', Number(e.target.value))}
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
          // Sólido em dark/light — admin-surface no dark é translucido
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
              {sourceConfig.start_time} – {sourceConfig.end_time} ·{' '}
              {formatDuration(sourceConfig.slot_duration)}
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
