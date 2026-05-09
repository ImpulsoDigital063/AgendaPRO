import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import {
  getCurrentUser,
  getCurrentBusiness,
  getAppointmentsToday,
  getUpcomingAppointments,
  getRecentActivity,
  getFocoDoDia,
  getOnboardingState,
} from '@/lib/admin-data'
import WelcomeModal from '@/components/admin/onboarding/WelcomeModal'
import OnboardingChecklist from '@/components/admin/onboarding/OnboardingChecklist'
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
import FocoDoDia from '@/components/admin/FocoDoDia'
import Link from 'next/link'
import Image from 'next/image'
import {
  IconCalendar,
  IconDollar,
  IconCheck,
  IconClock,
} from '@/components/ui/Icon'

// Tipo simplificado do business — passado pras sections que precisam
type Business = {
  id: string
  slug: string
  name: string
  punctuality_bonus_points?: number | null
}

/* ============================================================
 * Sections async — cada uma faz sua query (cacheada via
 * unstable_cache) e renderiza dentro de <Suspense>. Streaming
 * permite que cada parte apareça quando seus dados chegam, em
 * vez de bloquear a pagina inteira ate todas as queries voltarem.
 * ============================================================ */

async function KPIsSection({ business }: { business: Business }) {
  const today = new Date().toISOString().split('T')[0]
  const list = await getAppointmentsToday(business.id, today)
  // Atendimento != pagamento. Cada estado tem fonte de verdade própria:
  //   status            → fluxo do atendimento (pending/confirmed/completed)
  //   paid_at != null   → dinheiro entrou no caixa (independente do status)
  // Admin precisa enxergar os dois lados separados pra agir certo.
  const pending = list.filter((a) => a.status === 'pending')
  const aReceber = list.filter(
    (a) =>
      a.paid_at == null &&
      (a.total_price ?? 0) > 0 &&
      (a.status === 'confirmed' || a.status === 'completed')
  )
  const recebidos = list.filter((a) => a.paid_at != null)
  const recebidoTotal = recebidos.reduce((sum, a) => sum + (a.total_price || 0), 0)
  const aReceberTotal = aReceber.reduce((sum, a) => sum + (a.total_price || 0), 0)

  return (
    <section className="relative max-w-lg mx-auto px-4 mb-6 space-y-2.5">
      {/* Recebido HOJE: hero card full-width — só dinheiro que JÁ entrou */}
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
              Recebido hoje
            </p>
            <p
              className="text-3xl font-extrabold mt-1 leading-none tabular-nums"
              style={{ color: 'var(--admin-text)' }}
            >
              <CountUp value={recebidoTotal} prefix="R$ " localized />
            </p>
            <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-mute)' }}>
              {recebidos.length} atendimento{recebidos.length === 1 ? '' : 's'} pago{recebidos.length === 1 ? '' : 's'}
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

      {/* Grid 2 col — duas ações distintas que admin precisa fazer hoje:
            Pendentes  → confirmar agendamento (cliente espera resposta)
            A receber  → confirmar pagamento (caixa fora do livro) */}
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

        <Link
          href="/admin/financeiro"
          className="admin-card p-3.5 relative overflow-hidden block transition-opacity hover:opacity-90"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--admin-text-faded)' }}
              >
                A receber
              </p>
              <p
                className="text-xl font-bold mt-1.5 leading-none tabular-nums"
                style={{ color: 'var(--admin-accent)' }}
              >
                {aReceberTotal > 0 ? (
                  <CountUp value={aReceberTotal} prefix="R$ " localized duration={500} />
                ) : (
                  <CountUp value={0} duration={500} />
                )}
              </p>
              {aReceber.length > 0 && (
                <p className="text-[10px] mt-1" style={{ color: 'var(--admin-text-mute)' }}>
                  {aReceber.length} atendimento{aReceber.length === 1 ? '' : 's'}
                </p>
              )}
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
        </Link>
      </div>
    </section>
  )
}

function KPIsSkeleton() {
  return (
    <section className="relative max-w-lg mx-auto px-4 mb-6 space-y-2.5">
      <div
        className="rounded-2xl h-[110px] skel-pulse"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      />
      <div className="grid grid-cols-2 gap-2.5">
        <div
          className="rounded-2xl h-[78px] skel-pulse"
          style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
        />
        <div
          className="rounded-2xl h-[78px] skel-pulse"
          style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
        />
      </div>
    </section>
  )
}

async function FocoDoDiaSection({ businessId }: { businessId: string }) {
  const data = await getFocoDoDia(businessId)
  return <FocoDoDia data={data} />
}

async function TodaySection({ business }: { business: Business }) {
  const today = new Date().toISOString().split('T')[0]
  const list = await getAppointmentsToday(business.id, today)
  const activeToday = list.filter(
    (a) => a.status !== 'cancelled' && a.status !== 'no_show'
  )
  const archivedToday = list.filter(
    (a) => a.status === 'cancelled' || a.status === 'no_show'
  )

  return (
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
        <TodayList
          active={activeToday}
          archived={archivedToday}
          punctualityBonus={business.punctuality_bonus_points ?? 10}
        />
      )}
    </section>
  )
}

async function UpcomingSection({ business }: { business: Business }) {
  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekStr = nextWeek.toISOString().split('T')[0]

  const upcoming = await getUpcomingAppointments(business.id, today, nextWeekStr)
  if (!upcoming.length) return null

  return (
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
            <AppointmentCard
              appointment={a}
              showDate
              punctualityBonus={business.punctuality_bonus_points ?? 10}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

async function ActivitySection({ businessId }: { businessId: string }) {
  const recentActivity = await getRecentActivity(businessId)
  if (!recentActivity.length) return null

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
        Atividade da equipe
      </p>
      <ActivityFeed activities={recentActivity} />
    </section>
  )
}

/* ============================================================
 * Page principal — header + business name renderizam imediato.
 * Sections com queries ficam dentro de Suspense, streamando
 * conforme cada query termina (skeleton enquanto carrega).
 * ============================================================ */

export default async function AdminPage() {
  // user + business cacheados via React cache() — ja resolvidos pelo layout
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect('/cadastro')

  // Onboarding state — derivado do estado SQL (sem chamadas extras se
  // checklist já está completo, queries são leves em todos os casos).
  const onboarding = await getOnboardingState(business.id, user.id, business)

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

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

      {/* Onboarding checklist — só renderiza se ainda não completou
          tudo (done=false). Fica no topo, acima dos KPIs, pq o admin
          novo precisa ver os passos antes de qualquer coisa. */}
      {!onboarding.done && (
        <OnboardingChecklist
          items={onboarding.items}
          percent={onboarding.percent}
          done={onboarding.done}
          slug={business.slug}
        />
      )}

      {/* Welcome modal · 1ª vez · só client renderiza após delay 400ms */}
      {!onboarding.welcomeModalSeen && (
        <WelcomeModal
          businessName={business.name}
          category={business.description ?? null}
        />
      )}

      {/* KPIs — streaming, fallback skeleton enquanto query carrega */}
      <Suspense fallback={<KPIsSkeleton />}>
        <KPIsSection business={business} />
      </Suspense>

      <div className="relative max-w-lg mx-auto px-4 pb-10 space-y-6">
        {/* Foco do dia — secao proativa: claims + pagamentos pendentes
            + sumidos sem cupom + cupons expirando + lucro motivacional.
            Some inteiro se nada pra mostrar (sem poluir home). */}
        <Suspense fallback={null}>
          <FocoDoDiaSection businessId={business.id} />
        </Suspense>

        {/* Divulgação — estatica, renderiza imediato */}
        <DivulgarCard
          slug={business.slug}
          appUrl={process.env.NEXT_PUBLIC_APP_URL || 'https://agendapro.net.br'}
        />

        {/* Hoje — streaming */}
        <Suspense fallback={null}>
          <TodaySection business={business} />
        </Suspense>

        {/* Próximos dias — streaming, fallback null (some se vazio) */}
        <Suspense fallback={null}>
          <UpcomingSection business={business} />
        </Suspense>

        {/* Atividade da equipe — streaming, fallback null (some se vazio) */}
        <Suspense fallback={null}>
          <ActivitySection businessId={business.id} />
        </Suspense>
      </div>

      {/* Skel pulse pro fallback de KPIs */}
      <style>{`
        @keyframes skelPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.9; }
        }
        .skel-pulse {
          animation: skelPulse 1.4s ease-in-out infinite;
        }
      `}</style>
    </main>
  )
}
