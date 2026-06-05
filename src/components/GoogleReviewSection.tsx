'use client'

import { useState } from 'react'
import { IconGift, IconStar, IconWhatsapp } from '@/components/ui/Icon'

type Props = {
  businessId: string
  googleMapsUrl: string
  rating: number | null
  reviewsCount: number | null
  pointsForReview: number
  brandMode?: 'dark' | 'light'
  slug?: string
  cheapestReward?: { name: string; pointsRequired: number } | null
}

function ratingLabel(r: number): string | null {
  if (r >= 4.8) return 'Excelente'
  if (r >= 4.4) return 'Muito bom'
  if (r >= 4.0) return 'Bom'
  return null
}

// Logo G colorido oficial do Google (4 quadrantes)
function GoogleGLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  )
}

export default function GoogleReviewSection({
  businessId,
  googleMapsUrl,
  rating,
  reviewsCount,
  pointsForReview,
  slug,
  cheapestReward,
}: Props) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [claimed, setClaimed] = useState(false)

  // Card de avaliações SEMPRE claro/Google — ignora o tema (escuro) da marca,
  // pra parecer com o card real do Google (pedido Eduardo 05/06).
  const isDark = false
  const hasProgram = pointsForReview > 0
  const phoneDigits = phone.replace(/\D/g, '').length
  const isReady = phoneDigits >= 10
  const canSubmit = isReady && !loading

  const C = {
    surface: isDark ? 'rgba(15,25,56,0.55)' : '#FFFFFF',
    surfaceBorder: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#64748B' : '#94A3B8',
    inputBg: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
    inputBorder: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
    flowChip: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.25)',
  }

  // Azul do Google (não a cor da marca) — pra o card parecer nativo do Google.
  const brandGradient = 'linear-gradient(135deg, #4285F4 0%, #1A73E8 100%)'

  function renderStars(r: number) {
    return (
      <span className="inline-flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <IconStar
            key={i}
            size={14}
            style={{
              color: i < Math.round(r) ? '#FBBC04' : isDark ? 'rgba(255,255,255,0.15)' : '#E2E8F0',
              fill: i < Math.round(r) ? '#FBBC04' : 'transparent',
            }}
          />
        ))}
      </span>
    )
  }

  async function handleAvaliarComPontos() {
    if (!isReady) return
    setLoading(true)
    setMessage(null)

    const res = await fetch('/api/claim-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, phone: phone.trim() }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setMessage({ type: 'error', text: data.error || 'Erro ao registrar pedido.' })
      return
    }

    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer')
    setClaimed(true)
    setMessage({
      type: 'success',
      text: 'Avaliação aberta no Google. Quando o estabelecimento confirmar, os pontos entram.',
    })
  }

  const ratingFormatted = rating ? rating.toFixed(1).replace('.', ',') : null
  const label = rating ? ratingLabel(rating) : null

  return (
    <section>
      <h2
        className="text-xs font-semibold uppercase tracking-[0.2em] mb-3 inline-flex items-center gap-2"
        style={{ color: C.subtle }}
      >
        <GoogleGLogo size={14} />
        Avaliações no Google
      </h2>
      <div
        className="rounded-2xl p-5 space-y-4 backdrop-blur-xl"
        style={{
          background: C.surface,
          border: `1px solid ${C.surfaceBorder}`,
        }}
      >
        {rating && (
          <div className="flex items-center gap-3">
            <div
              className="flex items-baseline gap-1.5"
              aria-label={`Nota ${ratingFormatted} de 5`}
            >
              <span className="text-3xl font-bold leading-none" style={{ color: C.text }}>
                {ratingFormatted}
              </span>
              <span className="text-sm font-medium" style={{ color: C.muted }}>
                / 5
              </span>
            </div>
            <div className="flex-1 min-w-0">
              {renderStars(rating)}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {label && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      background: 'rgba(251,188,4,0.15)',
                      color: '#B07700',
                      border: '1px solid rgba(251,188,4,0.4)',
                    }}
                  >
                    {label}
                  </span>
                )}
                {reviewsCount && (
                  <span className="text-xs" style={{ color: C.muted }}>
                    {reviewsCount.toLocaleString('pt-BR')} avaliações
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {!hasProgram && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full font-semibold text-sm py-3 rounded-xl transition-transform hover:scale-[1.01]"
            style={{
              background: brandGradient,
              color: '#FFFFFF',
              boxShadow: '0 10px 28px -10px var(--brand-primary, #3B82F6)',
            }}
          >
            <GoogleGLogo size={16} />
            Avaliar no Google
          </a>
        )}

        {hasProgram && !claimed && (
          <div className="space-y-3">
            {/* Banner-convite */}
            <div
              className="rounded-xl p-4 space-y-3"
              style={{
                background: brandGradient,
                color: '#FFFFFF',
                boxShadow: '0 10px 30px -12px var(--brand-primary, #3B82F6)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  <IconGift size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm leading-tight">
                    Ganhe +{pointsForReview} pontos avaliando
                  </p>
                  <p className="text-xs mt-1 leading-snug" style={{ color: 'rgba(255,255,255,0.92)' }}>
                    Avalie em 30 segundos. Pontos entram quando o estabelecimento confirmar.
                  </p>
                </div>
              </div>

              {/* Mini-flow visual */}
              <div className="flex items-center justify-between gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.18)' }}>
                <FlowStep label="WhatsApp" bg={C.flowChip}>
                  <IconWhatsapp size={14} />
                </FlowStep>
                <FlowArrow />
                <FlowStep label="Avalie" bg={C.flowChip}>
                  <IconStar size={14} style={{ fill: '#FFFFFF' }} />
                </FlowStep>
                <FlowArrow />
                <FlowStep label={`+${pointsForReview} pts`} bg={C.flowChip}>
                  <IconGift size={14} />
                </FlowStep>
              </div>
            </div>

            {/* Tradução de pontos pra recompensa real */}
            {cheapestReward && (
              <div
                className="rounded-xl px-3 py-2.5 flex items-center gap-2 text-xs"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                  border: `1px solid ${C.surfaceBorder}`,
                  color: C.muted,
                }}
              >
                <IconGift size={14} style={{ color: 'var(--brand-primary, #3B82F6)' }} />
                <span className="leading-snug">
                  Acumule e troque por <strong style={{ color: C.text }}>{cheapestReward.name}</strong>
                  {' '}({cheapestReward.pointsRequired} pts)
                </span>
              </div>
            )}

            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Seu WhatsApp — (99) 99999-9999"
              className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 transition-shadow"
              style={{
                background: C.inputBg,
                border: `1px solid ${C.inputBorder}`,
                color: C.text,
              }}
            />

            <button
              onClick={handleAvaliarComPontos}
              disabled={!canSubmit}
              className={`flex items-center justify-center gap-2 w-full font-bold text-sm py-3.5 rounded-xl transition-all ${canSubmit ? 'hover:scale-[1.01] active:scale-[0.99] cta-pulse' : ''}`}
              style={{
                background: brandGradient,
                color: '#FFFFFF',
                opacity: canSubmit ? 1 : 0.55,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                boxShadow: canSubmit
                  ? '0 14px 38px -10px var(--brand-primary, #3B82F6)'
                  : 'none',
              }}
            >
              <GoogleGLogo size={16} />
              {loading ? 'Registrando...' : `Avaliar e ganhar +${pointsForReview} pts`}
            </button>

            {!isReady && !loading && (
              <p className="text-[11px] text-center" style={{ color: C.subtle }}>
                Digite seu WhatsApp pra liberar o botão
              </p>
            )}

            {/* Prova social — só se tem reviewsCount */}
            {reviewsCount && reviewsCount > 0 && (
              <p className="text-[11px] text-center" style={{ color: C.subtle }}>
                Junte-se aos{' '}
                <span className="font-bold" style={{ color: C.muted }}>
                  {reviewsCount.toLocaleString('pt-BR')}
                </span>{' '}
                que já avaliaram aqui
              </p>
            )}
          </div>
        )}

        {message && (
          <div className="space-y-2">
            <p
              className="text-xs font-medium leading-snug"
              style={{
                color:
                  message.type === 'success'
                    ? isDark ? '#34D399' : '#059669'
                    : isDark ? '#F87171' : '#DC2626',
              }}
            >
              {message.text}
            </p>
            {message.type === 'success' && slug && (
              <a
                href={`/${slug}/meus-pontos`}
                className="inline-flex items-center gap-1 text-xs font-semibold hover:opacity-80 transition-opacity"
                style={{ color: 'var(--brand-primary, #3B82F6)' }}
              >
                Ver meu saldo de pontos →
              </a>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes cta-pulse {
          0%, 100% {
            box-shadow: 0 14px 38px -10px var(--brand-primary, #3b82f6);
          }
          50% {
            box-shadow: 0 18px 48px -10px var(--brand-primary, #3b82f6),
              0 0 0 6px color-mix(in srgb, var(--brand-primary, #3b82f6) 18%, transparent);
          }
        }
        .cta-pulse {
          animation: cta-pulse 2.4s ease-in-out infinite;
        }
      `}</style>
    </section>
  )
}

function FlowStep({
  children,
  label,
  bg,
}: {
  children: React.ReactNode
  label: string
  bg: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: bg }}
      >
        {children}
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-center" style={{ color: 'rgba(255,255,255,0.92)' }}>
        {label}
      </span>
    </div>
  )
}

function FlowArrow() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true" className="flex-shrink-0">
      <path
        d="M1 5h10m0 0L7 1m4 4L7 9"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
