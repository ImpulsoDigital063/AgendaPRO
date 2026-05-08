import Image from 'next/image'

/**
 * Loading UI renderizado pelo Next.js automaticamente enquanto qualquer
 * rota /admin/* busca dados server-side. Cobre navegação intra-app +
 * cold starts breves do Vercel. Substitui tela branca por splash
 * AgendaPRO consistente com a marca.
 *
 * Limitação: cold start REAL (server hibernado) ainda mostra tela branca
 * até server responder com este HTML. Pra cobrir isso seria necessário
 * service worker com app shell — backlog.
 */
export default function AdminLoading() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(16,185,129,0.20) 0%, transparent 60%), #050713',
      }}
    >
      <div className="flex flex-col items-center gap-6">
        <Image
          src="/logo-agendapro-mono-white.svg"
          alt="AgendaPRO"
          width={200}
          height={48}
          priority
        />

        {/* Loader: 3 dots pulsando */}
        <div className="flex items-center gap-1.5">
          <span
            className="rounded-full"
            style={{
              width: 8,
              height: 8,
              background: 'linear-gradient(135deg, #10B981, #06B6D4)',
              animation: 'agp-pulse 1.4s ease-in-out infinite',
              animationDelay: '0s',
            }}
          />
          <span
            className="rounded-full"
            style={{
              width: 8,
              height: 8,
              background: 'linear-gradient(135deg, #10B981, #06B6D4)',
              animation: 'agp-pulse 1.4s ease-in-out infinite',
              animationDelay: '0.2s',
            }}
          />
          <span
            className="rounded-full"
            style={{
              width: 8,
              height: 8,
              background: 'linear-gradient(135deg, #10B981, #06B6D4)',
              animation: 'agp-pulse 1.4s ease-in-out infinite',
              animationDelay: '0.4s',
            }}
          />
        </div>

        <p className="text-[11px] uppercase tracking-wider font-semibold text-emerald-300/60">
          Carregando…
        </p>
      </div>

      <style>{`
        @keyframes agp-pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </main>
  )
}
