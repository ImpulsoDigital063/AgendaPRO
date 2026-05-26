import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentUser,
  getCurrentBusiness,
  getAppointmentsToday,
  getFocoDoDia,
} from '@/lib/admin-data'
import GradeTimeline from '@/components/admin/desktop/GradeTimeline'
import Greeting from '@/components/admin/Greeting'
import FocoDoDia from '@/components/admin/FocoDoDia'
import TopProfsCard from '@/components/admin/TopProfsCard'
import TopServicesCard from '@/components/admin/TopServicesCard'
import TrendReceitaCard from '@/components/admin/TrendReceitaCard'
import OportunidadesCard from '@/components/admin/OportunidadesCard'
import RelatorioFinanceiroCard from '@/components/admin/RelatorioFinanceiroCard'
import CountUp from '@/components/admin/CountUp'
import {
  IconCalendar,
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

  // Vendas de produto pagas hoje · entram no "Recebido hoje"
  const sb = await createClient()
  const { data: salesToday } = await sb
    .from('sales')
    .select('id, total, paid_at')
    .eq('business_id', business.id)
    .eq('type', 'product_sale')
    .eq('status', 'paid')
    .not('payment_method', 'in', '(courtesy,credit)')
    .gte('paid_at', `${today}T00:00:00`)
    .lt('paid_at', `${today}T23:59:59`)
  const productSalesPaidToday = salesToday ?? []
  const recebidoSalesTotal = productSalesPaidToday.reduce((s, p) => s + Number(p.total ?? 0), 0)
  const recebidoSalesCount = productSalesPaidToday.length

  const pending = list.filter((a) => a.status === 'pending')
  const aReceber = list.filter(
    (a) =>
      a.paid_at == null &&
      (a.total_price ?? 0) > 0 &&
      (a.status === 'confirmed' || a.status === 'completed')
  )
  const recebidos = list.filter((a) => a.paid_at != null && a.payment_method !== 'courtesy' && a.payment_method !== 'credit')
  const recebidoApptsTotal = recebidos.reduce((s, a) => s + (a.total_price || 0), 0)
  const recebidoTotal = recebidoApptsTotal + recebidoSalesTotal
  const recebidoCount = recebidos.length + recebidoSalesCount
  const aReceberTotal = aReceber.reduce((s, a) => s + (a.total_price || 0), 0)
  const totalAgendados = list.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show').length

  // "Recebido hoje" foi movido pro RelatorioFinanceiroCard (1º BigKpi)
  // — ficava deslocado aqui isolado dos outros números de receita.
  const cards = [
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
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c) => {
        // Tons 3D · gradient + glow + ícone destacado
        const tones: Record<string, {
          gradient: string
          iconBg: string
          iconFg: string
          glow: string
          accentLine: string
        }> = {
          success: {
            gradient: 'linear-gradient(135deg, rgba(16,185,129,0.10) 0%, var(--admin-surface) 60%)',
            iconBg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            iconFg: '#fff',
            glow: 'rgba(16,185,129,0.35)',
            accentLine: 'linear-gradient(90deg, #10B981, transparent)',
          },
          accent: {
            gradient: 'linear-gradient(135deg, color-mix(in srgb, var(--admin-accent) 10%, transparent) 0%, var(--admin-surface) 60%)',
            iconBg: 'linear-gradient(135deg, var(--brand-primary, var(--admin-accent)) 0%, var(--brand-secondary, var(--admin-accent)) 100%)',
            iconFg: '#fff',
            glow: 'color-mix(in srgb, var(--admin-accent) 35%, transparent)',
            accentLine: 'linear-gradient(90deg, var(--admin-accent), transparent)',
          },
          warn: {
            gradient: 'linear-gradient(135deg, rgba(245,158,11,0.10) 0%, var(--admin-surface) 60%)',
            iconBg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            iconFg: '#fff',
            glow: 'rgba(245,158,11,0.35)',
            accentLine: 'linear-gradient(90deg, #F59E0B, transparent)',
          },
          neutral: {
            gradient: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, var(--admin-surface) 60%)',
            iconBg: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
            iconFg: '#fff',
            glow: 'rgba(99,102,241,0.30)',
            accentLine: 'linear-gradient(90deg, #6366F1, transparent)',
          },
        }
        const toneStyle = tones[c.tone] ?? tones.neutral

        return (
          <Link
            key={c.label}
            href={c.href}
            className="group relative rounded-2xl p-4 overflow-hidden transition-all hover:translate-y-[-2px] hover:shadow-lg"
            style={{
              background: toneStyle.gradient,
              border: '1px solid var(--admin-border)',
              boxShadow: '0 1px 0 0 rgba(255,255,255,0.04) inset',
            }}
          >
            {/* Glow orb · canto superior direito */}
            <span
              className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"
              style={{ background: toneStyle.glow }}
              aria-hidden
            />
            {/* Linha de destaque no topo */}
            <span
              className="pointer-events-none absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: toneStyle.accentLine }}
              aria-hidden
            />

            <div className="relative flex items-start justify-between gap-2">
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
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                style={{
                  background: toneStyle.iconBg,
                  color: toneStyle.iconFg,
                  boxShadow: '0 4px 12px -2px rgba(0,0,0,0.25), inset 0 1px 0 0 rgba(255,255,255,0.20)',
                }}
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
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => (
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
// Agenda do dia · embeda a GradeTimeline (grade nova por profissional)
// substituindo o card "Próximos do dia" mobile-style (AppointmentCard).
// ============================================================

async function AgendaDoDia({ business }: { business: Business }) {
  const today = new Date().toISOString().split('T')[0]
  return (
    <section
      className="rounded-2xl p-4 lg:p-5"
      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
          Agenda do dia
        </h3>
        <Link href="/admin" className="text-xs font-semibold" style={{ color: 'var(--admin-accent)' }}>
          Abrir agenda →
        </Link>
      </div>
      {/* hideKpis: Recebido/A receber/Pendentes já estão no KPIsRow acima */}
      <GradeTimeline businessId={business.id} date={today} hideKpis />
    </section>
  )
}

// ============================================================
// Atalhos rápidos · 4 cards-link no topo
// ============================================================

function AtalhosRapidos() {
  const atalhos = [
    {
      label: 'Novo agendamento',
      href: '/admin',
      Icon: IconCalendar,
      iconBg: 'linear-gradient(135deg, var(--brand-primary, var(--admin-accent)) 0%, var(--brand-secondary, var(--admin-accent)) 100%)',
      glow: 'color-mix(in srgb, var(--admin-accent) 30%, transparent)',
    },
    {
      label: 'Nova venda',
      href: '/admin/financeiro/vendas',
      Icon: IconReceipt,
      iconBg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      glow: 'rgba(16,185,129,0.28)',
    },
    {
      label: 'Novo cliente',
      href: '/admin/clientes',
      Icon: IconUser,
      iconBg: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
      glow: 'rgba(99,102,241,0.28)',
    },
    {
      label: 'Lançar despesa',
      href: '/admin/financeiro/despesas',
      Icon: IconWallet,
      iconBg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      glow: 'rgba(245,158,11,0.28)',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {atalhos.map((a) => (
        <Link
          key={a.label}
          href={a.href}
          className="group relative rounded-xl px-3 py-3 flex items-center gap-2.5 overflow-hidden transition-all hover:translate-y-[-1px] hover:shadow-md"
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            boxShadow: '0 1px 0 0 rgba(255,255,255,0.04) inset',
          }}
        >
          <span
            className="pointer-events-none absolute -top-6 -right-6 w-16 h-16 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity"
            style={{ background: a.glow }}
            aria-hidden
          />
          <span
            className="relative w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
            style={{
              background: a.iconBg,
              color: '#fff',
              boxShadow: '0 3px 8px -2px rgba(0,0,0,0.25), inset 0 1px 0 0 rgba(255,255,255,0.20)',
            }}
          >
            <a.Icon size={16} />
          </span>
          <span className="relative text-xs font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
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
    <main className="relative sm:overflow-hidden" style={{ minHeight: '100svh' }}>
      <div className="max-w-7xl mx-auto px-4 lg:px-6 pt-6 pb-32 lg:pb-12 space-y-6 relative">
        {/* Header mobile · simples · sem gradient/logo · isolado de qualquer mudança desktop
            Regra cravada 19/05: mudança no mobile ≠ mudança no desktop · vide AGENTS.md */}
        <header className="sm:hidden">
          <p className="text-sm font-medium" style={{ color: 'var(--admin-text-faded)' }}>
            <Greeting />, {business.name}
          </p>
          <h1 className="text-2xl font-bold tracking-tight mt-1" style={{ color: 'var(--admin-text)' }}>
            Painel inicial
          </h1>
          <p className="text-sm capitalize mt-1 inline-flex items-center gap-1.5" style={{ color: 'var(--admin-text-mute)' }}>
            <IconCalendar size={14} /> {todayFormatted}
          </p>
        </header>

        {/* Header desktop · hero com gradient + logo + decoração de canto
            Só desktop (sm:block) · não toca em mobile */}
        <header
          className="hidden sm:block relative rounded-3xl overflow-hidden p-6 lg:p-8"
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
              <div className="relative w-32 h-32 lg:w-40 lg:h-40 flex-shrink-0">
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
              <AgendaDoDia business={business} />
            </Suspense>
            <Suspense fallback={null}>
              <RelatorioFinanceiroCard businessId={business.id} />
            </Suspense>
            <Suspense fallback={null}>
              <FocoDoDiaSection businessId={business.id} />
            </Suspense>
          </div>

          {/* Coluna direita (1/3) */}
          <div className="space-y-4">
            <Suspense fallback={null}>
              <OportunidadesCard businessId={business.id} businessName={business.name} />
            </Suspense>
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
