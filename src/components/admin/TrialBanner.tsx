/**
 * TrialBanner — faixa de "faltam X dias do seu teste".
 *
 * Cravado em 13/07/2026, junto com o trial de 7 dias no cadastro.
 * Sem isso o teste vence e o dono só descobre quando bate no paywall — que é
 * a pior hora possível pra ele descobrir.
 *
 * Só aparece pra TRIAL de verdade: subscription ativa, sem ciclo de cobrança
 * (plan_modalidade null), sem assinatura recorrente e sem cortesia vitalícia
 * (permanent_courtesy = demo, nunca vence). Mesmo critério do billing-check.
 */

import Link from 'next/link'

type Props = {
  diasRestantes: number
  plano: string
  precoMes: string
  /** true = teste JÁ venceu e está na carência de 3 dias (past_due). `diasRestantes`
   *  vira os dias que faltam pra bloquear. Faixa sempre vermelha. Eduardo 28/07. */
  vencido?: boolean
}

export default function TrialBanner({ diasRestantes, plano, precoMes, vencido = false }: Props) {
  const urgente = vencido || diasRestantes <= 2
  const ultimoDia = !vencido && diasRestantes <= 0

  const texto = vencido
    ? diasRestantes <= 1
      ? 'Seu teste terminou · último dia pra ativar antes de bloquear'
      : `Seu teste terminou · ${diasRestantes} dias pra ativar antes de bloquear`
    : ultimoDia
      ? 'Seu teste termina hoje'
      : diasRestantes === 1
        ? 'Falta 1 dia do seu teste'
        : `Faltam ${diasRestantes} dias do seu teste`

  return (
    <div
      className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-sm"
      style={
        urgente
          ? { background: 'rgba(244,63,94,0.10)', borderBottom: '1px solid rgba(244,63,94,0.28)' }
          : { background: 'rgba(59,130,246,0.08)', borderBottom: '1px solid rgba(59,130,246,0.22)' }
      }
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: urgente ? '#F43F5E' : '#3B82F6' }}
        />
        <span className="truncate">
          <strong className={urgente ? 'text-rose-700' : 'text-blue-700'}>{texto}.</strong>{' '}
          <span className="text-slate-600 hidden sm:inline">
            {vencido
              ? `São ${precoMes}/mês no plano ${plano}. Sem fidelidade.`
              : `Depois é ${precoMes}/mês no plano ${plano}. Sem fidelidade.`}
          </span>
        </span>
      </div>

      <Link
        href="/admin/configuracoes?tab=plano"
        className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white whitespace-nowrap"
        style={{ background: urgente ? '#E11D48' : '#2563EB' }}
      >
        Assinar agora
      </Link>
    </div>
  )
}
