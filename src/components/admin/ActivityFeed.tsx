'use client'

type ActivityEntry = {
  id: string
  action: string
  description: string | null
  created_at: string
  professional?: { name: string } | null
}

type Props = {
  activities: ActivityEntry[]
}

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  confirm: { label: 'Confirmou', color: 'var(--admin-success)', icon: 'M9 12l2 2 4-4' },
  cancel: { label: 'Cancelou', color: 'var(--admin-danger)', icon: 'M18 6L6 18M6 6l12 12' },
  reschedule: { label: 'Reagendou', color: 'var(--admin-warn)', icon: 'M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83' },
  login: { label: 'Login', color: 'var(--admin-accent)', icon: 'M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3' },
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export default function ActivityFeed({ activities }: Props) {
  if (activities.length === 0) {
    return (
      <div className="admin-card p-6 text-center">
        <p className="text-sm" style={{ color: 'var(--admin-text-faded)' }}>
          Nenhuma atividade recente dos profissionais.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {activities.map((a) => {
        const config = ACTION_CONFIG[a.action] || ACTION_CONFIG.confirm
        return (
          <div key={a.id} className="admin-card px-4 py-3 flex items-start gap-3">
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{
                background: `color-mix(in srgb, ${config.color} 15%, transparent)`,
                color: config.color,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={config.icon} />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug" style={{ color: 'var(--admin-text)' }}>
                {a.description || `${a.professional?.name || 'Profissional'} ${config.label.toLowerCase()}`}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
                {timeAgo(a.created_at)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
