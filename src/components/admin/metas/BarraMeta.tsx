/* Barra de progresso da meta (aba Metas e cartão do Início).
   `ritmo` (opcional, só a aba Metas usa): marcador fino de onde a barra
   deveria estar hoje. Sem `ritmo` a barra fica igual à de antes. */
export function BarraMeta({ atual, alvo, alto = 10, ritmo }: { atual: number; alvo: number; alto?: number; ritmo?: number | null }) {
  const pct = alvo > 0 ? Math.min(100, Math.max(0, (atual / alvo) * 100)) : 0
  const bateu = alvo > 0 && atual >= alvo
  const pctRitmo = ritmo != null && alvo > 0 && ritmo > 0 ? Math.min(100, (ritmo / alvo) * 100) : null
  return (
    <div className="relative w-full">
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
      {pctRitmo !== null && !bateu && (
        <span
          data-testid="marcador-ritmo"
          aria-hidden
          className="absolute rounded-full"
          style={{ left: `calc(${pctRitmo}% - 1.5px)`, top: -4, width: 3, height: alto + 8, background: 'var(--admin-text)', boxShadow: '0 0 0 2px var(--admin-surface)' }}
        />
      )}
    </div>
  )
}
