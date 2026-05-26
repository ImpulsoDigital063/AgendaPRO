'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { IconClock } from '@/components/ui/Icon'

type Props = {
  businessId: string
  profId: string
  date: string // YYYY-MM-DD
  /** Duração total dos serviços (em minutos) · usada pra calcular sobreposição */
  totalDuration: number
  /** Horário selecionado (HH:MM) · '' = nenhum */
  value: string
  onChange: (time: string) => void
}

type Periodo = {
  label: string
  start: number // hora · 24h
  end: number
}

const PERIODOS: Periodo[] = [
  { label: 'Manhã', start: 8, end: 12 }, // 08:00 → 11:30
  { label: 'Tarde', start: 12, end: 18 }, // 12:00 → 17:30
  { label: 'Noite', start: 18, end: 22 }, // 18:00 → 21:30
]
const SLOT_STEP_MIN = 30

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

type BusyRange = { start: number; end: number; reason: string } // minutos

export default function TimeSlotPicker({
  businessId,
  profId,
  date,
  totalDuration,
  value,
  onChange,
}: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [busy, setBusy] = useState<BusyRange[]>([])
  const [loading, setLoading] = useState(false)
  const [showCustom, setShowCustom] = useState(false)

  // Busca appointments existentes + bloqueios do prof+data
  useEffect(() => {
    if (!profId || !date) {
      setBusy([])
      return
    }
    let cancelled = false
    setLoading(true)
    async function load() {
      const dayOfWeek = new Date(date + 'T00:00:00').getDay()
      const [{ data: appts }, { data: blocks }] = await Promise.all([
        supabase
          .from('appointments')
          .select('start_time, end_time, status, client_name')
          .eq('business_id', businessId)
          .eq('professional_id', profId)
          .eq('appointment_date', date)
          .neq('status', 'cancelled')
          .neq('status', 'no_show'),
        supabase
          .from('business_blocks')
          .select('professional_id, block_type, day_of_week, block_date, start_time, end_time, reason')
          .eq('business_id', businessId)
          .eq('active', true),
      ])
      if (cancelled) return
      const ranges: BusyRange[] = []
      for (const a of appts ?? []) {
        const s = (a.start_time as string).slice(0, 5)
        const e = (a.end_time as string).slice(0, 5)
        ranges.push({
          start: timeToMinutes(s),
          end: timeToMinutes(e),
          reason: a.client_name ? `Ocupado · ${a.client_name}` : 'Ocupado',
        })
      }
      for (const b of blocks ?? []) {
        if (b.professional_id && b.professional_id !== profId) continue
        let applies = false
        if (b.block_type === 'recurring' && b.day_of_week === dayOfWeek) applies = true
        else if (b.block_type === 'specific' && b.block_date === date) applies = true
        if (!applies) continue
        ranges.push({
          start: timeToMinutes((b.start_time as string).slice(0, 5)),
          end: timeToMinutes((b.end_time as string).slice(0, 5)),
          reason: b.reason ? `Bloqueado · ${b.reason}` : 'Bloqueado',
        })
      }
      setBusy(ranges)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [supabase, businessId, profId, date])

  // Calcula se o slot [startMin, startMin+duration) sobrepõe com algum busy
  function conflictReason(startMin: number): string | null {
    const endMin = startMin + Math.max(totalDuration, 1)
    for (const r of busy) {
      if (startMin < r.end && endMin > r.start) return r.reason
    }
    return null
  }

  const selectedMin = value ? timeToMinutes(value) : null
  const needsProfFirst = !profId

  // Quando a data selecionada é HOJE, slots anteriores ao horário atual
  // (em minutos locais) viram disabled · evita marcar pro passado.
  const nowMinIfToday: number | null = (() => {
    if (!date) return null
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    if (date !== todayStr) return null
    return now.getHours() * 60 + now.getMinutes()
  })()

  return (
    <div className="space-y-3">
      {needsProfFirst ? (
        <div
          className="rounded-xl px-3 py-3 text-xs text-center"
          style={{
            background: 'var(--admin-input-bg)',
            border: '1px dashed var(--admin-border)',
            color: 'var(--admin-text-mute)',
          }}
        >
          Selecione o profissional antes de escolher o horário.
        </div>
      ) : loading ? (
        <p className="text-xs text-center py-2" style={{ color: 'var(--admin-text-mute)' }}>
          Verificando disponibilidade...
        </p>
      ) : (
        <>
          {PERIODOS.map((p) => {
            const slots: number[] = []
            for (let m = p.start * 60; m < p.end * 60; m += SLOT_STEP_MIN) slots.push(m)
            return (
              <div key={p.label}>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
                  style={{ color: 'var(--admin-text-faded)' }}
                >
                  {p.label}
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                  {slots.map((m) => {
                    const time = minutesToTime(m)
                    const conflict = conflictReason(m)
                    const isPast = nowMinIfToday !== null && m < nowMinIfToday
                    const isSelected = selectedMin === m
                    const isBusy = !!conflict || isPast
                    const reason = isPast ? 'Horário já passou' : conflict
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => !isBusy && onChange(time)}
                        disabled={isBusy}
                        title={reason ?? `${time} · livre`}
                        className="px-2 py-1.5 rounded-lg text-xs font-semibold tabular-nums transition-all disabled:cursor-not-allowed"
                        style={
                          isSelected
                            ? {
                                background:
                                  'linear-gradient(180deg, var(--brand-primary, #1AA9A8) 0%, color-mix(in srgb, var(--brand-primary, #1AA9A8) 70%, black) 100%)',
                                color: '#fff',
                                borderTop: '1px solid rgba(255,255,255,0.25)',
                                boxShadow:
                                  '0 4px 12px -3px color-mix(in srgb, var(--brand-primary, #1AA9A8) 55%, transparent)',
                              }
                            : isBusy
                              ? {
                                  background: 'var(--admin-input-bg)',
                                  color: 'var(--admin-text-faded)',
                                  border: '1px solid var(--admin-border)',
                                  textDecoration: 'line-through',
                                  opacity: 0.55,
                                }
                              : {
                                  background: 'var(--admin-input-bg)',
                                  color: 'var(--admin-text)',
                                  border: '1px solid var(--admin-border)',
                                }
                        }
                      >
                        {time}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Linha de exceção · horário customizado */}
          {showCustom ? (
            <div className="flex items-center gap-2">
              <IconClock size={14} />
              <input
                type="time"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                step={300}
                className="admin-input flex-1 px-3 py-2 rounded-lg text-sm"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowCustom(false)}
                className="text-xs underline"
                style={{ color: 'var(--admin-text-mute)' }}
              >
                fechar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className="text-xs underline"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              Outro horário (quebrado, ex: 14:17)
            </button>
          )}

          {/* Resumo selecionado */}
          {value && (
            <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
              Início <span className="font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>{value}</span>
              {totalDuration > 0 && (
                <>
                  {' · termina '}
                  <span className="font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    {minutesToTime(timeToMinutes(value) + totalDuration)}
                  </span>
                  {' '}({totalDuration}min)
                </>
              )}
            </p>
          )}
        </>
      )}
    </div>
  )
}
