import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'
import SubPageHeader from '@/components/admin/SubPageHeader'

type CardItem = {
  title: string
  description: string
  href?: string
  Icon: () => React.ReactNode
  badge?: 'Novo' | null
  comingSoon?: boolean
}

const ICONS = {
  dollar: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  calendar: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  users: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  user: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  userMinus: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  ),
  userCheck: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" />
    </svg>
  ),
  bag: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  sparkles: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l2.5 6L21 12l-6.5 3L12 21l-2.5-6L3 12l6.5-3z" />
    </svg>
  ),
  package: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><line x1="12" y1="13" x2="12" y2="21" />
    </svg>
  ),
  tag: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  chevron: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
}

const items: CardItem[] = [
  {
    title: 'Relatório Financeiro',
    description: 'Confira valores recebidos, despesas e dados sobre o seu negócio',
    href: '/admin/financeiro',
    Icon: ICONS.dollar,
    badge: 'Novo',
  },
  {
    title: 'Relatório de Atendimentos',
    description: 'Detalhes dos atendimentos realizados por período',
    Icon: ICONS.calendar,
    comingSoon: true,
  },
  {
    title: 'Colaboradores',
    description: 'Confira os colaboradores mais rentáveis pro seu negócio',
    Icon: ICONS.user,
    comingSoon: true,
  },
  {
    title: 'Clientes',
    description: 'Confira os dados dos seus clientes, gasto médio e mais',
    href: '/admin/clientes',
    Icon: ICONS.users,
  },
  {
    title: 'Clientes Sumidos',
    description: 'Confira os clientes sumidos e o tempo de ausência',
    href: '/admin/sumidos',
    Icon: ICONS.userMinus,
  },
  {
    title: 'Clientes Ativos',
    description: 'Clientes que realizaram atendimentos recentemente',
    Icon: ICONS.userCheck,
    comingSoon: true,
  },
  {
    title: 'Serviços',
    description: 'Dados sobre serviços mais realizados no período',
    Icon: ICONS.sparkles,
    comingSoon: true,
  },
  {
    title: 'Pacotes',
    description: 'Dados sobre pacotes vendidos no período',
    Icon: ICONS.bag,
    comingSoon: true,
  },
  {
    title: 'Produtos',
    description: 'Dados sobre produtos vendidos no período',
    Icon: ICONS.package,
    comingSoon: true,
  },
  {
    title: 'Descontos',
    description: 'Descontos pré-cadastrados e aplicados',
    Icon: ICONS.tag,
    comingSoon: true,
  },
]

export default async function RelatoriosPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect(await destinoSemNegocio())

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <div className="relative">
        <SubPageHeader title="Relatórios" subtitle={business.name} />
        <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-7xl lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
            {items.map((item, idx) => {
              const Icon = item.Icon
              const content = (
                <div
                  className="rounded-2xl p-5 flex items-start gap-4 transition relative hover:translate-y-[-1px]"
                  style={{
                    background: 'var(--admin-surface)',
                    border: '1px solid var(--admin-border)',
                    opacity: item.comingSoon ? 0.5 : 1,
                    cursor: item.comingSoon ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span
                    className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'color-mix(in srgb, var(--admin-accent) 12%, transparent)',
                      color: 'var(--admin-accent)',
                    }}
                  >
                    <Icon />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.badge === 'Novo' && (
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                          style={{ background: 'var(--admin-accent)', color: '#fff' }}
                        >
                          Novo
                        </span>
                      )}
                      {item.comingSoon && (
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                          style={{ background: 'var(--admin-surface-hi)', color: 'var(--admin-text-faded)' }}
                        >
                          Em breve
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold mb-1 leading-tight" style={{ color: 'var(--admin-text)' }}>
                      {item.title}
                    </h3>
                    <p className="text-sm leading-snug" style={{ color: 'var(--admin-text-mute)' }}>
                      {item.description}
                    </p>
                  </div>
                  {!item.comingSoon && (
                    <span className="flex-shrink-0 self-center" style={{ color: 'var(--admin-text-faded)' }}>
                      <ICONS.chevron />
                    </span>
                  )}
                </div>
              )

              if (item.comingSoon || !item.href) {
                return <div key={idx}>{content}</div>
              }

              return (
                <Link key={idx} href={item.href} prefetch={false}>
                  {content}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}
