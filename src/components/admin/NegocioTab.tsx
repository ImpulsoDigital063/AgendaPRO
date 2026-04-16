'use client'

import { useState } from 'react'
import type { Business } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { IconCheck } from '@/components/ui/Icon'

type Props = {
  business: Business
}

export default function NegocioTab({ business }: Props) {
  const [name, setName] = useState(business.name)
  const [phone, setPhone] = useState(business.phone || '')
  const [address, setAddress] = useState(business.address || '')
  const [description, setDescription] = useState(business.description || '')
  const [googleMapsUrl, setGoogleMapsUrl] = useState(business.google_place_id || '')
  const [googleRating, setGoogleRating] = useState(business.google_rating ? String(business.google_rating) : '')
  const [googleReviewsCount, setGoogleReviewsCount] = useState(business.google_reviews_count ? String(business.google_reviews_count) : '')
  const [pointsForReview, setPointsForReview] = useState(business.points_for_review ? String(business.points_for_review) : '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  async function handleSave() {
    if (!name.trim()) {
      setError('O nome do negócio é obrigatório.')
      return
    }

    setSaving(true)
    setError('')
    setSaved(false)

    const { error: err } = await supabase
      .from('businesses')
      .update({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        description: description.trim() || null,
        google_place_id: googleMapsUrl.trim() || null,
        google_rating: googleRating ? parseFloat(googleRating) : null,
        google_reviews_count: googleReviewsCount ? parseInt(googleReviewsCount) : null,
        points_for_review: pointsForReview ? parseInt(pointsForReview) : 0,
      })
      .eq('id', business.id)

    setSaving(false)

    if (err) {
      setError('Erro ao salvar. Tente novamente.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="admin-card-deep p-5 space-y-4">
        <h3 className="font-semibold" style={{ color: 'var(--admin-text)' }}>Dados do negócio</h3>

        <div>
          <label className="admin-label">Nome *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="admin-input w-full px-3 py-2.5 text-sm"
            placeholder="Nome do seu negócio"
          />
        </div>

        <div>
          <label className="admin-label">WhatsApp</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="admin-input w-full px-3 py-2.5 text-sm"
            placeholder="(63) 99999-9999"
          />
        </div>

        <div>
          <label className="admin-label">Endereço</label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="admin-input w-full px-3 py-2.5 text-sm"
            placeholder="Rua, número, bairro"
          />
        </div>

        <div>
          <label className="admin-label">Descrição ou categoria</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="admin-input w-full px-3 py-2.5 text-sm resize-none"
            placeholder="Ex: Barbearia, Salão de beleza, Clínica de estética..."
          />
        </div>

        <div
          className="pt-4 space-y-3"
          style={{ borderTop: '1px solid var(--admin-divider)' }}
        >
          <h4
            className="text-xs font-semibold uppercase tracking-[0.15em]"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            Google Reviews
          </h4>
          <div>
            <label className="admin-label">Link do Google Maps</label>
            <input
              type="url"
              value={googleMapsUrl}
              onChange={e => setGoogleMapsUrl(e.target.value)}
              className="admin-input w-full px-3 py-2.5 text-sm"
              placeholder="https://g.page/r/..."
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="admin-label">Nota atual</label>
              <input
                type="number"
                value={googleRating}
                onChange={e => setGoogleRating(e.target.value)}
                min="1" max="5" step="0.1"
                className="admin-input w-full px-3 py-2.5 text-sm"
                placeholder="4.8"
              />
            </div>
            <div className="flex-1">
              <label className="admin-label">Nº de avaliações</label>
              <input
                type="number"
                value={googleReviewsCount}
                onChange={e => setGoogleReviewsCount(e.target.value)}
                min="0"
                className="admin-input w-full px-3 py-2.5 text-sm"
                placeholder="127"
              />
            </div>
          </div>
          <div>
            <label className="admin-label">Pontos por avaliar no Google</label>
            <input
              type="number"
              value={pointsForReview}
              onChange={e => setPointsForReview(e.target.value)}
              min="0"
              className="admin-input w-full px-3 py-2.5 text-sm"
              placeholder="ex: 150"
            />
          </div>
        </div>

        {error && (
          <p className="text-xs" style={{ color: 'var(--admin-danger)' }}>{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-2xl font-bold text-sm transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
          style={
            saved
              ? {
                  background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
                  color: '#FFFFFF',
                  boxShadow: '0 10px 30px -8px rgba(16, 185, 129, 0.55)',
                }
              : {
                  background:
                    'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
                  color: '#FFFFFF',
                  boxShadow:
                    '0 12px 32px -8px color-mix(in srgb, var(--admin-accent) 55%, transparent)',
                }
          }
        >
          {saving ? 'Salvando...' : saved ? (<><IconCheck size={16} /> Salvo!</>) : 'Salvar alterações'}
        </button>
      </div>

      <div className="admin-card-deep p-5">
        <h3 className="font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>Link público</h3>
        <p className="text-xs mb-3" style={{ color: 'var(--admin-text-mute)' }}>
          Seu endereço de agendamento online.
        </p>
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{
            background: 'var(--admin-input-bg)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
            agendapro.net.br/
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--admin-accent)' }}>
            {business.slug}
          </span>
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--admin-text-faded)' }}>
          O endereço não pode ser alterado após o cadastro.
        </p>
      </div>
    </div>
  )
}
