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

  function renderStars(r: number) {
    const full = Math.floor(r)
    const half = r % 1 >= 0.5
    return Array.from({ length: 5 }, (_, i) => {
      if (i < full) return '★'
      if (i === full && half) return '½'
      return '☆'
    }).join('')
  }

  async function handleClaim() {
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

    if (res.ok) {
      setClaimed(true)
      setMessage({ type: 'success', text: `+${data.points} pontos creditados!` })
    } else {
      setMessage({ type: 'error', text: data.error || 'Erro ao resgatar pontos.' })
    }
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

        {/* CTA para avaliar */}
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
          {pointsForReview > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              +{pointsForReview} pts
            </span>
          )}
        </a>

        {/* Resgate de pontos */}
        {pointsForReview > 0 && !claimed && (
          <div className="border-t border-gray-50 pt-3 space-y-2">
            <p className="text-xs text-gray-500">
              Já avaliou? Digite seu WhatsApp para receber os pontos:
            </p>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(99) 99999-9999"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400"
              />
              <button
                onClick={handleClaim}
                disabled={loading || !phone.trim()}
                className="px-4 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40"
              >
                {loading ? '...' : 'Resgatar'}
              </button>
            </div>
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
