'use client'

import { useRouter, usePathname } from 'next/navigation'

const TABS = [
  { key: 'hoje',   label: 'Hoje'   },
  { key: 'semana', label: '7 dias' },
  { key: 'mes',    label: 'Mês'    },
] as const

export default function FinancePeriodTabs({ periodo }: { periodo: string }) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div
      className="flex rounded-2xl p-1 gap-1"
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {TABS.map((t) => {
        const active = periodo === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => router.push(`${pathname}?periodo=${t.key}`)}
            className="flex-1 py-2 text-sm font-semibold rounded-xl transition-all"
            style={
              active
                ? {
                    background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                    color: '#fff',
                    boxShadow: '0 6px 14px rgba(59,130,246,0.3)',
                  }
                : {
                    background: 'transparent',
                    color: 'var(--admin-text-mute)',
                  }
            }
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
