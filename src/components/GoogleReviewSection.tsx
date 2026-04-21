'use client'

import { useState } from 'react'

type Props = {
  businessId: string
  googleMapsUrl: string
  rating: number | null
  reviewsCount: number | null
  pointsForReview: number
}

export default function GoogleReviewSection({
  businessId,
  googleMapsUrl,
  rating,
  reviewsCount,
  pointsForReview,
}: Props) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [claimed, setClaimed] = useState(false)

  const hasProgram = pointsForReview > 0

  function renderStars(r: number) {
    const full = Math.floor(r)
    const half = r % 1 >= 0.5
    return Array.from({ length: 5 }, (_, i) => {
      if (i < full) return '★'
      if (i === full && half) return '½'
      return '☆'
    }).join('')
  }

  // Sem programa de pontos: abre Maps direto.
  // Com programa: valida telefone, cria claim pending, depois abre Maps.
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

    // Claim pending registrado — abre o Google Maps numa aba nova pra cliente avaliar
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer')
    setClaimed(true)
    setMessage({
      type: 'success',
      text: 'Agora é só avaliar no Google (já abriu). Quando o estabelecimento confirmar, os pontos entram.',
    })
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Avaliações
      </h2>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">

        {/* Badge de nota */}
        {rating && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-yellow-400 text-lg tracking-tight">{renderStars(rating)}</span>
            </div>
            <div>
              <p className="text-gray-900 font-bold text-lg leading-none">{rating}</p>
              {reviewsCount && (
                <p className="text-gray-400 text-xs">{reviewsCount.toLocaleString('pt-BR')} avaliações no Google</p>
              )}
            </div>
          </div>
        )}

        {/* Sem programa de pontos: botão simples que abre Maps */}
        {!hasProgram && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-gray-50 border border-gray-200 text-gray-700 font-semibold text-sm py-3 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
            Avaliar no Google
          </a>
        )}

        {/* Com programa: pede telefone primeiro, depois abre Maps + cria claim */}
        {hasProgram && !claimed && (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-amber-900 font-semibold text-sm mb-1">
                Ganhe +{pointsForReview} pontos avaliando
              </p>
              <p className="text-amber-700 text-xs leading-relaxed">
                Digite seu WhatsApp e clique no botão. O Google abre numa aba nova.
                Depois da avaliação, o estabelecimento confirma e os pontos entram.
              </p>
            </div>

            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Seu WhatsApp — (99) 99999-9999"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400"
            />

            <button
              onClick={handleAvaliarComPontos}
              disabled={loading || !phone.trim()}
              className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white font-semibold text-sm py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
                <circle cx="12" cy="9" r="2.5" fill="white"/>
              </svg>
              {loading ? 'Registrando...' : `Avaliar no Google e ganhar +${pointsForReview} pts`}
            </button>
          </div>
        )}

        {message && (
          <p className={`text-xs font-medium ${message.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
            {message.text}
          </p>
        )}
      </div>
    </section>
  )
}
