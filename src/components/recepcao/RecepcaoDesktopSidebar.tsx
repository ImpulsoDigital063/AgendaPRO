'use client'

/**
 * RecepcaoDesktopSidebar — sidebar lateral fixa pra `/recepcao` em ≥lg.
 * Espelha visualmente o AdminDesktopSidebar mas com escopo enxuto:
 *   - 5 itens só (Início, Atendimentos, Consultas, Cupons, Caixa)
 *   - Sem grupos (lista única flat · recep não tem ramificação tipo Adm)
 *
 * Mobile/tablet abaixo de lg continua usando o RecepcaoBottomNav existente.
 * Esta sidebar é HIDDEN no mobile (`hidden lg:flex`) → zero impacto pra
 * fluxo da Letícia no celular.
 *
 * Cravado 26/05/2026 · Eduardo aprovou plano B (#176).
 */

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { PACOTE_ENABLED } from '@/lib/feature-flags'
import {
  IconHome,
  IconCalendar,
  IconSearch,
  IconGift,
  IconWallet,
  IconClock,
  IconUsers,
  IconFile,
  IconInbox,
  IconStar,
} from '@/components/ui/Icon'

type Brand = {
  business_name?: string | null
  business_slug?: string | null
  brand_logo_url?: string | null
}

type SidebarItem = {
  label: string
  href: string
  exact?: boolean
  Icon: (p: { size?: number }) => ReactNode
}

const ITEMS: SidebarItem[] = [
  { label: 'Início', href: '/recepcao', exact: true, Icon: IconHome },
  { label: 'Comandas', href: '/recepcao/comandas', Icon: IconFile },
  { label: 'Consultas', href: '/recepcao/consultas', Icon: IconSearch },
  { label: 'Clientes', href: '/recepcao/clientes', Icon: IconUsers },
  { label: 'Produtos', href: '/recepcao/produtos', Icon: IconInbox },
  // Pacote (multi-serviço resgatável) · gated pelo PACOTE_ENABLED.
  ...(PACOTE_ENABLED ? [{ label: 'Pacotes', href: '/recepcao/pacotes', Icon: IconGift }] as SidebarItem[] : []),
  { label: 'Cupons', href: '/recepcao/cupons', Icon: IconGift },
  { label: 'Caixa', href: '/recepcao/caixa', Icon: IconWallet },
  // v133 · injetado em runtime quando o negócio passou o horário pra recepção
]

export default function RecepcaoDesktopSidebar({
  brand,
  podeEditarHorario = false,
  tambemAtende = false,
}: {
  brand: Brand
  /** v144 · recepção que também atende: atalho pro financeiro DELA */
  tambemAtende?: boolean
  /** v133 · negócio passou a definição de horário pra recepção */
  podeEditarHorario?: boolean
}) {
  // v133 · o item só existe pra quem tem a chave; os outros negócios seguem
  // com a mesma lista de sempre.
  const base: SidebarItem[] = podeEditarHorario
    ? [...ITEMS, { label: 'Horários', href: '/recepcao/horarios', Icon: IconClock }]
    : ITEMS

  /* v144 · quem acumula balcão e atendimento precisa alcançar a própria
     comissão — o balcão mostra o dinheiro do salão, não o dela. */
  const items: SidebarItem[] = tambemAtende
    ? [
        ...base,
        { label: 'Meus atendimentos', href: '/recepcao/eu', Icon: IconCalendar },
        { label: 'Meus ganhos', href: '/profissional/financeiro', Icon: IconWallet },
      ]
    : base

  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  function isActive(item: SidebarItem): boolean {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  return (
    <aside
      className="hidden md:flex flex-col"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: collapsed ? 72 : 240,
        zIndex: 40,
        background: 'var(--admin-surface)',
        borderRight: '1px solid var(--admin-border)',
        transition: 'width 220ms ease',
      }}
    >
      {/* Brand area */}
      <div
        className="px-4 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--admin-divider)' }}
      >
        <div className="flex items-center gap-2">
          {brand.brand_logo_url ? (
            <span
              className="flex-shrink-0 w-9 h-9 rounded-xl overflow-hidden"
              style={{ background: 'var(--admin-surface-hi)' }}
            >
              <Image
                src={brand.brand_logo_url}
                alt="logo"
                width={36}
                height={36}
                style={{ objectFit: 'cover', width: 36, height: 36 }}
                unoptimized
              />
            </span>
          ) : (
            <span
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              {(brand.business_name ?? 'R').slice(0, 1).toUpperCase()}
            </span>
          )}
          {!collapsed && (
            <span className="flex-1 min-w-0">
              <span
                className="block text-sm font-bold truncate"
                style={{ color: 'var(--admin-text)' }}
                title={brand.business_name ?? 'AgendaPRO'}
              >
                {brand.business_name ?? 'AgendaPRO'}
              </span>
              <span
                className="block text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--admin-accent)' }}
              >
                Painel da Recepção
              </span>
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
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {items.map((item) => {
          const active = isActive(item)
          const Icon = item.Icon
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition"
              style={{
                background: active ? 'color-mix(in srgb, var(--admin-accent) 16%, transparent)' : 'transparent',
                color: active ? 'var(--admin-accent)' : 'var(--admin-text-2)',
              }}
              title={collapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0">
                <Icon size={18} />
              </span>
              {!collapsed && <span className="truncate flex-1">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer · Sair */}
      <div
        className="px-3 py-3 flex-shrink-0"
        style={{ borderTop: '1px solid var(--admin-divider)' }}
      >
        <Link
          href="/profissional/logout"
          prefetch={false}
          className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {!collapsed && <span className="truncate">Sair</span>}
        </Link>
      </div>
    </aside>
  )
}
