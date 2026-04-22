'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  IconCalendar,
  IconCalendarSolid,
  IconUsers,
  IconUsersSolid,
  IconWallet,
  IconWalletSolid,
  IconSettings,
  IconSettingsSolid,
} from '@/components/ui/Icon'

type IconCmp = (p: { size?: number; strokeWidth?: number }) => ReactNode
type Tab = { href: string; label: string; Icon: IconCmp; IconSolid: IconCmp }

const tabs: Tab[] = [
  { href: '/admin',               label: 'Agenda',     Icon: IconCalendar, IconSolid: IconCalendarSolid },
  { href: '/admin/clientes',      label: 'Clientes',   Icon: IconUsers,    IconSolid: IconUsersSolid    },
  { href: '/admin/financeiro',    label: 'Financeiro', Icon: IconWallet,   IconSolid: IconWalletSolid   },
  { href: '/admin/configuracoes', label: 'Config',     Icon: IconSettings, IconSolid: IconSettingsSolid },
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
              {active ? <tab.IconSolid size={22} /> : <tab.Icon size={22} strokeWidth={1.7} />}
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
