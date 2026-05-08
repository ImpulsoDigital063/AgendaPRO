'use client'

import { useState } from 'react'
import { getOnboardingCopy } from '@/lib/onboarding-content'

/**
 * Card educativo no topo da FidelidadeTab — só no 1º acesso.
 *
 * Explica o programa de fidelidade + 3 dicas estratégicas adaptadas
 * ao nicho. Após dismiss (botão "Já entendi"), seta a flag
 * fidelidade_dica_lida=true e some pra sempre.
 */
type Props = {
  /** Nicho do business · usado pra adaptar copy */
  category: string | null
  /** Estado inicial vindo do server — true = não renderiza */
  initialDismissed?: boolean
}

export default function FidelidadeOnboardingCard({ category, initialDismissed = false }: Props) {
  const [dismissed, setDismissed] = useState(initialDismissed)
  const [closing, setClosing] = useState(false)
  const copy = getOnboardingCopy(category)

  if (dismissed) return null

  async function handleDismiss() {
    setClosing(true)
    fetch('/api/admin/onboarding/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: 'fidelidade_dica_lida' }),
    }).catch(() => {})
    setTimeout(() => setDismissed(true), 250)
  }

  return (
    <section
      className="relative rounded-2xl overflow-hidden mb-6"
      style={{
        background:
          'linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0.04) 60%, var(--admin-surface) 100%)',
        border: '1px solid rgba(245,158,11,0.25)',
        opacity: closing ? 0 : 1,
        transform: closing ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'opacity 250ms ease, transform 250ms ease',
      }}
    >
      {/* Glow orb */}
      <div
        className="pointer-events-none absolute -top-16 -right-12 w-48 h-48 rounded-full blur-[60px] opacity-40"
        style={{ background: 'rgba(245,158,11,0.35)' }}
      />

      {/* Botão fechar */}
      <button
        onClick={handleDismiss}
        aria-label="Fechar dica"
        className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-105 z-10"
        style={{
          background: 'rgba(255,255,255,0.08)',
          color: 'var(--admin-text-faded)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div className="relative px-5 py-5 sm:px-6 sm:py-6">
        {/* Header */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4"
          style={{
            background: 'rgba(245,158,11,0.18)',
            color: '#F59E0B',
            border: '1px solid rgba(245,158,11,0.30)',
          }}
        >
          ⭐ Dica do fundador
        </div>

        <h2
          className="text-lg sm:text-xl font-bold tracking-tight leading-tight mb-3"
          style={{ color: 'var(--admin-text)' }}
        >
          {copy.fidelidadeHeader}
        </h2>

        <p
          className="text-sm leading-relaxed mb-5"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          O programa de fidelidade é onde a maioria dos donos perde dinheiro de bobeira.
          Cliente ganha <strong style={{ color: 'var(--admin-text)' }}>pontos</strong> por agendar/pagar e troca em
          <strong style={{ color: 'var(--admin-text)' }}> recompensas</strong> que você define (corte grátis, 20% off, brinde, etc).
          Bem usado, é a alavanca mais barata pra fazer cliente voltar 3-5× mais.
        </p>

        {/* 3 dicas estratégicas */}
        <div className="space-y-3">
          <DicaCard
            numero={1}
            titulo="Reativar quem sumiu"
            corpo={copy.dicaReativacao}
            cor="rgba(99,102,241,0.18)"
            corBorder="rgba(99,102,241,0.32)"
            corNum="#6366F1"
          />
          <DicaCard
            numero={2}
            titulo="Crescer por indicação"
            corpo={copy.dicaIndicacao}
            cor="rgba(168,85,247,0.18)"
            corBorder="rgba(168,85,247,0.32)"
            corNum="#A855F7"
          />
          <DicaCard
            numero={3}
            titulo="Cortar no-show pela metade"
            corpo={copy.dicaPontualidade}
            cor="rgba(16,185,129,0.18)"
            corBorder="rgba(16,185,129,0.32)"
            corNum="#10B981"
          />
        </div>

        {/* CTA fechar */}
        <button
          onClick={handleDismiss}
          className="mt-5 w-full px-4 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.005]"
          style={{
            background:
              'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
            color: '#fff',
            boxShadow: '0 4px 16px -6px color-mix(in srgb, var(--brand-primary) 50%, transparent)',
          }}
        >
          Já entendi · bora configurar
        </button>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────── */

function DicaCard({
  numero,
  titulo,
  corpo,
  cor,
  corBorder,
  corNum,
}: {
  numero: number
  titulo: string
  corpo: string
  cor: string
  corBorder: string
  corNum: string
}) {
  return (
    <div
      className="rounded-xl p-3.5 flex items-start gap-3"
      style={{
        background: cor,
        border: `1px solid ${corBorder}`,
      }}
    >
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-extrabold"
        style={{
          background: 'rgba(255,255,255,0.10)',
          color: corNum,
          border: `1px solid ${corBorder}`,
        }}
      >
        {numero}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="text-sm font-bold leading-tight mb-1"
          style={{ color: 'var(--admin-text)' }}
        >
          {titulo}
        </p>
        <p
          className="text-[12.5px] leading-relaxed"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          {corpo}
        </p>
      </div>
    </div>
  )
}
