import Link from 'next/link'
import { IconWallet, IconChevronRight } from '@/components/ui/Icon'

type Appointment = {
  paid_at: string | null
  payment_method: string | null
  total_price: number | null
  /** Valor da comanda quando tem produto (combo / vendido junto). */
  charged_total?: number | null
}

/**
 * Card sticky compacto com totais do dia por método · atalho pra
 * /recepcao/caixa.
 */
export default function RecepCaixaQuick({ todayAppts }: { todayAppts: Appointment[] }) {
  const paid = todayAppts.filter((a) => a.paid_at != null)

  const totals = paid.reduce(
    (acc, a) => {
      const price = a.charged_total ?? a.total_price ?? 0
      acc.gross += price
      if (a.payment_method === 'pix') acc.pix += price
      else if (a.payment_method === 'cash') acc.cash += price
      else if (a.payment_method === 'card') acc.card += price
      return acc
    },
    { pix: 0, cash: 0, card: 0, gross: 0 },
  )

  const formatBRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })

  return (
    <Link href="/recepcao/caixa" className="admin-card p-4 block transition-opacity hover:opacity-90">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest inline-flex items-center gap-1.5" style={{ color: 'var(--admin-text-faded)' }}>
          <IconWallet size={12} /> Caixa de hoje
        </p>
        <span style={{ color: 'var(--admin-text-faded)' }}>
          <IconChevronRight size={14} />
        </span>
      </div>

      <p className="text-2xl font-extrabold tabular-nums" style={{ color: 'var(--admin-success,#10B981)' }}>
        {formatBRL(totals.gross)}
      </p>
      <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-mute)' }}>
        {paid.length} pagamento{paid.length !== 1 ? 's' : ''}
      </p>

      <div
        className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t"
        style={{ borderColor: 'var(--admin-divider)' }}
      >
        <div>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
            PIX
          </p>
          <p className="text-xs font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
            {formatBRL(totals.pix)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
            Dinheiro
          </p>
          <p className="text-xs font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
            {formatBRL(totals.cash)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
            Cartão
          </p>
          <p className="text-xs font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
            {formatBRL(totals.card)}
          </p>
        </div>
      </div>
    </Link>
  )
}
