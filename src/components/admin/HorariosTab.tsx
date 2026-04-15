'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Professional, WorkingHours } from '@/lib/types'

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
          // Atualiza existente
          await supabase
            .from('working_hours')
            .update({
              start_time: config.start_time,
              end_time: config.end_time,
              slot_duration: config.slot_duration,
            })
            .eq('id', config.existingId)
        } else {
          // Cria novo
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
        // Remove se estava ativo e agora está desativado
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
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <p className="text-gray-400 text-sm">
          Nenhum profissional ativo. Adicione um profissional primeiro.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Seletor de profissional */}
      {activeProfessionals.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {activeProfessionals.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectProf(p.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                selectedProfId === p.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {activeProfessionals.length === 1 && (
        <p className="text-sm text-gray-500">
          Configurando horários de <strong className="text-gray-900">{activeProfessionals[0].name}</strong>
        </p>
      )}

      {/* Ajuda conceitual */}
      <div
        className="rounded-xl px-4 py-3 text-xs leading-relaxed"
        style={{
          background: 'var(--admin-accent-bg)',
          border: '1px solid var(--admin-accent-border)',
          color: 'var(--admin-text-2)',
        }}
      >
        <strong style={{ color: 'var(--admin-accent)' }}>Intervalo</strong> é a régua de horários
        que o cliente enxerga (ex: 15min mostra 09:00, 09:15, 09:30…). A
        <strong> duração real</strong> do agendamento vem do serviço que ele escolher — um corte de
        30min ocupa 2 intervalos, uma progressiva de 2h ocupa 8. O sistema bloqueia sozinho os
        horários que não cabem ou que conflitam com outro agendamento.
      </div>

      {/* Grade de dias */}
      <div className="space-y-2">
        {DAYS.map((day) => {
          const config = schedule[day.id]
          return (
            <div
              key={day.id}
              className={`bg-white rounded-2xl border transition-colors overflow-hidden ${
                config.active ? 'border-gray-200' : 'border-gray-100'
              }`}
            >
              {/* Linha principal */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleDay(day.id)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      config.active ? 'bg-gray-900' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        config.active ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <span className={`text-sm font-medium ${config.active ? 'text-gray-900' : 'text-gray-400'}`}>
                    {day.full}
                  </span>
                </div>

                {config.active && (
                  <span className="text-xs text-gray-400">
                    {config.start_time} – {config.end_time}
                  </span>
                )}
                {!config.active && (
                  <span className="text-xs text-gray-300">Fechado</span>
                )}
              </div>

              {/* Detalhes quando ativo */}
              {config.active && (
                <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Abertura</label>
                    <input
                      type="time"
                      value={config.start_time}
                      onChange={(e) => updateDay(day.id, 'start_time', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Fechamento</label>
                    <input
                      type="time"
                      value={config.end_time}
                      onChange={(e) => updateDay(day.id, 'end_time', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block" title="Intervalo entre os horários que aparecem pro cliente. Ex: 15min mostra 09:00, 09:15, 09:30... A duração real do agendamento vem do serviço escolhido.">
                      Intervalo
                    </label>
                    <select
                      value={config.slot_duration}
                      onChange={(e) => updateDay(day.id, 'slot_duration', Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-400 bg-white"
                    >
                      {DURATIONS.map((d) => (
                        <option key={d} value={d}>{formatDuration(d)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Botão salvar */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-3 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-40 ${
          saved
            ? 'bg-green-500 text-white'
            : 'bg-gray-900 text-white hover:bg-gray-800'
        }`}
      >
        {saving ? 'Salvando...' : saved ? '✓ Horários salvos!' : 'Salvar horários'}
      </button>
    </div>
  )
}
