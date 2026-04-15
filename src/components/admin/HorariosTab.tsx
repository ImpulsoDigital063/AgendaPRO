'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Professional, WorkingHours } from '@/lib/types'
import { IconCheck, IconInfo } from '@/components/ui/Icon'

type Props = {
  professionals: Professional[]
  initialWorkingHours: WorkingHours[]
}

const DAYS = [
  { id: 0, label: 'Dom', full: 'Domingo' },
  { id: 1, label: 'Seg', full: 'Segunda' },
  { id: 2, label: 'Ter', full: 'Terça' },
  { id: 3, label: 'Qua', full: 'Quarta' },
  { id: 4, label: 'Qui', full: 'Quinta' },
  { id: 5, label: 'Sex', full: 'Sexta' },
  { id: 6, label: 'Sáb', full: 'Sábado' },
]

const DURATIONS = [15, 20, 30, 40, 45, 60, 75, 90, 120]

function formatDuration(min: number) {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
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

export default function HorariosTab({ professionals, initialWorkingHours }: Props) {
  const activeProfessionals = professionals.filter((p) => p.active)
  const [selectedProfId, setSelectedProfId] = useState(activeProfessionals[0]?.id ?? '')
  const [workingHours, setWorkingHours] = useState(initialWorkingHours)
  const [schedule, setSchedule] = useState<Schedule>(
    buildSchedule(initialWorkingHours, activeProfessionals[0]?.id ?? '')
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  function handleSelectProf(profId: string) {
    setSelectedProfId(profId)
    setSchedule(buildSchedule(workingHours, profId))
    setSaved(false)
  }

  function toggleDay(dayId: number) {
    setSchedule((prev) => ({
      ...prev,
      [dayId]: { ...prev[dayId], active: !prev[dayId].active },
    }))
    setSaved(false)
  }

  function updateDay(dayId: number, field: keyof DayConfig, value: string | number) {
    setSchedule((prev) => ({
      ...prev,
      [dayId]: { ...prev[dayId], [field]: value },
    }))
    setSaved(false)
  }

  async function handleSave() {
    if (!selectedProfId) return
    setSaving(true)

    for (const day of DAYS) {
      const config = schedule[day.id]

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
            setSchedule((prev) => ({
              ...prev,
              [day.id]: { ...prev[day.id], existingId: data.id },
            }))
            setWorkingHours((prev) => [...prev, data])
          }
        }
      } else if (config.existingId) {
        await supabase.from('working_hours').delete().eq('id', config.existingId)
        setWorkingHours((prev) => prev.filter((h) => h.id !== config.existingId))
        setSchedule((prev) => ({
          ...prev,
          [day.id]: { ...prev[day.id], existingId: undefined },
        }))
      }
    }

    setSaving(false)
    setSaved(true)
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
    <div className="space-y-4">
      {/* Seletor de profissional — pills com glow */}
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
                          '0 8px 24px -6px color-mix(in srgb, var(--admin-accent) 55%, transparent), 0 0 0 1px color-mix(in srgb, var(--admin-accent) 40%, transparent) inset',
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

      {activeProfessionals.length === 1 && (
        <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
          Configurando horários de{' '}
          <strong style={{ color: 'var(--admin-text)' }}>{activeProfessionals[0].name}</strong>
        </p>
      )}

      {/* Ajuda conceitual */}
      <div
        className="rounded-xl px-4 py-3 text-xs leading-relaxed flex gap-2.5 items-start"
        style={{
          background: 'var(--admin-accent-bg)',
          border: '1px solid var(--admin-accent-border)',
          color: 'var(--admin-text-2)',
        }}
      >
        <span className="mt-0.5 flex-shrink-0" style={{ color: 'var(--admin-accent)' }}>
          <IconInfo size={14} />
        </span>
        <span>
          <strong style={{ color: 'var(--admin-accent)' }}>Intervalo</strong> é a régua de horários
          que o cliente enxerga (ex: 15min mostra 09:00, 09:15, 09:30…). A{' '}
          <strong>duração real</strong> do agendamento vem do serviço escolhido — um corte de 30min
          ocupa 2 intervalos, uma progressiva de 2h ocupa 8. O sistema bloqueia sozinho os horários
          que não cabem ou conflitam.
        </span>
      </div>

      {/* Grade de dias */}
      <div className="space-y-2">
        {DAYS.map((day) => {
          const config = schedule[day.id]
          return (
            <div
              key={day.id}
              className="relative rounded-2xl overflow-hidden transition-all duration-200"
              style={{
                background: 'var(--admin-surface)',
                border: config.active
                  ? '1px solid color-mix(in srgb, var(--admin-accent) 45%, transparent)'
                  : '1px solid var(--admin-border)',
                boxShadow: config.active
                  ? '0 6px 20px -8px color-mix(in srgb, var(--admin-accent) 35%, transparent)'
                  : 'none',
              }}
            >
              {/* Linha principal */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleDay(day.id)}
                    className="relative w-11 h-6 rounded-full transition-all duration-200"
                    style={
                      config.active
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
                    aria-pressed={config.active}
                    aria-label={`${config.active ? 'Desativar' : 'Ativar'} ${day.full}`}
                  >
                    <span
                      className="absolute top-0.5 w-5 h-5 rounded-full shadow-md transition-transform duration-200"
                      style={{
                        background: '#FFFFFF',
                        transform: config.active ? 'translateX(22px)' : 'translateX(2px)',
                      }}
                    />
                  </button>
                  <span
                    className="text-sm font-semibold"
                    style={{
                      color: config.active ? 'var(--admin-text)' : 'var(--admin-text-mute)',
                    }}
                  >
                    {day.full}
                  </span>
                </div>

                {config.active ? (
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-lg"
                    style={{
                      background: 'var(--admin-accent-bg)',
                      color: 'var(--admin-accent)',
                      border: '1px solid var(--admin-accent-border)',
                    }}
                  >
                    {config.start_time} – {config.end_time}
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
                    Fechado
                  </span>
                )}
              </div>

              {/* Detalhes quando ativo */}
              {config.active && (
                <div className="px-4 pb-4 grid grid-cols-3 gap-2">
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
                      className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors"
                      style={{
                        background: 'var(--admin-input-bg)',
                        color: 'var(--admin-text)',
                        border: '1px solid var(--admin-border)',
                      }}
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
                      className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors"
                      style={{
                        background: 'var(--admin-input-bg)',
                        color: 'var(--admin-text)',
                        border: '1px solid var(--admin-border)',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="text-[11px] font-medium uppercase tracking-wider mb-1.5 block"
                      style={{ color: 'var(--admin-text-mute)' }}
                      title="Intervalo entre os horários que aparecem pro cliente. A duração real vem do serviço escolhido."
                    >
                      Intervalo
                    </label>
                    <select
                      value={config.slot_duration}
                      onChange={(e) => updateDay(day.id, 'slot_duration', Number(e.target.value))}
                      className="w-full rounded-xl px-2 py-2 text-sm focus:outline-none transition-colors"
                      style={{
                        background: 'var(--admin-input-bg)',
                        color: 'var(--admin-text)',
                        border: '1px solid var(--admin-border)',
                      }}
                    >
                      {DURATIONS.map((d) => (
                        <option key={d} value={d}>
                          {formatDuration(d)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Botão salvar com glow */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
        style={
          saved
            ? {
                background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
                color: '#FFFFFF',
                boxShadow: '0 10px 30px -8px rgba(16, 185, 129, 0.55)',
              }
            : {
                background:
                  'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
                color: '#FFFFFF',
                boxShadow:
                  '0 12px 32px -8px color-mix(in srgb, var(--admin-accent) 55%, transparent)',
              }
        }
      >
        {saving ? (
          'Salvando...'
        ) : saved ? (
          <>
            <IconCheck size={16} /> Horários salvos!
          </>
        ) : (
          'Salvar horários'
        )}
      </button>
    </div>
  )
}
