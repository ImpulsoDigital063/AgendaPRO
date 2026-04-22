'use client'

import { useState } from 'react'
import { IconGift, IconStar } from '@/components/ui/Icon'

type Props = {
  businessId: string
  googleMapsUrl: string
  rating: number | null
  reviewsCount: number | null
  pointsForReview: number
  brandMode?: 'dark' | 'light'
  slug?: string
}

function ratingLabel(r: number): string | null {
  if (r >= 4.8) return 'Excelente'
  if (r >= 4.4) return 'Muito bom'
  if (r >= 4.0) return 'Bom'
  return null
}

export default function GoogleReviewSection({
  businessId,
  googleMapsUrl,
  rating,
  reviewsCount,
  pointsForReview,
  brandMode = 'dark',
  slug,
}: Props) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [claimed, setClaimed] = useState(false)

  const isDark = brandMode === 'dark'
  const hasProgram = pointsForReview > 0

  // Paleta dependente do brand_mode
  const C = {
    surface: isDark ? 'rgba(15,25,56,0.55)' : '#FFFFFF',
    surfaceBorder: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#64748B' : '#94A3B8',
    inputBg: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
    inputBorder: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
    inputPlaceholder: isDark ? '#475569' : '#CBD5E1',
  }

  // Gradient branded usando as CSS vars do <main>
  const brandGradient = 'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)'

  function renderStars(r: number) {
    return (
      <span className="inline-flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <IconStar
            key={i}
            size={14}
            // Renderizado em amarelo Google
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
    if (!phone.trim()) return
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
        className="text-xs font-semibold uppercase tracking-[0.2em] mb-3"
        style={{ color: C.subtle }}
      >
        Avaliações no Google
      </h2>
      <div
        className="rounded-2xl p-5 space-y-4 backdrop-blur-xl"
        style={{
          background: C.surface,
          border: `1px solid ${C.surfaceBorder}`,
        }}
      >
        {/* Cabeçalho de nota */}
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
              <div className="flex items-center gap-2 mt-1">
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

        {/* Sem programa de pontos: só botão de avaliar */}
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
            Avaliar no Google
          </a>
        )}

        {/* Com programa: convite branded + input + botão */}
        {hasProgram && !claimed && (
          <div className="space-y-3">
            <div
              className="rounded-xl p-4 flex items-start gap-3"
              style={{
                background: brandGradient,
                color: '#FFFFFF',
                boxShadow: '0 10px 30px -12px var(--brand-primary, #3B82F6)',
              }}
            >
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
                <p className="text-xs mt-1 leading-snug" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  Digite seu WhatsApp, clique no botão e avalie no Google. Os pontos entram quando o estabelecimento confirmar.
                </p>
              </div>
            </div>

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
              disabled={loading || !phone.trim()}
              className="flex items-center justify-center gap-2 w-full font-bold text-sm py-3.5 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] disabled:hover:scale-100"
              style={{
                background: brandGradient,
                color: '#FFFFFF',
                opacity: loading || !phone.trim() ? 0.6 : 1,
                cursor: loading || !phone.trim() ? 'not-allowed' : 'pointer',
                boxShadow: !phone.trim() ? 'none' : '0 12px 32px -10px var(--brand-primary, #3B82F6)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
                <circle cx="12" cy="9" r="2.5" fill="white"/>
              </svg>
              {loading ? 'Registrando...' : `Avaliar e ganhar +${pointsForReview} pts`}
            </button>

            {!phone.trim() && !loading && (
              <p className="text-[11px] text-center" style={{ color: C.subtle }}>
                Digite seu WhatsApp pra liberar o botão
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
    </section>
  )
}
