'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useSearchParams } from 'next/navigation'
import ThemeToggle from './ThemeToggle'
import {
  IconHome,
  IconCalendar,
  IconUsers,
  IconWallet,
  IconSettings,
  IconGift,
  IconDollar,
  IconTrendingUp,
  IconSparkles,
  IconUser,
  IconClock,
  IconSearch,
  IconClose,
  IconWhatsapp,
  IconLayers,
} from '@/components/ui/Icon'
import { PACOTE_ENABLED } from '@/lib/feature-flags'

type Props = {
  businessName: string | null
  brandLogoUrl: string | null
  pendingAppointments?: number
  pendingClaims?: number
  /** Dono que TAMBÉM atende vê a aba "Eu" (ganhos próprios). Feature do
   *  agendapro que o Palace não tem — preservar no menu novo. */
  showOwnerTab?: boolean
}

type NavItem = {
  label: string
  href: string
  Icon: (p: { size?: number }) => React.ReactNode
  badge?: number
  exact?: boolean
}

// Portado do palace-system. Scrubs vs origem:
//  - grupo "Segurança/Supervisão" removido (/admin/supervisao não existe aqui)
//  - overlay teal-dark do Palace → neutro rgba(0,0,0,0.55)
// Tudo o mais é var(--admin-*) + props, então adota o tema escuro/claro e a
// marca dinâmica do agendapro automaticamente.
export default function AdminMobileTopBar({
  businessName,
  brandLogoUrl,
  pendingAppointments = 0,
  pendingClaims = 0,
  showOwnerTab = false,
}: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab')
  const [open, setOpen] = useState(false)
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => setPortalReady(true), [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const groups: { label: string; items: NavItem[] }[] = [
    {
      label: 'Painel',
      items: [
        { label: 'Início', href: '/admin/inicio', Icon: IconHome, exact: true },
        { label: 'Atendimentos', href: '/admin', Icon: IconCalendar, badge: pendingAppointments, exact: true },
        ...(showOwnerTab ? [{ label: 'Eu (meus ganhos)', href: '/admin/eu', Icon: IconUser }] : []),
        { label: 'Consultas', href: '/admin/consultas', Icon: IconSearch },
        { label: 'Clientes', href: '/admin/clientes', Icon: IconUsers, badge: pendingClaims },
        { label: 'Cupons', href: '/admin/cupons', Icon: IconGift },
      ],
    },
    {
      label: 'Financeiro',
      items: [
        { label: 'Caixa', href: '/admin/caixa', Icon: IconWallet },
        { label: 'Vendas', href: '/admin/financeiro/vendas', Icon: IconWallet },
        { label: 'Despesas', href: '/admin/financeiro/despesas', Icon: IconWallet },
        { label: 'Comandas', href: '/admin/comandas', Icon: IconWallet },
        { label: 'Fluxo de Caixa', href: '/admin/financeiro/fluxo-caixa', Icon: IconDollar },
        { label: 'Remunerações', href: '/admin/financeiro/remuneracoes', Icon: IconTrendingUp },
      ],
    },
    {
      label: 'Catálogo',
      items: [
        { label: 'Serviços', href: '/admin/configuracoes?tab=servicos', Icon: IconSparkles },
        { label: 'Produtos', href: '/admin/produtos', Icon: IconGift },
        // Combo (serviço + produto) · entrada própria abaixo de Produtos, igual
        // ao desktop (Eduardo 24/07/2026). Já em produção.
        { label: 'Combos', href: '/admin/combos', Icon: IconLayers },
        // Pacote (multi-serviço resgatável) · gated pelo PACOTE_ENABLED.
        ...(PACOTE_ENABLED ? [{ label: 'Pacotes', href: '/admin/pacotes', Icon: IconGift }] : []),
      ],
    },
    {
      label: 'Equipe',
      items: [
        { label: 'Colaboradores', href: '/admin/configuracoes?tab=profissionais', Icon: IconUser },
        { label: 'Horários', href: '/admin/configuracoes?tab=horarios', Icon: IconClock },
      ],
    },
    {
      label: 'Configurações',
      items: [
        { label: 'Negócio', href: '/admin/configuracoes?tab=negocio', Icon: IconSettings },
        { label: 'Fidelidade', href: '/admin/configuracoes?tab=fidelidade', Icon: IconGift },
        { label: 'Maquininhas', href: '/admin/configuracoes?tab=maquininhas', Icon: IconWallet },
        { label: 'Bloqueios', href: '/admin/configuracoes?tab=bloqueios', Icon: IconClock },
        { label: 'Fichas Modelo', href: '/admin/configuracoes?tab=fichas-modelo', Icon: IconSearch },
        { label: 'Aparência', href: '/admin/configuracoes?tab=aparencia', Icon: IconSparkles },
        { label: 'QR Code', href: '/admin/configuracoes?tab=qr-code', Icon: IconSettings },
        { label: 'Mensagens', href: '/admin/configuracoes?tab=mensagens', Icon: IconWhatsapp },
        { label: 'Divulgação', href: '/admin/configuracoes?tab=divulgacao', Icon: IconTrendingUp },
        { label: 'Plano', href: '/admin/configuracoes?tab=plano', Icon: IconDollar },
        { label: 'Importar', href: '/admin/configuracoes?tab=importar', Icon: IconUser },
      ],
    },
    {
      label: 'Outros',
      items: [
        { label: 'Atividades', href: '/admin/atividades', Icon: IconClock },
      ],
    },
  ]

  function isActive(item: NavItem): boolean {
    const [path, query] = item.href.split('?')
    // Itens de Configurações compartilham /admin/configuracoes — distingue pela tab
    if (query?.includes('tab=')) {
      const tab = new URLSearchParams(query).get('tab')
      return pathname.startsWith('/admin/configuracoes') && currentTab === tab
    }
    if (item.exact) return pathname === path
    return pathname.startsWith(path)
  }

  return (
    <>
      {/* Top bar fixa · só mobile (<lg) */}
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
          className="w-10 h-10 rounded-lg flex items-center justify-center -ml-1"
          style={{ color: 'var(--admin-text)' }}
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
            {businessName ?? 'Admin'}
          </p>
        </div>

        <ThemeToggle compact />
      </header>

      {/* Spacer pro conteúdo não ficar embaixo da topbar fixa */}
      <div className="lg:hidden" style={{ height: 56 }} />

      {/* Drawer overlay */}
      {open && portalReady && createPortal(
        <div className="lg:hidden fixed inset-0 z-[200]" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
            onClick={() => setOpen(false)}
          />
          <nav
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] flex flex-col"
            style={{
              background: 'var(--admin-surface)',
              borderRight: '1px solid var(--admin-border)',
              boxShadow: '8px 0 24px rgba(0,0,0,0.3)',
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
                <p className="font-bold truncate" style={{ color: 'var(--admin-text)' }}>
                  {businessName ?? 'Admin'}
                </p>
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

            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
              {groups.map((group) => (
                <div key={group.label}>
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5"
                    style={{ color: 'var(--admin-text-faded)' }}
                  >
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = isActive(item)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                          style={{
                            background: active ? 'var(--admin-surface-hover)' : 'transparent',
                            color: active ? 'var(--admin-text)' : 'var(--admin-text-2)',
                            fontWeight: active ? 600 : 500,
                          }}
                        >
                          <item.Icon size={18} />
                          <span className="text-sm flex-1">{item.label}</span>
                          {item.badge && item.badge > 0 ? (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: '#DC2626', color: '#fff', minWidth: 18, textAlign: 'center' }}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>
        </div>,
        document.body,
      )}
    </>
  )
}
