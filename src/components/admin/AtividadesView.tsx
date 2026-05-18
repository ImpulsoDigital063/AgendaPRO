'use client'

import { useMemo, useState } from 'react'
import {
  IconCalendar,
  IconCheck,
  IconClose,
  IconDollar,
  IconUser,
  IconUsers,
  IconStar,
  IconWallet,
  IconClock,
} from '@/components/ui/Icon'

type Activity = {
  id: string
  action: string
  description: string | null
  target_type: string | null
  target_id: string | null
  created_at: string
  professional_id: string | null
}

type Professional = { id: string; name: string }

const ACTION_META: Record<
  string,
  { label: string; icon: typeof IconClock; color: string }
> = {
  create_appointment: { label: 'Marcou', icon: IconCalendar, color: 'var(--admin-accent)' },
  update_appointment: { label: 'Editou', icon: IconCalendar, color: 'var(--admin-text-mute)' },
  confirm_appointment: { label: 'Confirmou', icon: IconCheck, color: 'var(--admin-accent)' },
  cancel_appointment: { label: 'Cancelou', icon: IconClose, color: 'var(--admin-danger,#EF4444)' },
  complete_appointment: { label: 'Atendeu', icon: IconCheck, color: 'var(--admin-success,#10B981)' },
  mark_no_show: { label: 'No-show', icon: IconClose, color: 'var(--admin-warn)' },
  register_payment: { label: 'Recebeu', icon: IconDollar, color: 'var(--admin-success,#10B981)' },
  create_customer: { label: 'Cadastrou cliente', icon: IconUsers, color: 'var(--admin-accent)' },
  update_customer: { label: 'Editou cliente', icon: IconUsers, color: 'var(--admin-text-mute)' },
  redeem_points: { label: 'Resgatou pontos', icon: IconStar, color: 'var(--admin-warn)' },
  close_cash: { label: 'Fechou caixa', icon: IconWallet, color: 'var(--admin-accent)' },
  login: { label: 'Login', icon: IconUser, color: 'var(--admin-text-faded)' },
  confirm: { label: 'Confirmou', icon: IconCheck, color: 'var(--admin-accent)' },
  cancel: { label: 'Cancelou', icon: IconClose, color: 'var(--admin-danger,#EF4444)' },
  complete: { label: 'Atendeu', icon: IconCheck, color: 'var(--admin-success,#10B981)' },
}

const PROF_COLORS = [
  'var(--admin-accent)',
  'var(--admin-success,#10B981)',
  'var(--admin-warn)',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
]

function fmtWhen(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `há ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `há ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `há ${diffD}d`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function AtividadesView({
  activities,
  professionals,
}: {
  activities: Activity[]
  professionals: Professional[]
}) {
  const [profFilter, setProfFilter] = useState<string>('')
  const [actionFilter, setActionFilter] = useState<string>('')

  const profMap = useMemo(() => {
    const m = new Map<string, { name: string; color: string }>()
    professionals.forEach((p, i) => {
      m.set(p.id, { name: p.name, color: PROF_COLORS[i % PROF_COLORS.length] })
    })
    return m
  }, [professionals])

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (profFilter && a.professional_id !== profFilter) return false
      if (actionFilter && a.action !== actionFilter) return false
      return true
    })
  }, [activities, profFilter, actionFilter])

  // Agrupa por dia
  const grouped = useMemo(() => {
    const out: { date: string; items: Activity[] }[] = []
    let currentDate = ''
    for (const a of filtered) {
      const date = new Date(a.created_at).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      })
      if (date !== currentDate) {
        out.push({ date, items: [] })
        currentDate = date
      }
      out[out.length - 1].items.push(a)
    }
    return out
  }, [filtered])

  const actionsPresent = useMemo(
    () => Array.from(new Set(activities.map((a) => a.action))).sort(),
    [activities],
  )

  return (
    <div className="relative max-w-2xl mx-auto px-4 pb-32 space-y-4">
      {/* Filtros */}
      <div className="admin-card p-3 grid grid-cols-2 gap-2">
        <select
          value={profFilter}
          onChange={(e) => setProfFilter(e.target.value)}
          className="admin-input text-sm py-2 px-2"
        >
          <option value="">Todos da equipe</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="admin-input text-sm py-2 px-2"
        >
          <option value="">Todas ações</option>
          {actionsPresent.map((a) => (
            <option key={a} value={a}>
              {ACTION_META[a]?.label ?? a}
            </option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <div className="admin-card p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>
            Nenhuma atividade registrada ainda.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>
            Conforme a equipe usar o sistema, as ações aparecem aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((g) => (
            <div key={g.date}>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2 capitalize" style={{ color: 'var(--admin-text-faded)' }}>
                {g.date}
              </p>
              <div className="space-y-1.5">
                {g.items.map((a) => {
                  const meta = ACTION_META[a.action] ?? {
                    label: a.action,
                    icon: IconClock,
                    color: 'var(--admin-text-mute)',
                  }
                  const prof = a.professional_id ? profMap.get(a.professional_id) : null
                  const Icon = meta.icon
                  return (
                    <div
                      key={a.id}
                      className="flex items-start gap-3 admin-card p-3"
                    >
                      <span
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
                          color: meta.color,
                        }}
                      >
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                            {meta.label}
                          </span>
                          {prof && (
                            <span
                              className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                              style={{
                                background: `color-mix(in srgb, ${prof.color} 14%, transparent)`,
                                color: prof.color,
                              }}
                            >
                              {prof.name}
                            </span>
                          )}
                          <span className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
                            {fmtWhen(a.created_at)}
                          </span>
                        </div>
                        <p className="text-sm mt-0.5 leading-snug" style={{ color: 'var(--admin-text)' }}>
                          {a.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
