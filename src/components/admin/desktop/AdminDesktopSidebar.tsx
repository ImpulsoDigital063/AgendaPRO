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
  IconSearch,
  IconPalette,
  IconUpload,
  IconCamera,
  IconMapPin,
  IconLayers,
} from '@/components/ui/Icon'
import { PACOTE_ENABLED } from '@/lib/feature-flags'

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
  /** businesses.convenios_enabled · mostra a entrada de Convênios */
  convenios?: boolean
  /** v141 · negócio que não vende produto não vê Produtos no menu (CAF). */
  vendasBalcao?: boolean
  /** v140 · businesses.cartao_presente_enabled · mostra o Cartão Presente */
  cartaoPresente?: boolean
}

export default function AdminDesktopSidebar({ brand, pendingAppointments = 0, pendingClaims = 0, convenios = false, cartaoPresente = false, vendasBalcao = true }: Props) {
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
        { label: 'Consultas', href: '/admin/consultas', Icon: IconSearch },
        { label: 'Clientes', href: '/admin/clientes', Icon: IconUsers, badge: pendingClaims },
        // Convênio PJ · só existe pra quem tem businesses.convenios_enabled
        ...(convenios ? [{ label: 'Convênios', href: '/admin/convenios', Icon: IconUsers }] : []),
        { label: 'Cupons', href: '/admin/cupons', Icon: IconGift },
        /* WhatsApp no PAINEL, não em Configurações (Eduardo, 21/08): quando o
           canal cai os avisos param em silêncio, e a dona precisa ver isso na
           tela que ela abre todo dia — não a quatro cliques. */
        /* VOLTOU PRO MENU em 31/08, e o motivo mudou o argumento de 21/08.
           Naquele dia a tela so servia pro canal automatico, que nao
           entregava — deixar no menu era prometer o que nao existia.
           Hoje ela hospeda TAMBEM o WhatsApp manual (o wa.me que sai do
           numero da propria dona), que e gratis, funciona e todo negocio
           usa. Esse pedaco nao depende de canal nenhum.
           Deixar de fora agora e o erro oposto: esconder o que funciona pra
           proteger o que ainda nao foi liberado. */
        { label: 'WhatsApp', href: '/admin/whatsapp', Icon: IconWhatsapp },
      ],
    },
    {
      label: 'Financeiro',
      items: [
        { label: 'Caixa', href: '/admin/caixa', Icon: IconWallet },
        { label: 'Vendas', href: '/admin/financeiro/vendas', Icon: IconWallet },
        { label: 'Despesas', href: '/admin/financeiro/despesas', Icon: IconReceipt },
        { label: 'Comandas', href: '/admin/comandas', Icon: IconReceipt },
        { label: 'Fluxo de Caixa', href: '/admin/financeiro/fluxo-caixa', Icon: IconDollar },
        { label: 'Sinal', href: '/admin/financeiro/sinal', Icon: IconDollar },
        { label: 'Remunerações', href: '/admin/financeiro/remuneracoes', Icon: IconTrendingUp },
        { label: 'Notas Fiscais', Icon: IconFile, comingSoon: true },
      ],
    },
    {
      label: 'Catálogo',
      items: [
        { label: 'Serviços', href: '/admin/configuracoes?tab=servicos', tabMatch: 'servicos', Icon: IconSparkles },
        // Clínica que só presta serviço não tem catálogo de produto: a entrada
        // some junto com o botão de venda no balcão (Eduardo, 27/08).
        ...(vendasBalcao ? [{ label: 'Produtos', href: '/admin/produtos', Icon: IconPackage }] : []),
        // Combo (serviço + produto vendidos juntos) · entrada própria abaixo de
        // Produtos (Eduardo 24/07/2026). Já está pronto e em produção.
        { label: 'Combos', href: '/admin/combos', Icon: IconLayers },
        // Pacote (multi-serviço resgatável) · gated pelo PACOTE_ENABLED. Ligado =
        // link real; desligado = "em breve".
        PACOTE_ENABLED
          ? { label: 'Pacotes', href: '/admin/pacotes', Icon: IconGift }
          : { label: 'Pacotes', Icon: IconGift, comingSoon: true },
        // v140 · vale-presente · só pra quem contratou (chave por negócio)
        ...(cartaoPresente
          ? [{ label: 'Cartão Presente', href: '/admin/cartao-presente', Icon: IconGift }]
          : []),
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
        /* Isto NUNCA foi conexão de WhatsApp: é o cartaz com QR Code do link
           de agendamento, pra imprimir e colar no balcão. Com a central de
           WhatsApp no Painel, manter o nome antigo aqui daria duas abas
           "WhatsApp" que não têm nada a ver uma com a outra. */
        { label: 'Cartaz de agendamento', href: '/admin/configuracoes?tab=qr-code', tabMatch: 'qr-code', Icon: IconShare },
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

      {/* Footer · Plano · escondido pro Palace (sistema próprio R$2.997 · sem mensalidade) */}
      {brand.business_slug !== 'palace-nail-spa' && (
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
      )}
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
 * Brand area customizada do Palace Nail Spa · usa a logo OFICIAL PNG
 * (versão dourado + turquesa em fundo creme) que o Marko entregou.
 * Nada de SVG simplificado · marca é fiel ao arquivo original.
 *
 * Exclusiva Palace (cravado por Eduardo 20/05). Outros businesses usam
 * o padrão default (BrandHeaderLogo).
 */
function PalaceBrandArea({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  // Logo TRADICIONAL/PRINCIPAL: fundo turquesa #1AA9A8 com símbolo dourado
  // e wordmark PALACE branco. É a versão oficial cravada por Marko.
  // Variações com fundo creme/nude aparecem em OUTRAS telas (não na principal).
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
          style={{ background: '#1AA9A8' }}
        >
          <Image
            src="/brand/palace/logo-on-teal.png"
            alt="Palace"
            width={96}
            height={96}
            style={{
              width: 48,
              height: 70,
              objectFit: 'cover',
              objectPosition: 'center top',
              marginTop: 4,
            }}
            priority
          />
        </div>
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
    <div className="flex items-center gap-2">
      {/* Logo tradicional · fundo turquesa com símbolo dourado + PALACE branco */}
      <div
        className="rounded-2xl overflow-hidden flex-shrink-0"
        style={{ background: '#1AA9A8' }}
      >
        <Image
          src="/brand/palace/logo-on-teal.png"
          alt="Palace Nail Spa"
          width={140}
          height={140}
          style={{ width: 110, height: 110, objectFit: 'contain', display: 'block' }}
          priority
        />
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-label="Recolher menu"
        className="ml-auto p-1.5 rounded-lg flex-shrink-0"
        style={{ color: 'var(--admin-text-mute)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
    </div>
  )
}
