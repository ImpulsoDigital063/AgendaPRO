/**
 * Skeleton loading do painel admin — exibido pelo Next 16 enquanto o
 * server component (page.tsx) faz queries Supabase. Tap no icone do
 * PWA → ja aparece esta estrutura imediatamente, sem tela vazia.
 *
 * Mesma silhueta visual do dashboard real (header, KPI hero, KPIs grid,
 * lista) — efeito de "carregamento progressivo" em vez de "esperando
 * pra renderizar".
 */
export default function Loading() {
  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <header className="relative max-w-lg mx-auto px-4 pt-5 pb-5">
        <div className="flex items-center justify-between mb-4">
          <div
            className="h-[18px] w-[92px] rounded-md skel-pulse"
            style={{ background: 'var(--admin-surface)' }}
          />
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-9 h-9 rounded-xl skel-pulse"
                style={{ background: 'var(--admin-surface)' }}
              />
            ))}
          </div>
        </div>
        <div
          className="h-3 w-20 rounded skel-pulse mb-2"
          style={{ background: 'var(--admin-surface)' }}
        />
        <div
          className="h-7 w-2/3 rounded skel-pulse"
          style={{ background: 'var(--admin-surface)' }}
        />
        <div
          className="h-3 w-32 rounded skel-pulse mt-2"
          style={{ background: 'var(--admin-surface)' }}
        />
      </header>

      <section className="relative max-w-lg mx-auto px-4 mb-6 space-y-2.5">
        <div
          className="rounded-2xl p-4 h-[110px] skel-pulse"
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
          }}
        />
        <div className="grid grid-cols-2 gap-2.5">
          <div
            className="rounded-2xl p-3.5 h-[78px] skel-pulse"
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
            }}
          />
          <div
            className="rounded-2xl p-3.5 h-[78px] skel-pulse"
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
            }}
          />
        </div>
      </section>

      <div className="relative max-w-lg mx-auto px-4 pb-10 space-y-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-4 h-[88px] skel-pulse"
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              animationDelay: `${i * 80}ms`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes skelPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.9; }
        }
        .skel-pulse {
          animation: skelPulse 1.4s ease-in-out infinite;
        }
      `}</style>
    </main>
  )
}
