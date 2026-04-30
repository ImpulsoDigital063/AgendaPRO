import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'
import AppointmentCard from '@/components/AppointmentCard'
import LogoutButton from '@/components/LogoutButton'
import ShareButton from '@/components/ShareButton'
import DivulgarCard from '@/components/admin/DivulgarCard'
import ThemeToggle from '@/components/admin/ThemeToggle'
import ActivityFeed from '@/components/admin/ActivityFeed'
import TodayList from '@/components/admin/TodayList'
import CountUp from '@/components/admin/CountUp'
import Greeting from '@/components/admin/Greeting'
import EmptyTodayCTA from '@/components/admin/EmptyTodayCTA'
import Link from 'next/link'
import Image from 'next/image'
import {
  IconCalendar,
  IconChevronRight,
  IconDollar,
  IconCheck,
  IconClock,
} from '@/components/ui/Icon'

export default async function AdminPage() {
  // user + business cacheados via getCurrentUser/getCurrentBusiness —
  // ja foram resolvidos pelo layout, aqui sao free (mesmo Promise)
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect('/cadastro')

  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekStr = nextWeek.toISOString().split('T')[0]

  // Todas as queries especificas do dashboard rodam EM PARALELO. Antes
  // eram sequenciais (4 awaits, ~800ms-1.2s). Agora 1 round-trip do
  // tempo da query mais lenta (~250ms).
  const supabase = await createClient()
  const [
    { data: appointments },
    { data: upcoming },
    { data: recentActivity },
    { count: pendingClaimsCount },
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select(`*, professional:professionals(name)`)
      .eq('business_id', business.id)
      .eq('appointment_date', today)
      .order('start_time', { ascending: true }),
    supabase
      .from('appointments')
      .select(`*, professional:professionals(name)`)
      .eq('business_id', business.id)
      .gt('appointment_date', today)
      .lte('appointment_date', nextWeekStr)
      .in('status', ['pending', 'confirmed'])
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(10),
    supabase
      .from('activity_log')
      .select('*, professional:professionals(name)')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('review_claims')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('status', 'pending'),
  ])

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const list = appointments || []
  const pending   = list.filter((a) => a.status === 'pending')
  const confirmed = list.filter((a) => a.status === 'confirmed')
  const completed = list.filter((a) => a.status === 'completed')
  const revenue   = [...confirmed, ...completed].reduce((sum, a) => sum + (a.total_price || 0), 0)

  // Cancelados + não-veio vão pro grupo colapsado no fim — não poluem a agenda do dia
  const activeToday   = list.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show')
  const archivedToday = list.filter((a) => a.status === 'cancelled' || a.status === 'no_show')

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      {/* Glow orbs de fundo — animados pra dar atmosfera viva */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="admin-orb-1 absolute -top-32 left-1/2 w-[520px] h-[520px] rounded-full blur-[120px]"
          style={{ background: 'var(--admin-bg-orb-1)' }}
        />
        <div
          className="admin-orb-2 absolute top-[40%] -right-24 w-72 h-72 rounded-full blur-[80px]"
          style={{ background: 'var(--admin-bg-orb-2)' }}
        />
        <div
          className="admin-orb-3 absolute bottom-0 -left-20 w-64 h-64 rounded-full blur-[80px]"
          style={{ background: 'var(--admin-bg-orb-3)' }}
        />
      </div>

      {/* Vignette escurecendo cantos — destaca o conteúdo central */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.18) 100%)',
        }}
      />

      {/* Header */}
      <header className="relative max-w-lg mx-auto px-4 pt-5 pb-5">
        <div className="flex items-center justify-between mb-4">
          <Image
            src="/logo-agendapro-dark.svg"
            alt="AgendaPRO"
            width={92}
            height={18}
            priority
            style={{ filter: 'var(--admin-logo-filter)', opacity: 0.75 }}
          />
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <ShareButton slug={business.slug} />
            <LogoutButton />
          </div>
        </div>
        <p
          className="text-[13px] font-medium mb-1"
          style={{ color: 'var(--admin-text-faded)' }}
        >
          <Greeting />
        </p>
        <h1 className="text-[28px] font-bold tracking-tight leading-tight" style={{ color: 'var(--admin-text)' }}>
          {business.name}
        </h1>
        <p className="text-sm capitalize mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          <span className="inline-flex items-center gap-1.5">
            <IconCalendar size={14} /> {todayFormatted}
          </span>
        </p>
      </header>

      {/* KPIs — faturado dominante, pendentes/confirmados secundários */}
      <section className="relative max-w-lg mx-auto px-4 mb-6 space-y-2.5">
        {/* Faturado: hero card full-width */}
        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 14%, var(--admin-surface)) 0%, color-mix(in srgb, var(--brand-secondary) 12%, var(--admin-surface)) 100%)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <div
            className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-60 pointer-events-none"
            style={{ background: 'rgba(16,185,129,0.25)' }}
          />
          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--admin-text-faded)' }}
              >
                Faturado hoje
              </p>
              <p
                className="text-3xl font-extrabold mt-1 leading-none tabular-nums"
                style={{ color: 'var(--admin-text)' }}
              >
                <CountUp value={revenue} prefix="R$ " localized />
              </p>
              <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-mute)' }}>
                {confirmed.length + completed.length} atendimento{confirmed.length + completed.length === 1 ? '' : 's'} pago{confirmed.length + completed.length === 1 ? '' : 's'}
              </p>
            </div>
            <span
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(16,185,129,0.15)',
                color: 'var(--admin-success)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
            >
              <IconDollar size={22} />
            </span>
          </div>
        </div>

        {/* Pendentes + Confirmados em grid 2 col */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="admin-card p-3.5 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--admin-text-faded)' }}
                >
                  Pendentes
                </p>
                <p
                  className="text-xl font-bold mt-1.5 leading-none tabular-nums"
                  style={{ color: 'var(--admin-warn)' }}
                >
                  <CountUp value={pending.length} duration={500} />
                </p>
              </div>
              <span
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${pending.length > 0 ? 'admin-pulse-warn' : ''}`}
                style={{
                  background: 'rgba(245,158,11,0.15)',
                  color: 'var(--admin-warn)',
                }}
              >
                <IconClock size={16} />
              </span>
            </div>
          </div>

          <div className="admin-card p-3.5 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--admin-text-faded)' }}
                >
                  Confirmados
                </p>
                <p
                  className="text-xl font-bold mt-1.5 leading-none tabular-nums"
                  style={{ color: 'var(--admin-accent)' }}
                >
                  <CountUp value={confirmed.length} duration={500} />
                </p>
              </div>
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'var(--admin-accent-bg)',
                  color: 'var(--admin-accent)',
                }}
              >
                <IconCheck size={16} />
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="relative max-w-lg mx-auto px-4 pb-10 space-y-6">

        {/* Pedidos de pontos por avaliacao aguardando */}
        {pendingClaimsCount && pendingClaimsCount > 0 ? (
          <Link
            href="/admin/configuracoes?tab=fidelidade"
            className="block rounded-2xl p-4 transition-opacity hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.06))',
              border: '1px solid rgba(245,158,11,0.4)',
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.25)', color: '#F59E0B' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
                  {pendingClaimsCount} pedido{pendingClaimsCount > 1 ? 's' : ''} de pontos por avaliação
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                  Confira no Google e aprove pra liberar os pontos
                </p>
              </div>
              <IconChevronRight size={18} style={{ color: '#F59E0B' }} />
            </div>
          </Link>
        ) : null}

        {/* Divulgação */}
        <DivulgarCard
          slug={business.slug}
          appUrl={process.env.NEXT_PUBLIC_APP_URL || 'https://agendapro.net.br'}
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
            <EmptyTodayCTA slug={business.slug} />
          ) : (
            <TodayList active={activeToday} archived={archivedToday} punctualityBonus={business.punctuality_bonus_points ?? 10} />
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
              {upcoming.map((a, i) => (
                <div
                  key={a.id}
                  className="admin-enter"
                  style={{ ['--enter-delay' as string]: `${Math.min(i, 8) * 60}ms` }}
                >
                  <AppointmentCard appointment={a} showDate punctualityBonus={business.punctuality_bonus_points ?? 10} />
                </div>
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

      </div>
    </main>
  )
}
