'use client'

import { useEffect, useState } from 'react'

/**
 * Pontos da cliente na comanda e no atendimento (21/10). Wanessa: "aparece
 * que tá disponível, mas não me dá a opção de usar os pontos".
 *
 * Só MOSTRA. Até a v195 este bloco também resgatava, mas por fora da
 * cobrança: descontava os pontos sem ligar ao atendimento nem mexer no
 * valor, e dava pra resgatar aqui e de novo no pagamento. O resgate tem um
 * caminho só, "Receber pagamento → Pontos", que liga ao atendimento, aplica
 * o desconto da recompensa (v167) e devolve os pontos se a comanda reabrir.
 */
type Reward = { id: string; name: string; points_required: number; tipo?: string; desconto?: number | null }

function rotulo(r: Reward): string {
  if (r.tipo === 'percentual') return `${String(r.desconto ?? 0).replace('.', ',')}% de desconto`
  if (r.tipo === 'valor') return `${Number(r.desconto ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de desconto`
  return 'grátis'
}

export default function ResgatePontos({ customerId, dica }: { customerId: string; dica: string }) {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [saldo, setSaldo] = useState<number | null>(null)

  useEffect(() => {
    let cancelado = false
    fetch(`/api/admin/fidelidade/contexto?customer_id=${encodeURIComponent(customerId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data) => {
        if (cancelado || !data?.ativo) return
        setRewards((data.recompensas ?? []) as Reward[])
        setSaldo(data.saldo == null ? null : Number(data.saldo))
      })
    return () => { cancelado = true }
  }, [customerId])

  if (saldo === null || rewards.length === 0) return null
  const disponiveis = rewards.filter((r) => saldo >= r.points_required)

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
          Pontos da cliente
        </p>
        <p className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--admin-accent)' }}>
          {saldo} pts
        </p>
      </div>
      {disponiveis.length > 0 ? (
        <>
          <ul className="mt-2 space-y-1">
            {disponiveis.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate font-semibold" style={{ color: 'var(--admin-text-2)' }}>★ {r.name}</span>
                <span className="shrink-0 tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>{r.points_required} pts · {rotulo(r)}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] mt-2.5" style={{ color: 'var(--admin-text-mute)' }}>{dica}</p>
        </>
      ) : (
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-mute)' }}>
          Faltam {Math.min(...rewards.map((r) => r.points_required)) - saldo} pts para a primeira recompensa.
        </p>
      )}
    </div>
  )
}
