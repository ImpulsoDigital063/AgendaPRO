/**
 * Tabela única de cores/labels de status de agendamento.
 * Source of truth pra TODA UI que renderiza status: cards de agenda
 * (admin + profissional), Financeiro, ProfFinanceiro, listas, badges.
 *
 * Por que centralizado: 04/05/2026 descobrimos divergência entre cards
 * — admin mapeava 5 status, profissional só 3 e caía em fallback
 * "Pendente" pra completed/no_show. Painel mentia. Resolvido com
 * statusOf() em todos os call sites.
 *
 * Decisão: cancelled e no_show ficam no mesmo cinza apagado — ambos são
 * "não rendeu nada", não merecem destaque visual.
 */

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

export type StatusVisual = {
  label: string
  /** Background do chip de status. */
  bg: string
  /** Cor do texto/ícone do chip e do borderLeft do card. */
  color: string
  /** Cor do dot (ponto pulsante) — geralmente igual a `color`. */
  dot: string
  /** Se true, considera "vai entrar / entrou no caixa" pra somatórios. */
  countsAsActive: boolean
  /** Se true, atendimento foi prestado (não significa pago — pago = paid_at). */
  countsAsRealized: boolean
}

export const STATUS_VISUAL: Record<string, StatusVisual> = {
  pending: {
    label: 'Pendente',
    bg: 'rgba(245,158,11,0.12)',
    color: 'var(--admin-warn)',
    dot: 'var(--admin-warn)',
    countsAsActive: false,
    countsAsRealized: false,
  },
  confirmed: {
    label: 'Confirmado',
    bg: 'var(--admin-accent-bg)',
    color: 'var(--admin-accent)',
    dot: 'var(--admin-accent)',
    countsAsActive: true,
    countsAsRealized: false,
  },
  completed: {
    label: 'Concluído',
    bg: 'rgba(34,197,94,0.14)',
    color: 'var(--admin-success)',
    dot: 'var(--admin-success)',
    countsAsActive: true,
    countsAsRealized: true,
  },
  cancelled: {
    label: 'Cancelado',
    bg: 'rgba(148,163,184,0.15)',
    color: 'var(--admin-text-faded)',
    dot: 'var(--admin-text-faded)',
    countsAsActive: false,
    countsAsRealized: false,
  },
  no_show: {
    label: 'Não veio',
    bg: 'rgba(148,163,184,0.15)',
    color: 'var(--admin-text-faded)',
    dot: 'var(--admin-text-faded)',
    countsAsActive: false,
    countsAsRealized: false,
  },
}

export function statusOf(s: string): StatusVisual {
  return STATUS_VISUAL[s] ?? STATUS_VISUAL.pending
}

export function isArchived(status: string): boolean {
  return status === 'cancelled' || status === 'no_show'
}

/**
 * Pode marcar como `completed`?
 *
 * Regra: só permitir conclusão a partir de 15min ANTES do horário
 * agendado. Cobre o caso real "cliente chegou cedo, atendi rápido"
 * sem permitir teste/erro em datas futuras.
 *
 * Exemplo: agendamento 11:30 → libera marcar completed às 11:15.
 *
 * @param appointmentDate string ISO 'YYYY-MM-DD'
 * @param startTime string 'HH:MM' ou 'HH:MM:SS'
 * @param now opcional, pra teste — default: Date.now()
 */
export function canCompleteAppointment(
  appointmentDate: string,
  startTime: string,
  now: Date = new Date()
): boolean {
  const hhmm = startTime.slice(0, 5)
  const slotIso = `${appointmentDate}T${hhmm}:00`
  const slotMs = new Date(slotIso).getTime()
  if (Number.isNaN(slotMs)) return false
  const FIFTEEN_MIN_MS = 15 * 60 * 1000
  return now.getTime() >= slotMs - FIFTEEN_MIN_MS
}
