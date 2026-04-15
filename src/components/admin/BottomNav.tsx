'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  IconCalendar,
  IconUsers,
  IconWallet,
  IconSettings,
} from '@/components/ui/Icon'

type Tab = { href: string; label: string; Icon: (p: { size?: number; strokeWidth?: number }) => ReactNode }

const tabs: Tab[] = [
  { href: '/admin',              label: 'Agenda',     Icon: IconCalendar },
  { href: '/admin/clientes',     label: 'Clientes',   Icon: IconUsers    },
  { href: '/admin/financeiro',   label: 'Financeiro', Icon: IconWallet   },
  { href: '/admin/configuracoes', label: 'Config',    Icon: IconSettings },
]

export default function BottomNav() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="admin-bottomnav fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all relative"
              style={{
                color: active ? 'var(--admin-accent)' : 'var(--admin-text-faded)',
              }}
            >
              {active && (
                <>
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[2px] rounded-full"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent 0%, var(--admin-accent) 50%, transparent 100%)',
                      boxShadow:
                        '0 0 12px color-mix(in srgb, var(--admin-accent) 70%, transparent)',
                    }}
                  />
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-10 pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(ellipse at top, color-mix(in srgb, var(--admin-accent) 25%, transparent) 0%, transparent 70%)',
                    }}
                  />
                </>
              )}
              <tab.Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              <span
                className="text-[11px] font-semibold tracking-wide"
                style={{ color: active ? 'var(--admin-accent)' : 'var(--admin-text-faded)' }}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
