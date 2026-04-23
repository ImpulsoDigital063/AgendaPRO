'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

type IconCmp = (p: { size?: number; strokeWidth?: number }) => ReactNode

export type DockTab = {
  href: string
  label: string
  Icon: IconCmp
  IconSolid?: IconCmp
  badge?: number
  /** Quando true, ativa quando pathname === href (exato). Default: startsWith. */
  exact?: boolean
}

type Props = {
  tabs: DockTab[]
}

export default function DockNav({ tabs }: Props) {
  const pathname = usePathname()
  const [poppedHref, setPoppedHref] = useState<string | null>(null)

  useEffect(() => {
    if (!poppedHref) return
    const t = setTimeout(() => setPoppedHref(null), 280)
    return () => clearTimeout(t)
  }, [poppedHref])

  function isActive(tab: DockTab) {
    if (tab.exact) return pathname === tab.href
    if (tab.href === '/admin' || tab.href === '/profissional') return pathname === tab.href
    return pathname.startsWith(tab.href)
  }

  function handleTap(tab: DockTab) {
    setPoppedHref(tab.href)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(8) } catch { /* noop */ }
    }
  }

  return (
    <nav
      className="admin-dock-wrap fixed left-0 right-0 z-50 px-3"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom) + 10px)',
        pointerEvents: 'none',
      }}
    >
      <div
        className="admin-dock mx-auto"
        style={{
          maxWidth: 480,
          pointerEvents: 'auto',
        }}
      >
        {/* Aurora de fundo bem sutil — vida sem distrair */}
        <div className="admin-dock-aurora" aria-hidden="true" />

        <div className="relative flex items-center justify-around gap-1 px-2 py-2">
          {tabs.map((tab) => {
            const active = isActive(tab)
            const popped = poppedHref === tab.href
            const Icon = active && tab.IconSolid ? tab.IconSolid : tab.Icon

            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => handleTap(tab)}
                aria-current={active ? 'page' : undefined}
                aria-label={tab.label}
                className={`dock-capsule ${active ? 'is-active' : ''}`}
              >
                <span
                  className="dock-icon-wrap"
                  style={{
                    transform: popped ? 'scale(1.18)' : 'scale(1)',
                    transition: 'transform 220ms cubic-bezier(.34,1.56,.64,1)',
                  }}
                >
                  <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="dock-badge" aria-label={`${tab.badge} pendente`}>
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </span>
                <span className="dock-label">{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
