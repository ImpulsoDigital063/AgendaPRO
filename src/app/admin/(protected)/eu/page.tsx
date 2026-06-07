import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Image from 'next/image'
import {
  getCurrentUser,
  getCurrentBusiness,
  getOwnerProfessional,
  getAppointmentsToday,
  getUpcomingAppointments,
} from '@/lib/admin-data'
import AppointmentCard from '@/components/AppointmentCard'
import GradeTimeline from '@/components/admin/desktop/GradeTimeline'
import LogoutButton from '@/components/LogoutButton'
import ThemeToggle from '@/components/admin/ThemeToggle'
import CountUp from '@/components/admin/CountUp'
import {
  IconCalendar,
  IconCheck,
  IconClock,
  IconDollar,
} from '@/components/ui/Icon'
import OwnerPhotoCard from '@/components/admin/eu/OwnerPhotoCard'

/**
 * /admin/eu — Agenda pessoal do dono que também atende.
 *
 * Quando o admin é também professional (V28 + cadastro 30/04+ linkam
 * automaticamente), essa rota mostra os agendamentos DELE isolados
 * do estabelecimento. Mesma sessão, sem login duplo.
 *
 * Filtragem: usa professional_id do owner-prof retornado por
 * getOwnerProfessional. Sem comissão (admin recebe 100% do que atende).
 *
 * Se admin não atende, redireciona pra /admin (gestor puro nem deveria
 * ver o link no bottom nav, mas defesa em profundidade).
 */

type Business = {
  id: string
  name: string
  punctuality_bonus_points?: number | null
}

type OwnerProf = {
  id: string
  name: string
  photo_url?: string | null
}

async function PersonalKPIs({
  business,
  owner,
}: {
  business: Business
  owner: OwnerProf
}) {
  const today = new Date().toISOString().split('T')[0]
  const list = await getAppointmentsToday(business.id, today)
  const meus = list.filter((a) => a.professional_id === owner.id)

  // Mesma semântica das KPIs do admin/page.tsx, agora restritas a este
  // profissional. paid_at != null = entrou no caixa pessoal.
  const recebidos = meus.filter((a) => a.paid_at != null && a.payment_method !== 'courtesy' && a.payment_method !== 'credit')
  const aReceber = meus.filter(
    (a) =>
      a.paid_at == null &&
      (a.total_price ?? 0) > 0 &&
      (a.status === 'confirmed' || a.status === 'completed')
  )
  const pendentes = meus.filter((a) => a.status === 'pending')
  const atendidos = meus.filter((a) => a.status === 'completed')
  const recebidoTotal = recebidos.reduce((sum, a) => sum + (a.total_price || 0), 0)
  const aReceberTotal = aReceber.reduce((sum, a) => sum + (a.total_price || 0), 0)

  return (
    <section className="relative max-w-lg mx-auto px-4 mb-6 space-y-2.5">
      <div
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--admin-success) 14%, var(--admin-surface)) 0%, color-mix(in srgb, var(--admin-accent) 10%, var(--admin-surface)) 100%)',
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

      <div className="grid grid-cols-3 gap-2.5">
        <KPICard
          label="Pendentes"
          value={pendentes.length}
          color="var(--admin-warn)"
          glow="rgba(245,158,11,0.15)"
          Icon={IconClock}
        />
        <KPICard
          label="A receber"
          value={`R$ ${Math.round(aReceberTotal)}`}
          color="var(--admin-accent)"
          glow="var(--admin-accent-bg)"
          Icon={IconCheck}
        />
        <KPICard
          label="Atendidos"
          value={atendidos.length}
          color="var(--admin-success)"
          glow="rgba(16,185,129,0.18)"
          Icon={IconCheck}
        />
      </div>
    </section>
  )
}

function KPICard({
  label,
  value,
  color,
  glow,
  Icon,
}: {
  label: string
  value: number | string
  color: string
  glow: string
  Icon: typeof IconClock
}) {
  return (
    <div className="admin-card p-3 relative overflow-hidden">
      <div className="flex flex-col items-start gap-1.5">
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: glow, color }}
        >
          <Icon size={14} />
        </span>
        <p
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--admin-text-faded)' }}
        >
          {label}
        </p>
        <p
          className="text-base font-bold leading-none tabular-nums"
          style={{ color }}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

async function PersonalTodaySection({
  business,
  owner,
}: {
  business: Business
  owner: OwnerProf
}) {
  const today = new Date().toISOString().split('T')[0]
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
        Seus atendimentos hoje
      </p>
      {/* Grid premium · só a coluna do dono (onlyProfessionalId); KPIs próprios já acima */}
      <GradeTimeline businessId={business.id} date={today} onlyProfessionalId={owner.id} hideKpis />
    </section>
  )
}

async function PersonalUpcomingSection({
  business,
  owner,
}: {
  business: Business
  owner: OwnerProf
}) {
  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekStr = nextWeek.toISOString().split('T')[0]

  const upcoming = await getUpcomingAppointments(business.id, today, nextWeekStr)
  const meus = upcoming.filter((a) => a.professional_id === owner.id)
  if (!meus.length) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
          Seus próximos dias
        </p>
        <span className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>7 dias</span>
      </div>
      <div className="space-y-3">
        {meus.map((a, i) => (
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

export default async function AdminEuPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect('/cadastro')

  const owner = await getOwnerProfessional(user.id, business.id)
  // Defesa em profundidade — se o admin não atende, manda pra home.
  // BottomNav já esconde o link, mas alguém digitando a URL caía aqui.
  if (!owner) redirect('/admin')

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const firstName = owner.name?.split(' ')[0] ?? 'Você'

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="admin-orb-1 absolute -top-32 left-1/2 w-[520px] h-[520px] rounded-full blur-[120px]"
          style={{ background: 'var(--admin-bg-orb-1)' }}
        />
        <div
          className="admin-orb-2 absolute top-[40%] -right-24 w-72 h-72 rounded-full blur-[80px]"
          style={{ background: 'var(--admin-bg-orb-2)' }}
        />
      </div>
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.18) 100%)',
        }}
      />

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
            <LogoutButton />
          </div>
        </div>
        <p
          className="text-[13px] font-medium mb-1"
          style={{ color: 'var(--admin-text-faded)' }}
        >
          Sua agenda pessoal
        </p>
        <h1 className="text-[28px] font-bold tracking-tight leading-tight" style={{ color: 'var(--admin-text)' }}>
          {firstName}
        </h1>
        <p className="text-sm capitalize mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          <span className="inline-flex items-center gap-1.5">
            <IconCalendar size={14} /> {todayFormatted}
          </span>
        </p>
        <p className="text-xs mt-2" style={{ color: 'var(--admin-text-faded)' }}>
          {business.name}
        </p>
      </header>

      {/* Foto pública só faz sentido pra quem ATENDE (aparece pros clientes no
          agendamento). Admin/gestora que não atende não precisa. (Eduardo 07/06) */}
      {owner.does_appointments !== false && (
        <OwnerPhotoCard
          professionalId={owner.id}
          businessId={business.id}
          name={owner.name}
          initialPhotoUrl={owner.photo_url ?? null}
        />
      )}

      <Suspense fallback={null}>
        <PersonalKPIs business={business} owner={owner} />
      </Suspense>

      <div className="relative max-w-lg mx-auto px-4 pb-10 space-y-6">
        <Suspense fallback={null}>
          <PersonalTodaySection business={business} owner={owner} />
        </Suspense>

        <Suspense fallback={null}>
          <PersonalUpcomingSection business={business} owner={owner} />
        </Suspense>
      </div>
    </main>
  )
}
