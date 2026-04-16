import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import LogoutButton from '@/components/LogoutButton'
import ThemeToggle from '@/components/admin/ThemeToggle'
import ProfAppointmentCard from '@/components/profissional/ProfAppointmentCard'
import WelcomeCard from '@/components/profissional/WelcomeCard'
import {
  IconCalendar,
  IconDollar,
  IconCheck,
  IconClock,
  IconClose,
  IconInbox,
} from '@/components/ui/Icon'

export default async function ProfissionalPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  // Busca o profissional logado
  const { data: professional } = await supabase
    .from('professionals')
    .select('*, business:businesses(name, slug)')
    .eq('auth_user_id', user.id)
    .single()

  if (!professional) redirect('/profissional/login')

  const business = professional.business as { name: string; slug: string }

  const today = new Date().toISOString().split('T')[0]

  // Agendamentos de hoje — só deste profissional
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('professional_id', professional.id)
    .eq('appointment_date', today)
    .order('start_time', { ascending: true })

  // Próximos 7 dias
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekStr = nextWeek.toISOString().split('T')[0]

  const { data: upcoming } = await supabase
    .from('appointments')
    .select('*')
    .eq('professional_id', professional.id)
    .gt('appointment_date', today)
    .lte('appointment_date', nextWeekStr)
    .in('status', ['pending', 'confirmed'])
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(10)

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

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      {/* Glow orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full blur-[120px]"
          style={{ background: 'var(--admin-bg-orb-1)' }}
        />
        <div
          className="absolute top-[40%] -right-24 w-72 h-72 rounded-full blur-[80px]"
          style={{ background: 'var(--admin-bg-orb-2)' }}
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
            <LogoutButton />
          </div>
        </div>
        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--admin-text)' }}>
          {professional.name}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          {business.name}
        </p>
        <p className="text-sm capitalize mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
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
              <div key={stat.label} className="admin-card p-3.5 relative overflow-hidden">
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
                    style={{ background: stat.glow, color: stat.color }}
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
        {/* Boas-vindas */}
        <WelcomeCard professionalName={professional.name} />

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
                Seus agendamentos aparecem aqui automaticamente
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((a) => <ProfAppointmentCard key={a.id} appointment={a} />)}
            </div>
          )}
        </section>

        {/* Próximos dias */}
        {upcoming && upcoming.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
                Proximos dias
              </p>
              <span className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>7 dias</span>
            </div>
            <div className="space-y-3">
              {upcoming.map((a) => (
                <ProfAppointmentCard key={a.id} appointment={a} showDate />
              ))}
            </div>
          </section>
        )}

        <p className="text-center text-xs pb-2" style={{ color: 'var(--admin-text-faded)' }}>
          AgendaPRO · Impulso Digital
        </p>
      </div>
    </main>
  )
}
