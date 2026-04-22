/**
 * Tabela única de cores/labels de status de agendamento.
 * Usada em FinanceiroView, ProfFinanceiroView, AppointmentCard etc.
 *
 * Decisão: cancelled e no_show ficam no mesmo cinza apagado — ambos são
 * "não rendeu nada", não merecem destaque visual.
 */

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

export type StatusVisual = {
  label: string
  bg: string
  color: string
  dot: string
  /** Se true, considera "vai entrar / entrou no caixa" pra somatórios. */
  countsAsActive: boolean
  /** Se true, dinheiro já caiu — usado pra "realizado". */
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
    label: 'Realizado',
    bg: 'rgba(34,197,94,0.14)',
    color: '#16A34A',
    dot: '#16A34A',
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
