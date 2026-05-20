'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import {
  IconHome,
  IconCalendar,
  IconUsers,
  IconWallet,
  IconSettings,
  IconWhatsapp,
  IconUser,
  IconTrendingUp,
  IconSparkles,
  IconFile,
  IconInbox,
  IconGift,
  IconDollar,
  IconClock,
  IconStar,
  IconShare,
  IconPalette,
  IconUpload,
  IconCamera,
  IconMapPin,
} from '@/components/ui/Icon'

type Brand = {
  business_name?: string | null
  business_slug?: string | null
  brand_logo_url?: string | null
}

type SidebarItem = {
  label: string
  href?: string
  /** Match exato (default false → startsWith). */
  exact?: boolean
  /** Quando ativo, checar searchParams tab pra item de sub-aba. */
  tabMatch?: string
  Icon: (p: { size?: number }) => ReactNode
  comingSoon?: boolean
  badge?: number
}

type SidebarGroup = {
  label: string
  items: SidebarItem[]
}

type Props = {
  brand: Brand
  pendingAppointments?: number
  pendingClaims?: number
}

export default function AdminDesktopSidebar({ brand, pendingAppointments = 0, pendingClaims = 0 }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab')
  const [collapsed, setCollapsed] = useState(false)

  const groups: SidebarGroup[] = [
    {
      label: 'Painel',
      items: [
        { label: 'Início', href: '/admin/inicio', exact: true, Icon: IconHome },
        { label: 'Atendimentos', href: '/admin', exact: true, Icon: IconCalendar, badge: pendingAppointments },
        { label: 'Clientes', href: '/admin/clientes', Icon: IconUsers, badge: pendingClaims },
      ],
    },
    {
      label: 'Financeiro',
      items: [
        { label: 'Vendas', href: '/admin/financeiro/vendas', Icon: IconWallet },
        { label: 'Despesas', href: '/admin/financeiro/despesas', Icon: IconReceipt },
        { label: 'Comandas', Icon: IconInbox, comingSoon: true },
        { label: 'Fluxo de Caixa', href: '/admin/financeiro/fluxo-caixa', Icon: IconDollar },
        { label: 'Remunerações', href: '/admin/financeiro/remuneracoes', Icon: IconTrendingUp },
        { label: 'Notas Fiscais', Icon: IconFile, comingSoon: true },
      ],
    },
    {
      label: 'Catálogo',
      items: [
        { label: 'Serviços', href: '/admin/configuracoes?tab=servicos', tabMatch: 'servicos', Icon: IconSparkles },
        { label: 'Produtos', Icon: IconPackage, comingSoon: true },
        { label: 'Pacotes', Icon: IconGift, comingSoon: true },
      ],
    },
    {
      label: 'Equipe',
      items: [
        { label: 'Colaboradores', href: '/admin/configuracoes?tab=profissionais', tabMatch: 'profissionais', Icon: IconUser },
        { label: 'Horários', href: '/admin/configuracoes?tab=horarios', tabMatch: 'horarios', Icon: IconClock },
      ],
    },
    {
      label: 'Configurações',
      items: [
        { label: 'Negócio', href: '/admin/configuracoes?tab=negocio', tabMatch: 'negocio', Icon: IconMapPin },
        { label: 'Fidelidade', href: '/admin/configuracoes?tab=fidelidade', tabMatch: 'fidelidade', Icon: IconStar },
        { label: 'Maquininhas', href: '/admin/configuracoes?tab=maquininhas', tabMatch: 'maquininhas', Icon: IconWallet },
        { label: 'Bloqueios', href: '/admin/configuracoes?tab=bloqueios', tabMatch: 'bloqueios', Icon: IconClock },
        { label: 'Aparência', href: '/admin/configuracoes?tab=aparencia', tabMatch: 'aparencia', Icon: IconPalette },
        { label: 'Fichas Modelo', href: '/admin/configuracoes?tab=fichas-modelo', tabMatch: 'fichas-modelo', Icon: IconFile },
        { label: 'WhatsApp', href: '/admin/configuracoes?tab=qr-code', tabMatch: 'qr-code', Icon: IconWhatsapp },
        { label: 'Divulgação', href: '/admin/configuracoes?tab=divulgacao', tabMatch: 'divulgacao', Icon: IconShare },
        { label: 'Importar', href: '/admin/configuracoes?tab=importar', tabMatch: 'importar', Icon: IconUpload },
      ],
    },
    {
      label: 'Outros',
      items: [
        { label: 'Relatórios', href: '/admin/relatorios', Icon: IconChart },
      ],
    },
  ]

  function isActive(item: SidebarItem): boolean {
    if (!item.href) return false
    const [path] = item.href.split('?')
    // Tab-aware match: rota bate E tab bate (ou item não exige tab)
    if (item.tabMatch) {
      return pathname === path && currentTab === item.tabMatch
    }
    if (item.exact) {
      // Sem tab esperada: ativo só se rota bate E não tem tab na URL (ou tab é a default)
      return pathname === path
    }
    return pathname.startsWith(path)
  }

  return (
    <aside
      className="admin-desktop-sidebar hidden lg:flex flex-col"
      data-collapsed={collapsed}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: collapsed ? 72 : 256,
        zIndex: 40,
        background: 'var(--admin-surface)',
        borderRight: '1px solid var(--admin-border)',
        transition: 'width 220ms ease',
      }}
    >
      {/* Brand area · Palace tem versão SVG inline (controle total · sem fundo PNG vazando) */}
      <div
        className="px-4 py-4 flex-shrink-0 relative"
        style={{ borderBottom: '1px solid var(--admin-divider)' }}
      >
        {brand.business_slug === 'palace-nail-spa' ? (
          <PalaceBrandArea collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        ) : (
          <div className="flex items-center gap-2">
            {brand.brand_logo_url ? (
              <span className="flex-shrink-0 w-9 h-9 rounded-xl overflow-hidden" style={{ background: 'var(--admin-surface-hi)' }}>
                <Image
                  src={brand.brand_logo_url}
                  alt="logo"
                  width={36}
                  height={36}
                  style={{ objectFit: 'cover', width: 36, height: 36 }}
                />
              </span>
            ) : (
              <span
                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
                style={{ background: 'var(--admin-accent)', color: '#fff' }}
              >
                {(brand.business_name ?? 'A').slice(0, 1).toUpperCase()}
              </span>
            )}
            {!collapsed && (
              <span
                className="text-sm font-bold truncate"
                style={{ color: 'var(--admin-text)' }}
                title={brand.business_name ?? 'AgendaPRO'}
              >
                {brand.business_name ?? 'AgendaPRO'}
              </span>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
              className="ml-auto p-1.5 rounded-lg flex-shrink-0"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {collapsed ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Nav · agrupado por seção */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {groups.map((group, gIdx) => (
          <div key={gIdx} className={gIdx > 0 ? 'mt-3' : ''}>
            {!collapsed && (
              <p
                className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5"
                style={{ color: 'var(--admin-text-faded)' }}
              >
                {group.label}
              </p>
            )}
            {collapsed && gIdx > 0 && (
              <div className="mx-3 my-2" style={{ borderTop: '1px solid var(--admin-divider)' }} />
            )}
            <div className="space-y-0.5">
              {group.items.map((item, iIdx) => {
                const active = isActive(item)
                const Icon = item.Icon
                const content = (
                  <span
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition"
                    style={{
                      background: active ? 'color-mix(in srgb, var(--admin-accent) 16%, transparent)' : 'transparent',
                      color: active
                        ? 'var(--admin-accent)'
                        : item.comingSoon
                          ? 'var(--admin-text-faded)'
                          : 'var(--admin-text-2)',
                      cursor: item.comingSoon ? 'not-allowed' : 'pointer',
                      opacity: item.comingSoon ? 0.5 : 1,
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="flex-shrink-0 relative">
                      <Icon size={18} />
                      {item.badge !== undefined && item.badge > 0 && !collapsed && (
                        <span
                          aria-label={`${item.badge} pendente`}
                          style={{
                            position: 'absolute',
                            top: -4,
                            right: -6,
                            background: 'var(--admin-danger,#EF4444)',
                            color: '#fff',
                            fontSize: 10,
                            fontWeight: 700,
                            borderRadius: 8,
                            padding: '1px 5px',
                            lineHeight: 1.2,
                          }}
                        >
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="truncate flex-1">{item.label}</span>
                        {item.comingSoon && (
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{
                              background: 'var(--admin-surface-hi)',
                              color: 'var(--admin-text-faded)',
                            }}
                          >
                            Em breve
                          </span>
                        )}
                      </>
                    )}
                  </span>
                )

                if (item.comingSoon || !item.href) {
                  return (
                    <div key={iIdx} aria-disabled="true">
                      {content}
                    </div>
                  )
                }

                return (
                  <Link key={iIdx} href={item.href} prefetch={false}>
                    {content}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer · Plano */}
      <div
        className="px-3 py-3 flex-shrink-0"
        style={{ borderTop: '1px solid var(--admin-divider)' }}
      >
        <Link
          href="/admin/configuracoes?tab=plano"
          prefetch={false}
          className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          {!collapsed && <span className="truncate">Plano e Pagamento</span>}
        </Link>
      </div>
    </aside>
  )
}

/* Ícones que não estão no Icon.tsx · inline aqui pra não poluir o arquivo global */

function IconReceipt({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2H4z" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="12" y2="16" />
    </svg>
  )
}

function IconPackage({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <line x1="12" y1="13" x2="12" y2="21" />
    </svg>
  )
}

function IconChart({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="20" x2="21" y2="20" />
      <rect x="5" y="11" width="3" height="9" />
      <rect x="11" y="6" width="3" height="14" />
      <rect x="17" y="14" width="3" height="6" />
    </svg>
  )
}

/**
 * Brand area customizada do Palace Nail Spa · usa SVG inline pra ter
 * controle total da cor (sem fundo PNG vazando) · wordmark serif
 * estilizado · adapta a expansão da sidebar.
 *
 * Exclusiva Palace (cravado por Eduardo 20/05). Outros businesses usam
 * o padrão default (Image src brand_logo_url + nome).
 */
function PalaceBrandArea({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const palaceTeal = '#1AA9A8'
  const palaceGold = '#C9A87C'

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2">
        <PalaceSymbolMini size={36} color={palaceTeal} />
        <button
          type="button"
          onClick={onToggle}
          aria-label="Expandir menu"
          className="p-1.5 rounded-lg"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <PalaceSymbolMini size={44} color={palaceTeal} />
      <div className="flex-1 min-w-0 leading-tight">
        <p
          className="font-serif tracking-[0.14em] text-[15px] font-semibold"
          style={{ color: palaceTeal, fontFamily: '"Cinzel", "Trajan Pro", Cambria, Georgia, serif' }}
        >
          PALACE
        </p>
        <p
          className="text-[9px] font-medium tracking-[0.35em] uppercase mt-0.5"
          style={{ color: palaceGold }}
        >
          Nail Spa
        </p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-label="Recolher menu"
        className="p-1.5 rounded-lg flex-shrink-0"
        style={{ color: 'var(--admin-text-mute)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
    </div>
  )
}

/**
 * Mini símbolo Palace (ogiva com P caligráfico) inline · usado na brand
 * area. Versão simplificada do PalaceSymbol pra footprint pequeno.
 */
function PalaceSymbolMini({ size = 40, color }: { size?: number; color: string }) {
  return (
    <svg
      width={size}
      height={size * (280 / 200)}
      viewBox="0 0 200 280"
      fill="none"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path
        d="M 100 10 C 60 30, 30 80, 30 140 C 30 200, 70 250, 100 270 C 130 250, 170 200, 170 140 C 170 80, 140 30, 100 10 Z"
        stroke={color}
        strokeWidth="6"
        fill="none"
      />
      <path
        d="M 82 95 L 82 215 M 82 95 C 100 95, 130 100, 130 130 C 130 165, 95 168, 82 165"
        stroke={color}
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}
