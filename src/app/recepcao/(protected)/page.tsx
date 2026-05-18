import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import LogoutButton from '@/components/LogoutButton'
import ThemeToggle from '@/components/admin/ThemeToggle'
import Greeting from '@/components/admin/Greeting'
import CountUp from '@/components/admin/CountUp'
import RecepAppointmentCard from '@/components/recepcao/RecepAppointmentCard'
import RecepMarcarFAB from '@/components/recepcao/RecepMarcarFAB'
import RecepFocoDoDia from '@/components/recepcao/RecepFocoDoDia'
import {
  IconCalendar,
  IconClock,
  IconDollar,
  IconCheck,
  IconInbox,
  IconUser,
} from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

export default async function RecepcaoAgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  const { data: recep } = await supabase
    .from('professionals')
    .select('id, name, business:businesses(id, name, slug)')
    .eq('auth_user_id', user.id)
    .eq('is_receptionist', true)
    .single()

  if (!recep || !recep.business) redirect('/profissional/login')

  const business = recep.business as unknown as { id: string; name: string; slug: string }
  const recepName = (recep.name as string) || 'Recepção'
  const firstName = recepName.split(' ')[0]

  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekStr = nextWeek.toISOString().split('T')[0]

  // Agenda do dia (todos profs)
  const { data: todayAppts } = await supabase
    .from('appointments')
    .select('*, professional:professionals(id, name)')
    .eq('business_id', business.id)
    .eq('appointment_date', today)
    .order('start_time', { ascending: true })

  const { data: upcoming } = await supabase
    .from('appointments')
    .select('*, professional:professionals(id, name)')
    .eq('business_id', business.id)
    .gt('appointment_date', today)
    .lte('appointment_date', nextWeekStr)
    .in('status', ['pending', 'confirmed'])
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(40)

  const list = todayAppts ?? []
  const active = list.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show')
  const pending = active.filter((a) => a.status === 'pending')
  const confirmed = active.filter((a) => a.status === 'confirmed')
  const completed = active.filter((a) => a.status === 'completed')

  // KPI · valores recebidos hoje
  const recebidos = list.filter((a) => a.paid_at != null)
  const recebidoTotal = recebidos.reduce((sum, a) => sum + (a.total_price || 0), 0)

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  // Stats grid · 4 cards
  const stats = [
    {
      label: 'Pendentes',
      value: pending.length,
      icon: IconClock,
      color: 'var(--admin-warn)',
      glow: 'rgba(245,158,11,0.18)',
      pulse: pending.length > 0,
    },
    {
      label: 'Confirmados',
      value: confirmed.length,
      icon: IconCheck,
      color: 'var(--admin-accent)',
      glow: 'rgba(59,130,246,0.18)',
    },
    {
      label: 'Atendidos',
      value: completed.length,
      icon: IconCheck,
      color: 'var(--admin-success)',
      glow: 'rgba(16,185,129,0.18)',
    },
    {
      label: 'Recebido',
      value: recebidoTotal > 0
        ? recebidoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
        : 'R$0',
      icon: IconDollar,
      color: 'var(--admin-success)',
      glow: 'rgba(16,185,129,0.18)',
    },
  ]

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
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
      <header className="relative max-w-lg mx-auto px-4 pt-7 pb-5">
        <div className="flex items-center justify-between mb-5">
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
        <p className="text-[13px] font-medium mb-0.5" style={{ color: 'var(--admin-text-faded)' }}>
          <Greeting />, {firstName}
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-faded)' }}>
          Recepção · {business.name}
        </p>
        <h1 className="text-[26px] font-bold tracking-tight leading-tight" style={{ color: 'var(--admin-text)' }}>
          Sua agenda hoje
        </h1>
        <p className="text-sm capitalize mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          <span className="inline-flex items-center gap-1.5">
            <IconCalendar size={14} /> {todayFormatted}
          </span>
        </p>
      </header>

      {/* KPIs · grid 2x2 */}
      <section className="relative max-w-lg mx-auto px-4 mb-5">
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="admin-card p-3.5 relative overflow-hidden">
                <div
                  className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-70 pointer-events-none"
                  style={{ background: s.glow }}
                />
                <div className="relative flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
                      {s.label}
                    </p>
                    <p className="text-xl font-bold mt-1.5 leading-none tabular-nums" style={{ color: s.color }}>
                      {typeof s.value === 'number' ? <CountUp value={s.value} duration={500} /> : s.value}
                    </p>
                  </div>
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.pulse ? 'admin-pulse-warn' : ''}`}
                    style={{ background: s.glow, color: s.color }}
                  >
                    <Icon size={16} />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Foco do Dia · ações que precisam atenção */}
      <RecepFocoDoDia businessId={business.id} todayAppts={list} />

      <div className="relative max-w-lg mx-auto px-4 pb-32 space-y-6">
        {/* Pendentes em destaque */}
        {pending.length > 0 && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-warn)' }}>
              Aguardando confirmação · {pending.length}
            </p>
            <div className="space-y-3">
              {pending.map((a) => (
                <RecepAppointmentCard key={a.id} appointment={a} businessId={business.id} />
              ))}
            </div>
          </section>
        )}

        {/* Hoje */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
              Hoje
            </p>
            {active.length > 0 && (
              <span
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={{
                  background: 'var(--admin-accent-bg)',
                  color: 'var(--admin-accent)',
                  border: '1px solid var(--admin-accent-border)',
                }}
              >
                {active.length} agendamento{active.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {active.length === 0 ? (
            <div className="admin-card p-8 text-center">
              <div
                className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}
              >
                <IconInbox size={26} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--admin-text-2)' }}>
                Nenhum agendamento hoje
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                Toque em &quot;Marcar novo&quot; pra começar
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {active.filter((a) => a.status !== 'pending').map((a) => (
                <RecepAppointmentCard key={a.id} appointment={a} businessId={business.id} />
              ))}
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
              <span className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
                7 dias
              </span>
            </div>
            <div className="space-y-3">
              {upcoming.map((a) => (
                <RecepAppointmentCard key={a.id} appointment={a} businessId={business.id} showDate />
              ))}
            </div>
          </section>
        )}

        <p className="text-center text-xs pb-2" style={{ color: 'var(--admin-text-faded)' }}>
          AgendaPRO · Impulso Digital
        </p>
      </div>

      <RecepMarcarFAB businessId={business.id} />
    </main>
  )
}
