import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppointmentCard from '@/components/AppointmentCard'
import LogoutButton from '@/components/LogoutButton'
import ShareButton from '@/components/ShareButton'
import DivulgarCard from '@/components/admin/DivulgarCard'
import ThemeToggle from '@/components/admin/ThemeToggle'
import ActivityFeed from '@/components/admin/ActivityFeed'
import Link from 'next/link'
import Image from 'next/image'
import {
  IconCalendar,
  IconChevronRight,
  IconDollar,
  IconInbox,
  IconPalette,
  IconSettings,
  IconUsers,
  IconWallet,
  IconCheck,
  IconClock,
  IconClose,
} from '@/components/ui/Icon'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!business) redirect('/cadastro')

  const today = new Date().toISOString().split('T')[0]

  const { data: appointments } = await supabase
    .from('appointments')
    .select(`*, professional:professionals(name)`)
    .eq('business_id', business.id)
    .eq('appointment_date', today)
    .order('start_time', { ascending: true })

  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekStr = nextWeek.toISOString().split('T')[0]

  const { data: upcoming } = await supabase
    .from('appointments')
    .select(`*, professional:professionals(name)`)
    .eq('business_id', business.id)
    .gt('appointment_date', today)
    .lte('appointment_date', nextWeekStr)
    .in('status', ['pending', 'confirmed'])
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(10)

  // Atividades recentes dos profissionais
  const { data: recentActivity } = await supabase
    .from('activity_log')
    .select('*, professional:professionals(name)')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(8)

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const list = appointments || []
  const pending   = list.filter((a) => a.status === 'pending')
  const confirmed = list.filter((a) => a.status === 'confirmed')
  const cancelled = list.filter((a) => a.status === 'cancelled')
  const revenue   = confirmed.reduce((sum, a) => sum + (a.total_price || 0), 0)

  const stats = [
    {
      value: revenue > 0
        ? 'R$' + revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })
        : 'R$0',
      label: 'Faturado',
      icon: IconDollar,
      color: 'var(--admin-success)',
      glow: 'rgba(16,185,129,0.18)',
    },
    {
      value: pending.length,
      label: 'Pendentes',
      icon: IconClock,
      color: 'var(--admin-warn)',
      glow: 'rgba(245,158,11,0.18)',
    },
    {
      value: confirmed.length,
      label: 'Confirmados',
      icon: IconCheck,
      color: 'var(--admin-accent)',
      glow: 'rgba(59,130,246,0.18)',
    },
    {
      value: cancelled.length,
      label: 'Cancelados',
      icon: IconClose,
      color: 'var(--admin-text-faded)',
      glow: 'rgba(148,163,184,0.15)',
    },
  ]

  const navItems = [
    {
      href: '/admin/configuracoes',
      label: 'Configurações',
      desc: 'Serviços, horários e profissionais',
      icon: IconSettings,
    },
    {
      href: '/admin/configuracoes?tab=aparencia',
      label: 'Aparência',
      desc: 'Personalize cores e tema do seu link',
      icon: IconPalette,
    },
    {
      href: '/admin/clientes',
      label: 'Clientes',
      desc: 'Fidelidade e programa de pontos',
      icon: IconUsers,
    },
    {
      href: '/admin/financeiro',
      label: 'Financeiro',
      desc: 'Faturamento e relatórios',
      icon: IconWallet,
    },
  ]

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      {/* Glow orbs de fundo — dimmed no light */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full blur-[120px]"
          style={{ background: 'var(--admin-bg-orb-1)' }}
        />
        <div
          className="absolute top-[40%] -right-24 w-72 h-72 rounded-full blur-[80px]"
          style={{ background: 'var(--admin-bg-orb-2)' }}
        />
        <div
          className="absolute bottom-0 -left-20 w-64 h-64 rounded-full blur-[80px]"
          style={{ background: 'var(--admin-bg-orb-3)' }}
        />
      </div>

      {/* Header */}
      <header className="relative max-w-lg mx-auto px-4 pt-7 pb-6">
        <div className="flex items-center justify-between mb-6">
          <Image
            src="/logo-agendapro-dark.svg"
            alt="AgendaPRO"
            width={130}
            height={26}
            priority
            style={{ filter: 'var(--admin-logo-filter)' }}
          />
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <ShareButton slug={business.slug} />
            <LogoutButton />
          </div>
        </div>
        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--admin-text)' }}>
          {business.name}
        </h1>
        <p className="text-sm capitalize mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          <span className="inline-flex items-center gap-1.5">
            <IconCalendar size={14} /> {todayFormatted}
          </span>
        </p>
      </header>

      {/* Stats */}
      <section className="relative max-w-lg mx-auto px-4 mb-6">
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="admin-card p-3.5 relative overflow-hidden"
              >
                <div
                  className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-70 pointer-events-none"
                  style={{ background: stat.glow }}
                />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
                      {stat.label}
                    </p>
                    <p className="text-xl font-bold mt-1.5 leading-none" style={{ color: stat.color }}>
                      {stat.value}
                    </p>
                  </div>
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: stat.glow,
                      color: stat.color,
                    }}
                  >
                    <Icon size={16} />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div className="relative max-w-lg mx-auto px-4 pb-10 space-y-6">

        {/* Divulgação */}
        <DivulgarCard
          slug={business.slug}
          appUrl={process.env.NEXT_PUBLIC_APP_URL || 'https://agenda-pro-seven.vercel.app'}
        />

        {/* Hoje */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
              Hoje
            </p>
            {list.length > 0 && (
              <span
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={{
                  background: 'var(--admin-accent-bg)',
                  color: 'var(--admin-accent)',
                  border: '1px solid var(--admin-accent-border)',
                }}
              >
                {list.length} agendamento{list.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {list.length === 0 ? (
            <div className="admin-card p-8 text-center">
              <div
                className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3"
                style={{
                  background: 'var(--admin-accent-bg)',
                  color: 'var(--admin-accent)',
                }}
              >
                <IconInbox size={26} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--admin-text-2)' }}>
                Nenhum agendamento hoje
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                Compartilhe seu link para receber reservas
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((a) => <AppointmentCard key={a.id} appointment={a} />)}
            </div>
          )}
        </section>

        {/* Próximos dias */}
        {upcoming && upcoming.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
                Próximos dias
              </p>
              <span className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>7 dias</span>
            </div>
            <div className="space-y-3">
              {upcoming.map((a) => (
                <AppointmentCard key={a.id} appointment={a} showDate />
              ))}
            </div>
          </section>
        )}

        {/* Atividades dos profissionais */}
        {recentActivity && recentActivity.length > 0 && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
              Atividade da equipe
            </p>
            <ActivityFeed activities={recentActivity} />
          </section>
        )}

        {/* Nav list */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
          }}
        >
          {navItems.map((item, i, arr) => {
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-4 px-4 py-4 transition-colors hover:opacity-100"
                style={{
                  borderBottom: i < arr.length - 1 ? '1px solid var(--admin-divider)' : 'none',
                  color: 'var(--admin-text)',
                }}
              >
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--admin-accent-bg)',
                    color: 'var(--admin-accent)',
                  }}
                >
                  <Icon size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--admin-text)' }}>
                    {item.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                    {item.desc}
                  </p>
                </div>
                <span style={{ color: 'var(--admin-text-faded)' }}>
                  <IconChevronRight size={18} />
                </span>
              </Link>
            )
          })}
        </div>

        <p className="text-center text-xs pb-2" style={{ color: 'var(--admin-text-faded)' }}>
          AgendaPRO · Impulso Digital
        </p>
      </div>
    </main>
  )
}
