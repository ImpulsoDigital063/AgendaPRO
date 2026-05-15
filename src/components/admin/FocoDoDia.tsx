import Link from 'next/link'
import type { FocoDoDia } from '@/lib/admin-data'
import { IconChevronRight } from '@/components/ui/Icon'

/**
 * Foco do Dia — secao proativa na home admin.
 *
 * Mostra ate 5 cards de acao: claims, pagamentos pendentes, sumidos
 * sem cupom, cupons expirando, motivacional de lucro. Cada card
 * aparece SO se tem algo relevante (count > 0). Vazios ficam
 * suprimidos pra nao poluir.
 *
 * Filosofia: app deixa de ser "report passivo" (so KPIs) e vira
 * "ferramenta proativa" (3 acoes pra fazer em 5 min). CIC rodada 5
 * sugeriu como melhoria critica de retencao a longo prazo.
 *
 * Inspiracoes: feed iFood do estabelecimento, dashboard Stripe
 * "Today's actions", Nubank "Sua semana".
 */

function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type ActionCard = {
  key: string
  href: string
  bg: string
  border: string
  icon: string
  iconBg: string
  iconColor: string
  title: string
  subtitle: string
  ctaColor: string
}

export default function FocoDoDia({ data }: { data: FocoDoDia }) {
  const cards: ActionCard[] = []

  // 1. Claims pendentes — verde, alta prioridade
  if (data.pendingClaims > 0) {
    cards.push({
      key: 'claims',
      href: '/admin/configuracoes?tab=fidelidade',
      bg: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))',
      border: 'rgba(16,185,129,0.30)',
      icon: '⭐',
      iconBg: 'rgba(16,185,129,0.20)',
      iconColor: '#10B981',
      title: `${data.pendingClaims} pedido${data.pendingClaims > 1 ? 's' : ''} de pontos por avaliação`,
      subtitle: 'Confira no Google e aprove pra liberar os pontos',
      ctaColor: '#10B981',
    })
  }

  // 2. Pagamentos pendentes hoje
  if (data.pendingPayments.count > 0) {
    cards.push({
      key: 'payments',
      href: '/admin/financeiro',
      bg: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
      border: 'rgba(245,158,11,0.30)',
      icon: '💰',
      iconBg: 'rgba(245,158,11,0.20)',
      iconColor: '#F59E0B',
      title: `${data.pendingPayments.count} ${data.pendingPayments.count === 1 ? 'cliente atendido pendente' : 'clientes atendidos pendentes'} de pagamento`,
      subtitle: `${formatPrice(data.pendingPayments.total)} em aberto · confirmar agora`,
      ctaColor: '#F59E0B',
    })
  }

  // 3. Sumidos sem cupom
  if (data.sumidosSemCupom > 0) {
    cards.push({
      key: 'sumidos',
      href: '/admin/clientes/campanhas?tab=sumidos',
      bg: 'linear-gradient(135deg, rgba(239,68,68,0.10), rgba(239,68,68,0.04))',
      border: 'rgba(239,68,68,0.28)',
      icon: '🎯',
      iconBg: 'rgba(239,68,68,0.18)',
      iconColor: '#EF4444',
      title: `${data.sumidosSemCupom} sumido${data.sumidosSemCupom > 1 ? 's' : ''} sem cupom`,
      subtitle: 'Gere campanha de reativação via WhatsApp',
      ctaColor: '#EF4444',
    })
  }

  // 3b. Aniversariantes do mês sem cupom (v42)
  if (data.aniversariantesSemCupom > 0) {
    cards.push({
      key: 'aniversariantes',
      href: '/admin/clientes/campanhas?tab=aniversariantes',
      bg: 'linear-gradient(135deg, rgba(59,130,246,0.10), rgba(59,130,246,0.04))',
      border: 'rgba(59,130,246,0.28)',
      icon: '🎂',
      iconBg: 'rgba(59,130,246,0.18)',
      iconColor: '#3B82F6',
      title: `${data.aniversariantesSemCupom} aniversariante${data.aniversariantesSemCupom > 1 ? 's' : ''} esse mês`,
      subtitle: 'Dispare cupom de aniversário via WhatsApp',
      ctaColor: '#3B82F6',
    })
  }

  // 3c. Punições por no-show aplicadas hoje (v45 · descoberta no FocoDoDia)
  if (data.noShowPenaltiesToday > 0) {
    cards.push({
      key: 'no-show-penalties',
      href: '/admin', // dono volta pra home pra revisar cards no_show
      bg: 'linear-gradient(135deg, rgba(148,163,184,0.10), rgba(148,163,184,0.04))',
      border: 'rgba(148,163,184,0.28)',
      icon: '⚠️',
      iconBg: 'rgba(148,163,184,0.18)',
      iconColor: '#64748B',
      title: `${data.noShowPenaltiesToday} punição${data.noShowPenaltiesToday > 1 ? 'ões' : ''} de no-show nas últimas 24h`,
      subtitle: 'Cliente teve emergência? Reverte no card do agendamento',
      ctaColor: '#64748B',
    })
  }

  // 4. Cupons expirando (ate amanha)
  if (data.cupomExpirando > 0) {
    cards.push({
      key: 'cupom-expira',
      href: '/admin/clientes/reativar',
      bg: 'linear-gradient(135deg, rgba(168,85,247,0.10), rgba(168,85,247,0.04))',
      border: 'rgba(168,85,247,0.28)',
      icon: '⏰',
      iconBg: 'rgba(168,85,247,0.18)',
      iconColor: '#A855F7',
      title: `${data.cupomExpirando} cupom${data.cupomExpirando > 1 ? 'ns' : ''} expira${data.cupomExpirando === 1 ? '' : 'm'} até amanhã`,
      subtitle: 'Mande lembrete antes que vença',
      ctaColor: '#A855F7',
    })
  }

  // 5. Motivacional de lucro (sempre se tiver dado)
  const lucroCard = data.lucroVsAnterior
  let motivational: { text: string; color: string } | null = null
  if (lucroCard && lucroCard.pct != null) {
    const pct = lucroCard.pct
    if (pct >= 10) {
      motivational = {
        text: `Lucro 30 dias: ${formatPrice(lucroCard.current)} (+${pct.toFixed(0)}% vs anteriores) — bom ritmo!`,
        color: '#10B981',
      }
    } else if (pct <= -10) {
      motivational = {
        text: `Lucro caiu ${Math.abs(pct).toFixed(0)}% vs 30 dias anteriores — vale revisar.`,
        color: '#EF4444',
      }
    } else if (lucroCard.current > 0) {
      motivational = {
        text: `Lucro 30 dias: ${formatPrice(lucroCard.current)} — ritmo estável.`,
        color: 'var(--admin-text-mute)',
      }
    }
  }

  // Se nada pra mostrar, nem renderiza secao (home fica limpa)
  if (cards.length === 0 && !motivational) return null

  return (
    <section>
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: 'var(--admin-text-mute)' }}
      >
        Foco do dia
      </p>

      <div className="space-y-2">
        {cards.map((c) => (
          <Link
            key={c.key}
            href={c.href}
            className="block rounded-2xl p-4 transition-opacity hover:opacity-90"
            style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                style={{ background: c.iconBg }}
              >
                {c.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-bold leading-tight"
                  style={{ color: 'var(--admin-text)' }}
                >
                  {c.title}
                </p>
                <p
                  className="text-[11px] mt-0.5 leading-tight"
                  style={{ color: 'var(--admin-text-mute)' }}
                >
                  {c.subtitle}
                </p>
              </div>
              <IconChevronRight size={18} style={{ color: c.ctaColor }} />
            </div>
          </Link>
        ))}

        {motivational && (
          <div
            className="rounded-xl px-3.5 py-2.5"
            style={{
              background: 'var(--admin-input-bg)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <p className="text-[11px] leading-snug" style={{ color: motivational.color }}>
              {motivational.text}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
