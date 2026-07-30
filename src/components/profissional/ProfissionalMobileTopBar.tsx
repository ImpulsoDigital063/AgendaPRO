'use client'

/**
 * ProfissionalMobileTopBar · top bar com hambúrguer pra /profissional em < lg.
 * Portado do palace-system (03/06). Scrubs: logo-fallback Palace removido
 * (agendapro mostra só a marca do negócio), overlay teal → neutro.
 * Coexiste com o ProfissionalBottomNav. var(--admin-*) → adota o tema claro.
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  IconHome,
  IconCalendar,
  IconClock,
  IconWallet,
  IconSettings,
  IconClose,
} from '@/components/ui/Icon'

type Props = {
  businessName: string | null
  brandLogoUrl: string | null
  employmentType: 'commissioned' | 'employed'
}

type NavItem = {
  label: string
  href: string
  exact?: boolean
  Icon: (p: { size?: number }) => React.ReactNode
}

const ALL_ITEMS: NavItem[] = [
  { label: 'Início', href: '/profissional', exact: true, Icon: IconHome },
  { label: 'Atendimentos', href: '/profissional', exact: true, Icon: IconCalendar },
  { label: 'Horários', href: '/profissional/horarios', Icon: IconClock },
  // Bloqueios da própria agenda (30/07) · espelha a aba que a dona tem em
  // Configurações → Bloqueios, mas escopada nela
  { label: 'Bloqueios', href: '/profissional/bloqueios', Icon: IconClose },
  { label: 'Financeiro', href: '/profissional/financeiro', Icon: IconWallet },
  { label: 'Conta', href: '/profissional/conta', Icon: IconSettings },
]

export default function ProfissionalMobileTopBar({
  businessName,
  brandLogoUrl,
  employmentType,
}: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => setPortalReady(true), [])
  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const items = employmentType === 'employed'
    ? ALL_ITEMS.filter((i) => i.href !== '/profissional/horarios' && i.href !== '/profissional/financeiro')
    : ALL_ITEMS

  function isActive(item: NavItem): boolean {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  async function handleLogout() {
    const { createClient } = await import('@/lib/supabase/client')
    const sb = createClient()
    await sb.auth.signOut()
    window.location.href = '/profissional/login'
  }

  return (
    <>
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between gap-2 px-3"
        style={{
          height: 56,
          background: 'var(--admin-surface)',
          borderBottom: '1px solid var(--admin-divider)',
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="w-11 h-11 rounded-lg flex items-center justify-center -ml-1"
          style={{ color: 'var(--admin-text)', minHeight: 44, minWidth: 44 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="flex-1 min-w-0 flex items-center justify-center gap-2">
          {brandLogoUrl ? (
            <Image src={brandLogoUrl} alt={businessName ?? ''} width={28} height={28} className="rounded" />
          ) : null}
          <p className="text-sm font-bold truncate" style={{ color: 'var(--admin-text)' }}>
            {businessName ?? 'Profissional'}
          </p>
        </div>

        {/* slot direito vazio · mantém o nome centralizado (toggle removido no light-only) */}
        <div className="w-11" aria-hidden />
      </header>

      <div className="lg:hidden" style={{ height: 56 }} />

      {open && portalReady && createPortal(
        <div className="lg:hidden fixed inset-0 z-[200]" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
            onClick={() => setOpen(false)}
          />
          <nav
            className="absolute inset-y-0 left-0 flex flex-col"
            style={{
              width: 'min(288px, 85vw)',
              background: 'var(--admin-surface)',
              borderRight: '1px solid var(--admin-border)',
              boxShadow: '8px 0 24px rgba(0,0,0,0.3)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <div
              className="flex items-center justify-between gap-2 px-4 py-3 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--admin-divider)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                {brandLogoUrl ? (
                  <Image src={brandLogoUrl} alt={businessName ?? ''} width={32} height={32} className="rounded" />
                ) : null}
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--admin-text)' }}>
                    {businessName ?? 'Profissional'}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-accent)' }}>
                    Painel do Profissional
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="w-9 h-9 rounded-lg flex items-center justify-center -mr-1"
                style={{ color: 'var(--admin-text-mute)' }}
              >
                <IconClose size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
              {items.map((item) => {
                const active = isActive(item)
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg transition-colors"
                    style={{
                      background: active ? 'color-mix(in srgb, var(--admin-accent) 16%, transparent)' : 'transparent',
                      color: active ? 'var(--admin-accent)' : 'var(--admin-text-2)',
                      fontWeight: active ? 600 : 500,
                      minHeight: 44,
                    }}
                  >
                    <item.Icon size={20} />
                    <span className="text-sm flex-1">{item.label}</span>
                  </Link>
                )
              })}
            </div>

            <div className="px-3 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--admin-divider)' }}>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left"
                style={{ color: 'var(--admin-text-mute)', minHeight: 44 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Sair</span>
              </button>
            </div>
          </nav>
        </div>,
        document.body,
      )}
    </>
  )
}
