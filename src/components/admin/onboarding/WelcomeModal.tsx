'use client'

import { useEffect, useState } from 'react'
import { getOnboardingCopy } from '@/lib/onboarding-content'

/**
 * Modal de boas-vindas · 1ª vez que admin entra na home.
 *
 * 3 slides curtos · skippable · só uma vez (flag welcome_modal_seen).
 * Aparece com fade-in suave depois que a home renderiza pra não brigar
 * com o LCP do conteúdo principal.
 */
type Props = {
  businessName: string
  category: string | null
}

export default function WelcomeModal({ businessName, category }: Props) {
  const [step, setStep] = useState(0)
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const copy = getOnboardingCopy(category)

  // Delay 400ms pra não brigar com first paint da home
  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 400)
    return () => clearTimeout(t)
  }, [])

  // ESC fecha · prevent body scroll enquanto aberto
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleDismiss() {
    setClosing(true)
    // Persiste flag em paralelo · não bloqueia o fade-out
    fetch('/api/admin/onboarding/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: 'welcome_modal_seen' }),
    }).catch(() => {})
    // Fade-out 250ms
    setTimeout(() => setOpen(false), 250)
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Boas-vindas ao AgendaPRO"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 py-4 sm:py-8"
      style={{
        background: 'rgba(8, 12, 24, 0.78)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        opacity: closing ? 0 : 1,
        transition: 'opacity 250ms ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss()
      }}
    >
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background:
            'linear-gradient(155deg, color-mix(in srgb, var(--brand-primary) 14%, var(--admin-surface)) 0%, var(--admin-surface) 60%)',
          border: '1px solid var(--admin-border)',
          boxShadow: '0 24px 60px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
          transform: closing ? 'translateY(8px)' : 'translateY(0)',
          transition: 'transform 250ms ease',
        }}
      >
        {/* Glow orb decorativo */}
        <div
          className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[80px] opacity-50"
          style={{ background: 'var(--admin-accent-bg)' }}
        />

        {/* Botão fechar */}
        <button
          onClick={handleDismiss}
          aria-label="Fechar"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105 z-10"
          style={{
            background: 'rgba(255,255,255,0.08)',
            color: 'var(--admin-text-faded)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="relative px-6 sm:px-8 pt-8 pb-6 min-h-[420px] flex flex-col">
          {step === 0 && (
            <Slide0 businessName={businessName} subtitle={copy.welcomeSubtitle} />
          )}
          {step === 1 && <Slide1 />}
          {step === 2 && <Slide2 motivacao={copy.motivacao} />}

          {/* Footer · indicador + CTA */}
          <div className="mt-auto pt-6">
            {/* Dots indicator */}
            <div className="flex justify-center gap-1.5 mb-5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: step === i ? '24px' : '8px',
                    background:
                      step === i
                        ? 'var(--admin-accent)'
                        : 'var(--admin-border)',
                  }}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{
                    background: 'transparent',
                    color: 'var(--admin-text-faded)',
                    border: '1px solid var(--admin-border)',
                  }}
                >
                  ← Voltar
                </button>
              )}
              <button
                onClick={() => (step < 2 ? setStep(step + 1) : handleDismiss())}
                className="flex-1 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.01]"
                style={{
                  background:
                    'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
                  color: '#fff',
                  boxShadow: '0 8px 24px -8px color-mix(in srgb, var(--brand-primary) 60%, transparent)',
                }}
              >
                {step < 2 ? 'Próximo →' : 'Bora começar 🚀'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────── */

function Slide0({ businessName, subtitle }: { businessName: string; subtitle: string }) {
  return (
    <div className="space-y-4">
      <div
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
        style={{
          background: 'var(--admin-accent-bg)',
          color: 'var(--admin-accent)',
          border: '1px solid var(--admin-accent-border)',
        }}
      >
        ✨ Bem-vindo
      </div>
      <h1
        className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight"
        style={{ color: 'var(--admin-text)' }}
      >
        Olá,{' '}
        <span style={{ color: 'var(--admin-accent)' }}>{businessName}</span>.
      </h1>
      <p
        className="text-base leading-relaxed"
        style={{ color: 'var(--admin-text-mute)' }}
      >
        {subtitle}
      </p>
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <span className="text-3xl flex-shrink-0">⚡</span>
        <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
          Em 2 minutos a gente te mostra os 4 pilares e os primeiros passos.
        </p>
      </div>
    </div>
  )
}

function Slide1() {
  const pilares: Array<{ emoji: string; title: string; desc: string; color: string }> = [
    {
      emoji: '📅',
      title: 'Agenda',
      desc: 'Confirma, cancela e remarca em 1 toque. Tudo no celular.',
      color: 'rgba(99,102,241,0.15)',
    },
    {
      emoji: '👥',
      title: 'Clientes',
      desc: 'Histórico completo · sumidos · cupons · base que cresce sozinha.',
      color: 'rgba(168,85,247,0.15)',
    },
    {
      emoji: '💰',
      title: 'Financeiro',
      desc: 'Recebido hoje · a receber · despesas · lucro real do mês.',
      color: 'rgba(16,185,129,0.15)',
    },
    {
      emoji: '⭐',
      title: 'Fidelidade',
      desc: 'Pontos · cupons · indicações · pontualidade. Cliente volta.',
      color: 'rgba(245,158,11,0.15)',
    },
  ]
  return (
    <div className="space-y-4">
      <h2
        className="text-xl sm:text-2xl font-bold tracking-tight leading-tight"
        style={{ color: 'var(--admin-text)' }}
      >
        4 pilares que <span style={{ color: 'var(--admin-accent)' }}>concorrente nenhum</span> tem juntos.
      </h2>
      <div className="space-y-2.5">
        {pilares.map((p) => (
          <div
            key={p.title}
            className="rounded-xl p-3 flex items-start gap-3"
            style={{
              background: p.color,
              border: '1px solid var(--admin-border)',
            }}
          >
            <span className="text-2xl flex-shrink-0">{p.emoji}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
                {p.title}
              </p>
              <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--admin-text-mute)' }}>
                {p.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Slide2({ motivacao }: { motivacao: string }) {
  const passos = ['Personalize seu perfil', 'Cadastrar serviço', 'Configurar horários', 'Compartilhar link', 'Receber 1º agendamento']
  return (
    <div className="space-y-4">
      <h2
        className="text-xl sm:text-2xl font-bold tracking-tight leading-tight"
        style={{ color: 'var(--admin-text)' }}
      >
        {motivacao}
      </h2>
      <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
        Vou deixar um <strong style={{ color: 'var(--admin-text)' }}>checklist na sua tela</strong> com cada passo. Você completa no seu ritmo — ele some quando terminar tudo.
      </p>
      <div
        className="rounded-2xl p-4 space-y-2"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--admin-border)',
        }}
      >
        {passos.map((p, i) => (
          <div key={p} className="flex items-center gap-3">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
              style={{
                background: 'var(--admin-accent-bg)',
                color: 'var(--admin-accent)',
                border: '1px solid var(--admin-accent-border)',
              }}
            >
              {i + 1}
            </span>
            <span className="text-xs" style={{ color: 'var(--admin-text)' }}>
              {p}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
