import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  IconClock,
  IconGift,
  IconDollar,
  IconChevronRight,
  IconStar,
} from '@/components/ui/Icon'

type Appointment = {
  id: string
  status: string
  paid_at: string | null
  total_price: number | null
  client_name: string
  customer_id: string | null
  start_time: string
}

/**
 * Versão recep do FocoDoDia · ações urgentes na agenda atual:
 *   1. Pagamentos pendentes (cliente atendido sem registrar pagamento)
 *   2. Aniversariantes do mês (cliente faz aniversário agora · sugestão de cupom)
 *   3. Top clientes com pontos pra resgatar (saldo >= menor recompensa ativa)
 *
 * Não bloqueia render: queries paralelas com fallback vazio.
 */
export default async function RecepFocoDoDia({
  businessId,
  todayAppts,
}: {
  businessId: string
  todayAppts: Appointment[]
}) {
  const supabase = await createClient()

  // 1. Pagamentos pendentes hoje (status confirmed/completed, paid_at null, valor > 0)
  const pagamentosPendentes = todayAppts.filter(
    (a) =>
      a.paid_at == null &&
      (a.total_price ?? 0) > 0 &&
      (a.status === 'confirmed' || a.status === 'completed'),
  )
  const aReceberTotal = pagamentosPendentes.reduce(
    (sum, a) => sum + (a.total_price || 0),
    0,
  )

  // 2. Aniversariantes do mês corrente
  const mesAtual = new Date().getMonth() + 1
  const { data: birthdayThisMonth } = await supabase
    .from('customers')
    .select('id, name, phone, birthday')
    .eq('business_id', businessId)
    .not('birthday', 'is', null)
    .limit(50)

  const aniversariantes = (birthdayThisMonth ?? []).filter((c) => {
    if (!c.birthday) return false
    const d = new Date(c.birthday as string)
    return d.getMonth() + 1 === mesAtual
  })

  // 3. Top clientes com pontos pra resgatar
  // Pega a menor recompensa ativa pra calcular threshold
  const { data: rewards } = await supabase
    .from('rewards')
    .select('points_required')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('points_required', { ascending: true })
    .limit(1)

  const threshold = rewards?.[0]?.points_required ?? null
  const { data: topCustomers } = threshold
    ? await supabase
        .from('customers')
        .select('id, name, total_points')
        .eq('business_id', businessId)
        .gte('total_points', threshold)
        .order('total_points', { ascending: false })
        .limit(3)
    : { data: [] }

  const hasContent =
    pagamentosPendentes.length > 0 ||
    aniversariantes.length > 0 ||
    (topCustomers && topCustomers.length > 0)

  if (!hasContent) return null

  return (
    <section className="relative max-w-lg mx-auto px-4 mb-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-faded)' }}>
        Foco do dia
      </p>
      <div
        className="admin-card overflow-hidden divide-y"
        style={{ borderColor: 'var(--admin-divider)' }}
      >
        {/* Pagamentos pendentes */}
        {pagamentosPendentes.length > 0 && (
          <FocoItem
            icon={<IconDollar size={18} />}
            tone="warn"
            title={`${pagamentosPendentes.length} pagamento${pagamentosPendentes.length > 1 ? 's' : ''} pendente${pagamentosPendentes.length > 1 ? 's' : ''}`}
            subtitle={`Total a receber: ${aReceberTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
          />
        )}

        {/* Aniversariantes */}
        {aniversariantes.length > 0 && (
          <FocoItem
            icon={<IconGift size={18} />}
            tone="accent"
            title={`${aniversariantes.length} aniversariante${aniversariantes.length > 1 ? 's' : ''} este mês`}
            subtitle={aniversariantes
              .slice(0, 3)
              .map((c) => c.name)
              .join(' · ')}
          />
        )}

        {/* Top clientes com pontos pra resgatar */}
        {topCustomers && topCustomers.length > 0 && (
          <FocoItem
            icon={<IconStar size={18} />}
            tone="accent"
            title={`${topCustomers.length} cliente${topCustomers.length > 1 ? 's' : ''} com pontos pra resgatar`}
            subtitle={topCustomers
              .map((c) => `${c.name} (${c.total_points}pts)`)
              .join(' · ')}
          />
        )}
      </div>
    </section>
  )
}

function FocoItem({
  icon,
  tone,
  title,
  subtitle,
  href,
}: {
  icon: React.ReactNode
  tone: 'warn' | 'accent' | 'success'
  title: string
  subtitle: string
  href?: string
}) {
  const toneMap = {
    warn: { color: 'var(--admin-warn)', bg: 'rgba(245,158,11,0.15)' },
    accent: { color: 'var(--admin-accent)', bg: 'var(--admin-accent-bg)' },
    success: { color: 'var(--admin-success)', bg: 'rgba(16,185,129,0.15)' },
  }
  const t = toneMap[tone]

  const inner = (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: t.bg, color: t.color }}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--admin-text)' }}>
          {title}
        </p>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--admin-text-mute)' }}>
          {subtitle}
        </p>
      </div>
      {href && (
        <span style={{ color: 'var(--admin-text-faded)' }}>
          <IconChevronRight size={16} />
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-90">
        {inner}
      </Link>
    )
  }
  return inner
}
