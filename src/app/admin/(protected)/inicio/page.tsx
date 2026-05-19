import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  getCurrentUser,
  getCurrentBusiness,
  getAppointmentsToday,
  getFocoDoDia,
} from '@/lib/admin-data'
import AppointmentCard from '@/components/AppointmentCard'
import Greeting from '@/components/admin/Greeting'
import FocoDoDia from '@/components/admin/FocoDoDia'
import TopProfsCard from '@/components/admin/TopProfsCard'
import TopServicesCard from '@/components/admin/TopServicesCard'
import TrendReceitaCard from '@/components/admin/TrendReceitaCard'
import CountUp from '@/components/admin/CountUp'
import {
  IconCalendar,
  IconDollar,
  IconCheck,
  IconClock,
  IconUser,
  IconWallet,
} from '@/components/ui/Icon'
import BrandDecorBackground from '@/components/admin/brand/BrandDecorBackground'
import Image from 'next/image'

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

export const dynamic = 'force-dynamic'

type Business = {
  id: string
  slug: string
  name: string
  brand_logo_url?: string | null
  punctuality_bonus_points?: number | null
}

// ============================================================
// KPIs · 4 cards horizontais (Recebido · A receber · Hoje · Pendentes)
// ============================================================

async function KPIsRow({ business }: { business: Business }) {
  const today = new Date().toISOString().split('T')[0]
  const list = await getAppointmentsToday(business.id, today)

  const pending = list.filter((a) => a.status === 'pending')
  const aReceber = list.filter(
    (a) =>
      a.paid_at == null &&
      (a.total_price ?? 0) > 0 &&
      (a.status === 'confirmed' || a.status === 'completed')
  )
  const recebidos = list.filter((a) => a.paid_at != null)
  const recebidoTotal = recebidos.reduce((s, a) => s + (a.total_price || 0), 0)
  const aReceberTotal = aReceber.reduce((s, a) => s + (a.total_price || 0), 0)
  const totalAgendados = list.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show').length

  const cards = [
    {
      label: 'Recebido hoje',
      value: recebidoTotal,
      format: 'brl' as const,
      subtitle: `${recebidos.length} pago${recebidos.length === 1 ? '' : 's'}`,
      Icon: IconDollar,
      tone: 'success',
      href: '/admin/financeiro',
    },
    {
      label: 'A receber',
      value: aReceberTotal,
      format: 'brl' as const,
      subtitle: `${aReceber.length} atendimento${aReceber.length === 1 ? '' : 's'}`,
      Icon: IconCheck,
      tone: 'accent',
      href: '/admin/financeiro/vendas',
    },
    {
      label: 'Atendimentos hoje',
      value: totalAgendados,
      format: 'count' as const,
      subtitle: totalAgendados === 1 ? 'agendado' : 'agendados',
      Icon: IconCalendar,
      tone: 'neutral',
      href: '/admin',
    },
    {
      label: 'Pendentes',
      value: pending.length,
      format: 'count' as const,
      subtitle: 'aguardando confirmação',
      Icon: IconClock,
      tone: 'warn',
      href: '/admin',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => {
        const tones: Record<string, { bg: string; fg: string }> = {
          success: { bg: 'rgba(16,185,129,0.15)', fg: 'var(--admin-success)' },
          accent: { bg: 'var(--admin-accent-bg)', fg: 'var(--admin-accent)' },
          warn: { bg: 'rgba(245,158,11,0.15)', fg: 'var(--admin-warn)' },
          neutral: { bg: 'color-mix(in srgb, var(--admin-text-faded) 12%, transparent)', fg: 'var(--admin-text)' },
        }
        const toneStyle = tones[c.tone] ?? tones.neutral

        return (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-2xl p-4 transition-all hover:translate-y-[-1px]"
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                  {c.label}
                </p>
                <p className="text-2xl font-bold tabular-nums mt-1.5 leading-none" style={{ color: 'var(--admin-text)' }}>
                  {c.format === 'brl' ? (
                    <CountUp value={c.value} prefix="R$ " localized duration={500} />
                  ) : (
                    <CountUp value={c.value} duration={500} />
                  )}
                </p>
                <p className="text-[10px] mt-2" style={{ color: 'var(--admin-text-mute)' }}>
                  {c.subtitle}
                </p>
              </div>
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: toneStyle.bg, color: toneStyle.fg }}
              >
                <c.Icon size={18} />
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function KPIsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-2xl h-[110px] skel-pulse"
          style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
        />
      ))}
    </div>
  )
}

// ============================================================
// Próximos do dia · até 3 cards lado-a-lado (apenas dia atual)
// ============================================================

async function ProximosDoDia({ business }: { business: Business }) {
  const today = new Date().toISOString().split('T')[0]
  const list = await getAppointmentsToday(business.id, today)
  const now = new Date()
  const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`

  const futuros = list
    .filter((a) => a.status !== 'cancelled' && a.status !== 'no_show')
    .filter((a) => a.start_time >= nowStr)
    .slice(0, 5)

  return (
    <section
      className="rounded-2xl p-5"
      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
          Próximos do dia
        </h3>
        <Link href="/admin" className="text-xs font-semibold" style={{ color: 'var(--admin-accent)' }}>
          Ver agenda →
        </Link>
      </div>

      {futuros.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm" style={{ color: 'var(--admin-text-faded)' }}>
            Sem atendimentos restantes hoje
          </p>
          <Link
            href="/admin"
            className="inline-block mt-3 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider"
            style={{ background: 'var(--admin-accent)', color: '#fff' }}
          >
            + Novo agendamento
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {futuros.map((a) => (
            <AppointmentCard
              key={a.id}
              appointment={a}
              punctualityBonus={business.punctuality_bonus_points ?? 10}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// ============================================================
// Atalhos rápidos · 4 cards-link no topo
// ============================================================

function AtalhosRapidos() {
  const atalhos = [
    { label: 'Novo agendamento', href: '/admin', Icon: IconCalendar, bg: 'var(--admin-accent-bg)', fg: 'var(--admin-accent)' },
    { label: 'Nova venda', href: '/admin/financeiro/vendas', Icon: IconReceipt, bg: 'rgba(16,185,129,0.15)', fg: 'var(--admin-success)' },
    { label: 'Novo cliente', href: '/admin/clientes', Icon: IconUser, bg: 'rgba(99,102,241,0.15)', fg: '#818CF8' },
    { label: 'Lançar despesa', href: '/admin/financeiro/despesas', Icon: IconWallet, bg: 'rgba(245,158,11,0.15)', fg: 'var(--admin-warn)' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {atalhos.map((a) => (
        <Link
          key={a.label}
          href={a.href}
          className="rounded-xl px-3 py-3 flex items-center gap-2.5 transition-all hover:translate-y-[-1px]"
          style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
        >
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: a.bg, color: a.fg }}
          >
            <a.Icon size={16} />
          </span>
          <span className="text-xs font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
            {a.label}
          </span>
        </Link>
      ))}
    </div>
  )
}

// ============================================================
// FocoDoDia wrapper
// ============================================================

async function FocoDoDiaSection({ businessId }: { businessId: string }) {
  const data = await getFocoDoDia(businessId)
  return <FocoDoDia data={data} />
}

// ============================================================
// Page
// ============================================================

export default async function AdminInicioPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect('/cadastro')

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <main className="relative overflow-hidden" style={{ minHeight: '100svh' }}>
      <div className="max-w-7xl mx-auto px-4 lg:px-6 pt-6 pb-32 lg:pb-12 space-y-6 relative">
        {/* Header · saudação · hero com logo da marca no canto */}
        <header
          className="relative rounded-3xl overflow-hidden p-6 lg:p-8"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary, var(--admin-accent)) 12%, var(--admin-surface)) 0%, color-mix(in srgb, var(--brand-secondary, var(--admin-accent)) 8%, var(--admin-surface)) 100%)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <BrandDecorBackground pattern="corner" brand={business.slug} />
          <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--admin-text-mute)' }}>
                <Greeting />, {business.name}
              </p>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-1" style={{ color: 'var(--admin-text)' }}>
                Painel inicial
              </h1>
              <p className="text-sm capitalize mt-1 inline-flex items-center gap-1.5" style={{ color: 'var(--admin-text-mute)' }}>
                <IconCalendar size={14} /> {todayFormatted}
              </p>
            </div>
            {business.brand_logo_url && (
              <div className="hidden sm:block relative w-32 h-32 lg:w-40 lg:h-40 flex-shrink-0">
                <Image
                  src={business.brand_logo_url}
                  alt={business.name}
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                  unoptimized
                />
              </div>
            )}
          </div>
        </header>

        {/* Atalhos rápidos */}
        <AtalhosRapidos />

        {/* KPIs */}
        <Suspense fallback={<KPIsSkeleton />}>
          <KPIsRow business={business} />
        </Suspense>

        {/* Grid principal · 2 colunas em desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Coluna esquerda (2/3) */}
          <div className="lg:col-span-2 space-y-4">
            <Suspense fallback={null}>
              <ProximosDoDia business={business} />
            </Suspense>
            <Suspense fallback={null}>
              <FocoDoDiaSection businessId={business.id} />
            </Suspense>
          </div>

          {/* Coluna direita (1/3) */}
          <div className="space-y-4">
            <Suspense fallback={null}>
              <TrendReceitaCard businessId={business.id} />
            </Suspense>
            <Suspense fallback={null}>
              <TopProfsCard businessId={business.id} />
            </Suspense>
            <Suspense fallback={null}>
              <TopServicesCard businessId={business.id} />
            </Suspense>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes skelPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.9; }
        }
        .skel-pulse { animation: skelPulse 1.4s ease-in-out infinite; }
      `}</style>
    </main>
  )
}
