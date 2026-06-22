'use client'

import { useState } from 'react'
import { IconCheck, IconClose } from '@/components/ui/Icon'

type Claim = {
  id: string
  customer_name: string | null
  customer_phone: string | null
  requested_at: string
}

type Props = {
  claims: Claim[]
  /** URL pra conferir as avaliações no Google (businesses.google_place_id) */
  googleReviewUrl: string | null
  /** Quantos pontos a aprovação libera (points_for_review) */
  pointsValue: number
}

function quando(iso: string): string {
  const d = new Date(iso)
  const dias = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 7) return `há ${dias} dias`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function maskPhone(p: string | null): string {
  if (!p) return ''
  const d = p.replace(/\D/g, '').replace(/^55/, '')
  if (d.length < 10) return p
  return `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}`
}

export default function ReviewClaimsCard({ claims: initial, googleReviewUrl, pointsValue }: Props) {
  const [claims, setClaims] = useState<Claim[]>(initial)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (claims.length === 0) return null

  async function act(id: string, action: 'approve' | 'reject') {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch('/api/admin/review-claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ claimId: id, action }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'Erro ao processar.'); return }
      setClaims((prev) => prev.filter((c) => c.id !== id))
    } catch {
      setError('Erro de conexão.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section
      className="rounded-2xl p-4 lg:p-5"
      style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(16,185,129,0.03))', border: '1px solid rgba(16,185,129,0.30)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: 'rgba(16,185,129,0.20)' }}>⭐</span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
              {claims.length} pedido{claims.length > 1 ? 's' : ''} de pontos por avaliação
            </h3>
            <p className="text-[11px] mt-0.5 leading-tight" style={{ color: 'var(--admin-text-mute)' }}>
              Confira no Google e aprove pra liberar {pointsValue} pts pro cliente
            </p>
          </div>
        </div>
        {googleReviewUrl && (
          <a
            href={googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex-shrink-0 whitespace-nowrap"
            style={{ background: 'var(--admin-surface)', color: '#10B981', border: '1px solid rgba(16,185,129,0.35)' }}
          >
            Ver no Google
          </a>
        )}
      </div>

      {error && (
        <div className="rounded-lg px-3 py-2 text-xs mb-2" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}>
          {error}
        </div>
      )}

      <div className="space-y-2">
        {claims.map((c) => (
          <div
            key={c.id}
            className="rounded-xl p-3 flex items-center gap-3 flex-wrap sm:flex-nowrap"
            style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                {c.customer_name || 'Cliente'}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
                {maskPhone(c.customer_phone)} · pediu {quando(c.requested_at)}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => act(c.id, 'approve')}
                disabled={busyId !== null}
                className="text-xs font-bold px-3 py-2 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-50 transition-transform active:scale-[0.97]"
                style={{ background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)', color: '#fff' }}
              >
                <IconCheck size={14} /> {busyId === c.id ? '...' : 'Aprovar'}
              </button>
              <button
                type="button"
                onClick={() => act(c.id, 'reject')}
                disabled={busyId !== null}
                className="text-xs font-semibold px-2.5 py-2 rounded-lg inline-flex items-center gap-1 disabled:opacity-50"
                style={{ background: 'transparent', color: '#DC2626', border: '1px solid rgba(220,38,38,0.30)' }}
                aria-label="Recusar"
              >
                <IconClose size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
