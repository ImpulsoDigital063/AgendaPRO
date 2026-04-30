'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Professional, WorkingHours } from '@/lib/types'
import { IconCheck, IconInfo, IconClose, IconCopy, IconPlus, IconClock } from '@/components/ui/Icon'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'
import MoreActionsMenu, { type MoreAction } from '@/components/admin/MoreActionsMenu'
import StickyActionBar from '@/components/admin/StickyActionBar'

type Props = {
  professionals: Professional[]
  initialWorkingHours: WorkingHours[]
  /**
   * Marca explicitamente quando este componente está sendo renderizado
   * no painel do admin (que vê todos os profissionais do business). Em
   * /profissional/horarios omite — fica false e o kebab cross-profissional
   * NÃO aparece, mesmo que de algum jeito o array de professionals
   * viesse com mais de 1.
   */
  isAdmin?: boolean
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

export default function HorariosTab({
  professionals,
  initialWorkingHours,
  isAdmin = false,
}: Props) {
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

  // #1: troca de profissional com alteracoes pendentes
  const [pendingProfChange, setPendingProfChange] = useState<string | null>(null)

  // #2: copiar horario do profissional atual pra todos os outros ativos
  const [confirmCopyToAll, setConfirmCopyToAll] = useState(false)
  // Progresso visivel do batch (X/N) — sem isso, dono Equipe acha que travou
  const [copyProgress, setCopyProgress] = useState<{ current: number; total: number } | null>(null)
  // Pre-check: agendamentos futuros que ficariam fora do novo horario
  const [orphansCount, setOrphansCount] = useState<number | null>(null)
  const [checkingOrphans, setCheckingOrphans] = useState(false)

  // #3: pausa de almoco configuravel pelo admin (default 12-13)
  const [lunchStart, setLunchStart] = useState('12:00')
  const [lunchEnd, setLunchEnd] = useState('13:00')

  // #4 (extra): aplicar intervalo unico em todos os dias ativos
  const [pickIntervalOpen, setPickIntervalOpen] = useState(false)

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

  /**
   * Última edição: pega o MAX(updated_at) das rows do prof selecionado.
   * Mostrado no badge — admin enxerga se prof comissionado mudou
   * horário depois (override silencioso).
   */
  const lastEdit = useMemo(() => {
    const profHours = workingHours.filter((h) => h.professional_id === selectedProfId)
    if (profHours.length === 0) return null
    let latest: WorkingHours | null = null
    for (const h of profHours) {
      if (!h.updated_at) continue
      if (!latest || (h.updated_at > (latest.updated_at ?? ''))) latest = h
    }
    if (!latest?.updated_at) return null
    return { at: latest.updated_at, by: latest.updated_by_name ?? null }
  }, [workingHours, selectedProfId])

  function formatRelativeTime(iso: string): string {
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'agora mesmo'
    if (diffMin < 60) return `há ${diffMin}min`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `há ${diffH}h`
    const diffD = Math.floor(diffH / 24)
    if (diffD < 7) return `há ${diffD}d`
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  function doSelectProf(profId: string) {
    setSelectedProfId(profId)
    const next = buildSchedule(workingHours, profId)
    setSchedule(next)
    setSavedSnapshot(snapshot(next))
    setSaved(false)
  }

  function handleSelectProf(profId: string) {
    if (profId === selectedProfId) return
    if (isDirty) {
      // Tem mudanca pendente — aborda usuario antes de descartar
      setPendingProfChange(profId)
      return
    }
    doSelectProf(profId)
  }

  async function handleSaveAndSwitch() {
    if (!pendingProfChange) return
    await handleSave()
    doSelectProf(pendingProfChange)
    setPendingProfChange(null)
  }

  function handleDiscardAndSwitch() {
    if (!pendingProfChange) return
    doSelectProf(pendingProfChange)
    setPendingProfChange(null)
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

  /**
   * Aplica pausa de almoço (default 12:00–13:00) em TODOS os dias
   * ativos que ainda têm 1 período só. Dias com 2+ períodos (já têm
   * pausa) são preservados — não sobrescreve config customizada.
   *
   * Pensado em uso em massa: 100 barbearias diferentes vão querer
   * aplicar pausa de almoço com 1 clique em vez de configurar 6 dias
   * manualmente.
   */
  function applyLunchToAll(lunchStart = '12:00', lunchEnd = '13:00') {
    setSchedule((prev) => {
      const next = { ...prev }
      for (const d of DAYS) {
        const cfg = next[d.id]
        if (!cfg.active) continue
        if (cfg.periods.length > 1) continue // ja tem pausa, nao mexe
        const period = cfg.periods[0]
        // Só divide se o período cobre o horário de almoço inteiro
        if (period.start_time < lunchStart && period.end_time > lunchEnd) {
          next[d.id] = {
            ...cfg,
            periods: [
              { start_time: period.start_time, end_time: lunchStart },
              { start_time: lunchEnd, end_time: period.end_time },
            ],
          }
        }
      }
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
   * Pre-check: conta agendamentos futuros (pendentes/confirmados) dos
   * profissionais alvo que NAO caberiam no novo schedule (que vai ser
   * copiado). Esses appointments nao sao apagados — ficam orfaos no
   * sistema, aparecem no painel mas fora do horario gerado pra cliente
   * final. Eduardo precisa saber antes de confirmar.
   */
  async function checkOrphansBeforeCopy(targetProfIds: string[]): Promise<number> {
    if (targetProfIds.length === 0) return 0

    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('appointments')
      .select('professional_id, appointment_date, start_time, end_time')
      .in('professional_id', targetProfIds)
      .gte('appointment_date', today)
      .in('status', ['pending', 'confirmed'])

    if (!data || data.length === 0) return 0

    let orphans = 0
    for (const a of data) {
      const dayOfWeek = new Date(a.appointment_date + 'T00:00:00').getDay()
      const cfg = schedule[dayOfWeek]
      if (!cfg.active) {
        orphans++
        continue
      }
      const aStart = a.start_time.slice(0, 5)
      const aEnd = a.end_time.slice(0, 5)
      // Cabe se ALGUM periodo do dia engloba o appointment inteiro
      const fits = cfg.periods.some((p) => p.start_time <= aStart && p.end_time >= aEnd)
      if (!fits) orphans++
    }
    return orphans
  }

  async function openCopyToAllConfirm() {
    setCheckingOrphans(true)
    setOrphansCount(null)
    setConfirmCopyToAll(true)
    const targetIds = activeProfessionals.filter((p) => p.id !== selectedProfId).map((p) => p.id)
    const count = await checkOrphansBeforeCopy(targetIds)
    setOrphansCount(count)
    setCheckingOrphans(false)
  }

  /**
   * #4: Aplica um slot_duration unico em TODOS os dias ATIVOS do
   * profissional selecionado. Util pra normalizar a regua quando admin
   * decide trocar de 30 pra 45min depois de configurar tudo.
   */
  function applyIntervalToAllDays(slotDuration: number) {
    setSchedule((prev) => {
      const next = { ...prev }
      for (const d of DAYS) {
        if (next[d.id].active) {
          next[d.id] = { ...next[d.id], slot_duration: slotDuration }
        }
      }
      return next
    })
    setSaved(false)
    setPickIntervalOpen(false)
  }

  /**
   * #2: Copia o schedule atual (do profissional selecionado) pra TODOS
   * os outros profissionais ativos. Útil pra equipe com horário igual
   * (caso comum: 3 barbeiros atendendo Seg-Sáb 9-18 com pausa 12-13).
   *
   * Estratégia: pra cada outro profissional, DELETE all + INSERT new
   * (mesma estratégia do handleSave). Atualiza workingHours local em
   * batch só no final pra não dar loop de re-renders.
   */
  async function applyScheduleToAllProfessionals() {
    if (saving) return
    setSaving(true)

    const otherProfs = activeProfessionals.filter((p) => p.id !== selectedProfId)
    setCopyProgress({ current: 0, total: otherProfs.length })

    const hoursPayload = buildHoursArray(schedule)
    const updatedByName = getUpdatedByName()
    const newWorkingHours: WorkingHours[] = workingHours.filter(
      (w) => !otherProfs.some((p) => p.id === w.professional_id)
    )

    for (let i = 0; i < otherProfs.length; i++) {
      const prof = otherProfs[i]

      // RPC atomico — DELETE+INSERT em transacao, sem race com prof editando paralelo
      const { data: returnedRows, error } = await supabase.rpc('replace_professional_hours', {
        p_professional_id: prof.id,
        p_hours: hoursPayload,
        p_updated_by_name: updatedByName,
      })

      if (error) {
        console.error(`[copyToAll] erro em ${prof.name}:`, error)
        // Continua com proximos — falha individual nao trava o lote
      } else if (returnedRows) {
        newWorkingHours.push(...(returnedRows as WorkingHours[]))
      }

      setCopyProgress({ current: i + 1, total: otherProfs.length })
    }

    setWorkingHours(newWorkingHours)
    setSaving(false)
    setSaved(true)
    setConfirmCopyToAll(false)
    setCopyProgress(null)
    setOrphansCount(null)

    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSaved(false), 3000)
  }

  /**
   * Constroi array de hours pra mandar pra RPC. Filtra periodos
   * invalidos (start >= end) e pula dias inativos.
   */
  function buildHoursArray(s: Schedule) {
    const out: Array<{
      day_of_week: number
      start_time: string
      end_time: string
      slot_duration: number
    }> = []
    for (const day of DAYS) {
      const cfg = s[day.id]
      if (!cfg.active) continue
      for (const period of cfg.periods) {
        if (period.start_time >= period.end_time) continue
        out.push({
          day_of_week: day.id,
          start_time: period.start_time,
          end_time: period.end_time,
          slot_duration: cfg.slot_duration,
        })
      }
    }
    return out
  }

  /** Nome do autor pra audit (admin x prof comissionado) */
  function getUpdatedByName(): string {
    if (isAdmin) return 'Admin'
    return activeProfessionals.find((p) => p.id === selectedProfId)?.name ?? 'Profissional'
  }

  /**
   * Save: chama RPC replace_professional_hours que faz DELETE+INSERT
   * em transação atômica no Postgres. Elimina race condition entre
   * admin e profissional editando ao mesmo tempo.
   */
  async function handleSave() {
    if (!selectedProfId || saving) return
    setSaving(true)

    const hoursPayload = buildHoursArray(schedule)

    const { data: returnedRows, error } = await supabase.rpc('replace_professional_hours', {
      p_professional_id: selectedProfId,
      p_hours: hoursPayload,
      p_updated_by_name: getUpdatedByName(),
    })

    if (error) {
      console.error('[handleSave] RPC error:', error)
      alert('Erro ao salvar horários: ' + (error.message || 'tente novamente'))
      setSaving(false)
      return
    }

    // RPC retorna SETOF working_hours — atualiza state local
    const newRowsForThisProf = (returnedRows ?? []) as WorkingHours[]
    const newWorkingHours: WorkingHours[] = [
      ...workingHours.filter((w) => w.professional_id !== selectedProfId),
      ...newRowsForThisProf,
    ]

    // Reconstroi schedule com os existingId atualizados
    const nextSchedule = buildSchedule(newWorkingHours, selectedProfId)

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

      {/* KPI compacto + Ajuda + Kebab (acoes secundarias) */}
      <div className="flex gap-2 items-stretch">
        <div className="admin-card p-2.5 flex-1 min-w-0">
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
          {/*
            Badge de auditoria — mostra quem editou os horarios pela
            ultima vez. Permite admin saber se prof comissionado
            sobrescreveu config aplicada em massa (override silencioso).
          */}
          {lastEdit && (
            <p
              className="text-[10px] mt-1 truncate"
              style={{ color: 'var(--admin-text-mute)' }}
              title={`Última edição em ${new Date(lastEdit.at).toLocaleString('pt-BR')}${lastEdit.by ? ` por ${lastEdit.by}` : ''}`}
            >
              Editado {formatRelativeTime(lastEdit.at)}
              {lastEdit.by && ` · por ${lastEdit.by}`}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowHelp((s) => !s)}
          className="admin-card px-3 flex items-center gap-1.5 text-xs font-semibold transition-colors flex-shrink-0"
          style={{
            color: showHelp ? 'var(--admin-accent)' : 'var(--admin-text-mute)',
          }}
          aria-expanded={showHelp}
        >
          <IconInfo size={14} />
          Como funciona
        </button>
        {/* Kebab — acoes secundarias. Acao "intervalo unificado" e
            sempre util (admin e profissional comissionado). Acao
            "copiar pra todos profissionais" so aparece se isAdmin &&
            ha 2+ profs (em /profissional/horarios o prof so configura
            os proprios). */}
        <div className="admin-card px-1 flex items-center flex-shrink-0">
          <MoreActionsMenu
            actions={[
              {
                label: 'Aplicar mesmo intervalo em todos os dias',
                icon: <IconClock size={15} />,
                onClick: () => setPickIntervalOpen(true),
              },
              ...(isAdmin && activeProfessionals.length >= 2
                ? [
                    {
                      label: 'Copiar este horário pra todos os profissionais',
                      icon: <IconCopy size={15} />,
                      onClick: openCopyToAllConfirm,
                      separatorAbove: true,
                    } as MoreAction,
                  ]
                : []),
            ]}
            ariaLabel="Mais ações de horário"
          />
        </div>
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
            horários que aparece pro cliente (ex: 30min mostra 09:00, 09:30, 10:00…).
          </p>
          <p>
            A <strong>duração real</strong> vem do serviço escolhido. Cliente escolhe um corte de
            1h em 9:30 → ocupa 9:30–10:30 → o slot das 10:00 fica indisponível pra outro cliente
            (porque já tá ocupado). O sistema bloqueia sozinho.
          </p>
          <p>
            <strong>Regra prática:</strong> use o intervalo igual à duração do seu serviço mais
            comum. Barbearia com cortes de 30min → intervalo 30min. Clínica com procedimentos
            de 1h → intervalo 60min.
          </p>
          <p>
            <strong style={{ color: 'var(--admin-accent)' }}>Pausa</strong> divide o dia em
            períodos (manhã + tarde). Use o atalho abaixo pra aplicar pausa em todos os dias de
            uma vez, ou clica em <em>Adicionar pausa</em> dentro de cada dia.
          </p>
          <p>
            <strong style={{ color: 'var(--admin-accent)' }}>Quem pode editar:</strong> o admin
            (você) configura horário de qualquer profissional. Profissional <em>comissionado</em>{' '}
            também pode mudar o próprio horário entrando no painel dele —{' '}
            <strong>quando ele salva, sobrescreve</strong> o que você tinha configurado. O badge{' '}
            <em>Editado há X</em> em cima mostra quem editou por último.
          </p>
        </div>
      )}

      {/* Quick actions — atalhos primarios (presets de dias/horario) */}
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

      {/*
        Atalho de pausa de almoco — inputs CONFIGURAVEIS antes de aplicar.
        Default 12:00-13:00 cobre 80% dos casos (barbearia/salao/estetica
        tradicionais). Quem faz pausa diferente (ex: 12:30-14:00) edita
        e aplica num clique. Pra dias com periodo unico que cobre o
        intervalo da pausa — pula dias com pausa custom ja configurada.
      */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl flex-wrap"
        style={{
          background: 'color-mix(in srgb, var(--admin-warn, #FBBF24) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--admin-warn, #FBBF24) 28%, transparent)',
        }}
      >
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold flex-shrink-0"
          style={{ color: 'var(--admin-warn, #FBBF24)' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Pausa de almoço:
        </span>
        <input
          type="time"
          value={lunchStart}
          onChange={(e) => setLunchStart(e.target.value)}
          className="admin-input text-xs px-2 py-1 tabular-nums"
          style={{ width: 88 }}
          aria-label="Início da pausa"
        />
        <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>—</span>
        <input
          type="time"
          value={lunchEnd}
          onChange={(e) => setLunchEnd(e.target.value)}
          className="admin-input text-xs px-2 py-1 tabular-nums"
          style={{ width: 88 }}
          aria-label="Fim da pausa"
        />
        <button
          type="button"
          onClick={() => applyLunchToAll(lunchStart, lunchEnd)}
          disabled={lunchStart >= lunchEnd}
          className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
          style={{
            background: 'var(--admin-warn, #FBBF24)',
            color: '#0F172A',
          }}
        >
          Aplicar em todos
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

      {/*
        #1 — Modal disparado quando o usuario tenta trocar de profissional
        com mudancas nao salvas. 3 acoes (salvar+trocar / descartar+trocar
        / cancelar) — nao cabe no ConfirmActionModal padrao (que tem 2),
        entao renderizo inline.
      */}
      {pendingProfChange && (
        <SwitchProfessionalModal
          currentProfName={
            activeProfessionals.find((p) => p.id === selectedProfId)?.name ?? 'profissional atual'
          }
          targetProfName={
            activeProfessionals.find((p) => p.id === pendingProfChange)?.name ?? 'profissional'
          }
          saving={saving}
          onSaveAndSwitch={handleSaveAndSwitch}
          onDiscardAndSwitch={handleDiscardAndSwitch}
          onCancel={() => setPendingProfChange(null)}
        />
      )}

      {/* #2 — Confirmacao com warning de orfaos + progresso visivel */}
      {confirmCopyToAll && (
        <CopyToAllProfsModal
          othersCount={activeProfessionals.length - 1}
          currentProfName={
            activeProfessionals.find((p) => p.id === selectedProfId)?.name ?? 'profissional atual'
          }
          checkingOrphans={checkingOrphans}
          orphansCount={orphansCount}
          saving={saving}
          progress={copyProgress}
          onConfirm={applyScheduleToAllProfessionals}
          onClose={() => {
            if (saving) return
            setConfirmCopyToAll(false)
            setOrphansCount(null)
            setCopyProgress(null)
          }}
        />
      )}

      {/* #4 — Picker de intervalo unico em todos os dias ativos */}
      {pickIntervalOpen && (
        <IntervalPickerModal
          activeDaysCount={openDays}
          onPick={applyIntervalToAllDays}
          onClose={() => setPickIntervalOpen(false)}
        />
      )}
    </div>
  )
}

// =============================================================================
// Modal: copiar horario do prof atual pra todos os outros
// (com pre-check de agendamentos orfaos e progresso visivel)
// =============================================================================
function CopyToAllProfsModal({
  othersCount,
  currentProfName,
  checkingOrphans,
  orphansCount,
  saving,
  progress,
  onConfirm,
  onClose,
}: {
  othersCount: number
  currentProfName: string
  checkingOrphans: boolean
  orphansCount: number | null
  saving: boolean
  progress: { current: number; total: number } | null
  onConfirm: () => void
  onClose: () => void
}) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [saving, onClose])

  const sujeito = othersCount === 1
    ? `O outro profissional ativo vai receber`
    : `Os ${othersCount} outros profissionais ativos vão receber`

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={() => !saving && onClose()}
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
        <div className="p-5 pb-2">
          <h3 className="text-base font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
            Copiar horário em todos os profissionais?
          </h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
            {sujeito} o mesmo horário do <strong>{currentProfName}</strong>. Qualquer config
            existente neles vai ser sobrescrita.
          </p>

          {/* Warning de orfaos */}
          {checkingOrphans && (
            <p className="text-xs mt-3" style={{ color: 'var(--admin-text-mute)' }}>
              Conferindo agendamentos existentes...
            </p>
          )}
          {!checkingOrphans && orphansCount !== null && orphansCount > 0 && (
            <div
              className="mt-3 px-3 py-2.5 rounded-lg text-xs leading-relaxed"
              style={{
                background: 'color-mix(in srgb, var(--admin-warn, #FBBF24) 15%, transparent)',
                border: '1px solid color-mix(in srgb, var(--admin-warn, #FBBF24) 40%, transparent)',
                color: 'var(--admin-warn, #FBBF24)',
              }}
            >
              <strong>Atenção:</strong> {orphansCount} agendamento{orphansCount === 1 ? '' : 's'}{' '}
              futuro{orphansCount === 1 ? '' : 's'} desses profissionais{' '}
              {orphansCount === 1 ? 'não cabe' : 'não cabem'} no novo horário e vão ficar fora do
              expediente. Os agendamentos não somem — você precisa decidir se remarca ou cancela
              depois.
            </div>
          )}

          {/* Progresso durante o batch */}
          {saving && progress && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: 'var(--admin-text-mute)' }}>
                <span>Copiando horários...</span>
                <span className="tabular-nums">{progress.current}/{progress.total}</span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--admin-input-bg)' }}
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${(progress.current / Math.max(1, progress.total)) * 100}%`,
                    background:
                      'linear-gradient(135deg, var(--brand-primary, #3B82F6), var(--brand-secondary, #06B6D4))',
                  }}
                />
              </div>
            </div>
          )}
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
            disabled={saving}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
            style={{
              background: 'transparent',
              color: 'var(--admin-text-2)',
              border: '1px solid var(--admin-border)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={saving || checkingOrphans}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-transform hover:translate-y-[-1px] disabled:opacity-50 disabled:translate-y-0"
            style={{
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: '#1F2937',
              boxShadow: '0 8px 22px -6px rgba(217,119,6,0.5)',
            }}
          >
            {saving
              ? progress
                ? `Copiando ${progress.current}/${progress.total}...`
                : 'Processando...'
              : 'Sim, copiar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Modal: aplicar mesmo intervalo em todos os dias ativos
// =============================================================================
function IntervalPickerModal({
  activeDaysCount,
  onPick,
  onClose,
}: {
  activeDaysCount: number
  onPick: (slotDuration: number) => void
  onClose: () => void
}) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

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
        <div className="p-5 pb-3">
          <h3 className="text-base font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
            Intervalo padrão dos dias abertos
          </h3>
          <p className="text-sm mt-2" style={{ color: 'var(--admin-text-2)' }}>
            Aplica em <strong>{activeDaysCount}</strong> dia{activeDaysCount === 1 ? '' : 's'}{' '}
            ativo{activeDaysCount === 1 ? '' : 's'} de uma vez. Use a duração do seu serviço mais
            comum.
          </p>
        </div>
        <div className="px-5 pb-5 grid grid-cols-3 gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onPick(d)}
              className="py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: 'var(--admin-input-bg)',
                color: 'var(--admin-text)',
                border: '1px solid var(--admin-border)',
              }}
            >
              {formatDuration(d)}
            </button>
          ))}
        </div>
        <div
          className="flex p-4 sm:justify-end"
          style={{
            background: 'rgba(0,0,0,0.18)',
            borderTop: '1px solid var(--admin-popover-border, #E2E8F0)',
          }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors w-full sm:w-auto"
            style={{
              background: 'transparent',
              color: 'var(--admin-text-2)',
              border: '1px solid var(--admin-border)',
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Modal: trocar profissional com alteracoes nao salvas
// =============================================================================
function SwitchProfessionalModal({
  currentProfName,
  targetProfName,
  saving,
  onSaveAndSwitch,
  onDiscardAndSwitch,
  onCancel,
}: {
  currentProfName: string
  targetProfName: string
  saving: boolean
  onSaveAndSwitch: () => void
  onDiscardAndSwitch: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) onCancel()
    }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [saving, onCancel])

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={() => !saving && onCancel()}
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
        <div className="p-5 pb-4">
          <h3 className="text-base font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
            Alterações não salvas em {currentProfName}
          </h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
            Você tem mudanças no horário de <strong>{currentProfName}</strong> ainda não salvas.
            O que fazer antes de abrir <strong>{targetProfName}</strong>?
          </p>
        </div>
        <div
          className="flex flex-col gap-2 p-4"
          style={{
            background: 'rgba(0,0,0,0.18)',
            borderTop: '1px solid var(--admin-popover-border, #E2E8F0)',
          }}
        >
          <button
            onClick={onSaveAndSwitch}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-transform hover:translate-y-[-1px] disabled:opacity-50 disabled:translate-y-0"
            style={{
              background:
                'linear-gradient(135deg, var(--brand-primary, #3B82F6), var(--brand-secondary, #06B6D4))',
              color: '#FFFFFF',
              boxShadow: '0 8px 22px -6px rgba(59,130,246,0.5)',
            }}
          >
            {saving ? 'Salvando...' : `Salvar e abrir ${targetProfName}`}
          </button>
          <button
            onClick={onDiscardAndSwitch}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
            style={{
              background: 'transparent',
              color: 'var(--admin-danger, #EF4444)',
              border: '1px solid color-mix(in srgb, var(--admin-danger, #EF4444) 30%, transparent)',
            }}
          >
            Descartar mudanças e abrir
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
            style={{
              background: 'transparent',
              color: 'var(--admin-text-mute)',
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
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
