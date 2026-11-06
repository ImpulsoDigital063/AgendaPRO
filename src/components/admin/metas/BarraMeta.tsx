/* Barra de progresso da meta (cartão do Início e cofrinho do sonho).
   06/11/2026: o marcador de ritmo saiu daqui; a aba Metas desenha a própria
   barra branca dentro da faixa (MetasView). */
export function BarraMeta({ atual, alvo, alto = 10 }: { atual: number; alvo: number; alto?: number }) {
  const pct = alvo > 0 ? Math.min(100, Math.max(0, (atual / alvo) * 100)) : 0
  const bateu = alvo > 0 && atual >= alvo
  return (
    <div
      className="relative w-full overflow-hidden rounded-full"
      style={{ height: alto, background: 'color-mix(in srgb, var(--admin-accent) 14%, var(--admin-surface))' }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={Math.round(alvo)}
      aria-valuenow={Math.round(atual)}
    >
      <i className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: bateu ? 'var(--admin-success)' : 'var(--admin-accent)', transition: 'width 900ms cubic-bezier(.2,.8,.2,1)' }} />
    </div>
  )
}
