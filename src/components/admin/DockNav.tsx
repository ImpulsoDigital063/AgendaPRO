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
        {/* Aurora glow externo */}
        <div className="admin-dock-aurora" aria-hidden="true" />

        <div className="relative flex items-stretch">
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
                className="dock-tab flex-1 flex flex-col items-center justify-center gap-0.5 relative"
                style={{
                  paddingTop: 10,
                  paddingBottom: 10,
                  color: active ? 'var(--admin-accent)' : 'var(--admin-text-faded)',
                }}
              >
                {active && (
                  <>
                    {/* Pill translúcida atrás do ícone */}
                    <span
                      aria-hidden="true"
                      className="dock-pill absolute"
                      style={{
                        top: 4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 52,
                        height: 38,
                        borderRadius: 999,
                        background:
                          'linear-gradient(135deg, color-mix(in srgb, var(--admin-accent) 22%, transparent) 0%, color-mix(in srgb, #06B6D4 18%, transparent) 60%, color-mix(in srgb, #A78BFA 16%, transparent) 100%)',
                        border: '1px solid color-mix(in srgb, var(--admin-accent) 35%, transparent)',
                        boxShadow:
                          '0 8px 22px -8px color-mix(in srgb, var(--admin-accent) 60%, transparent), inset 0 1px 0 0 color-mix(in srgb, white 18%, transparent)',
                      }}
                    />
                    {/* Aurora glow sob o ícone, animada */}
                    <span
                      aria-hidden="true"
                      className="dock-glow absolute pointer-events-none"
                      style={{
                        top: -2,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 90,
                        height: 64,
                        background:
                          'radial-gradient(closest-side, color-mix(in srgb, var(--admin-accent) 38%, transparent), transparent 75%)',
                        filter: 'blur(8px)',
                      }}
                    />
                  </>
                )}

                <span
                  className="relative inline-flex items-center justify-center"
                  style={{
                    transform: popped ? 'scale(1.18)' : active ? 'scale(1.06)' : 'scale(1)',
                    transition: 'transform 220ms cubic-bezier(.34,1.56,.64,1)',
                  }}
                >
                  <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className="absolute"
                      style={{
                        top: -6,
                        right: -10,
                        minWidth: 18,
                        height: 18,
                        padding: '0 5px',
                        borderRadius: 999,
                        background: 'var(--admin-danger, #EF4444)',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                        boxShadow:
                          '0 4px 10px -2px color-mix(in srgb, var(--admin-danger, #EF4444) 60%, transparent)',
                        border: '1.5px solid var(--admin-bottomnav-bg)',
                      }}
                    >
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </span>

                <span
                  className="relative text-[10.5px] font-semibold tracking-wide"
                  style={{
                    color: active ? 'var(--admin-accent)' : 'var(--admin-text-faded)',
                    opacity: active ? 1 : 0.85,
                  }}
                >
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
