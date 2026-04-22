'use client'

import { useRef, useState } from 'react'
import type { Business } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { IconCheck, IconCamera, IconClose } from '@/components/ui/Icon'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'
import GoogleReviewGuide from '@/components/admin/GoogleReviewGuide'

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
  const [instagramUrl, setInstagramUrl] = useState(business.instagram_url || '')
  const [facebookUrl, setFacebookUrl] = useState(business.facebook_url || '')
  const [tiktokUrl, setTiktokUrl] = useState(business.tiktok_url || '')
  const [websiteUrl, setWebsiteUrl] = useState(business.website_url || '')
  const [logoUrl, setLogoUrl] = useState(business.logo_url || '')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [confirmRemoveLogo, setConfirmRemoveLogo] = useState(false)
  const [showReviewGuide, setShowReviewGuide] = useState(false)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  async function handleUploadLogo(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Envie uma imagem (PNG, JPG ou WEBP).')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Imagem muito grande. Máximo 4MB.')
      return
    }
    setError('')
    setUploadingLogo(true)
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    // Path com underscore evita colidir com fotos de profissional (UUID puro)
    const path = `${business.id}/_logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('professional-photos')
      .upload(path, file, { upsert: true, cacheControl: '3600' })

    if (uploadError) {
      setError('Erro ao enviar logo: ' + uploadError.message)
      setUploadingLogo(false)
      return
    }

    const { data: pub } = supabase.storage.from('professional-photos').getPublicUrl(path)
    const publicUrl = `${pub.publicUrl}?v=${Date.now()}`

    const { error: updateError } = await supabase
      .from('businesses')
      .update({ logo_url: publicUrl })
      .eq('id', business.id)

    if (!updateError) {
      setLogoUrl(publicUrl)
    } else {
      setError('Erro ao salvar referência da logo.')
    }
    setUploadingLogo(false)
  }

  async function handleRemoveLogo() {
    setUploadingLogo(true)
    const { data: files } = await supabase.storage
      .from('professional-photos')
      .list(business.id, { search: '_logo' })
    if (files && files.length > 0) {
      await supabase.storage
        .from('professional-photos')
        .remove(files.map((f) => `${business.id}/${f.name}`))
    }
    await supabase.from('businesses').update({ logo_url: null }).eq('id', business.id)
    setLogoUrl('')
    setUploadingLogo(false)
  }

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
        instagram_url: instagramUrl.trim() || null,
        facebook_url: facebookUrl.trim() || null,
        tiktok_url: tiktokUrl.trim() || null,
        website_url: websiteUrl.trim() || null,
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

        {/* Logo */}
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 flex-shrink-0">
            <div
              className="w-full h-full rounded-2xl overflow-hidden flex items-center justify-center"
              style={{
                background: logoUrl ? 'transparent' : 'var(--admin-input-bg)',
                border: '1px solid var(--admin-border)',
              }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <IconCamera size={28} className="opacity-40" />
              )}
            </div>
            {logoUrl && (
              <button
                type="button"
                onClick={() => setConfirmRemoveLogo(true)}
                disabled={uploadingLogo}
                className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow-md disabled:opacity-50 ring-2 ring-[var(--admin-bg)]"
                style={{ background: 'var(--admin-danger)', color: '#FFFFFF' }}
                title="Remover logo"
                aria-label="Remover logo"
              >
                <IconClose size={12} strokeWidth={2.5} />
              </button>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
              Logo do negócio
            </p>
            <p className="text-xs mb-2" style={{ color: 'var(--admin-text-mute)' }}>
              PNG, JPG ou WEBP. Ideal quadrada, 512×512px. Máximo 4MB. Aparece nas telas públicas.
            </p>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleUploadLogo(f)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploadingLogo}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              style={{
                background: 'var(--admin-accent-bg)',
                color: 'var(--admin-accent)',
                border: '1px solid var(--admin-accent-border)',
              }}
            >
              {uploadingLogo ? 'Enviando...' : logoUrl ? 'Trocar logo' : 'Enviar logo'}
            </button>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--admin-divider)' }} />

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
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="admin-label !mb-0">Link direto pra avaliar</label>
              <button
                type="button"
                onClick={() => setShowReviewGuide(true)}
                className="text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
                style={{ color: 'var(--admin-accent)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Como pegar?
              </button>
            </div>
            <input
              type="url"
              value={googleMapsUrl}
              onChange={e => setGoogleMapsUrl(e.target.value)}
              className="admin-input w-full px-3 py-2.5 text-sm"
              placeholder="https://g.page/r/SEU_ID/review"
            />
            <p className="text-xs mt-1.5" style={{ color: 'var(--admin-text-mute)' }}>
              Use o link <strong>direto de avaliação</strong>. Link do Google Maps comum pede pra baixar o app no celular do cliente.
            </p>
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

        <div
          className="pt-4 space-y-3"
          style={{ borderTop: '1px solid var(--admin-divider)' }}
        >
          <h4
            className="text-xs font-semibold uppercase tracking-[0.15em]"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            Redes sociais
          </h4>
          <p className="text-xs -mt-1" style={{ color: 'var(--admin-text-mute)' }}>
            Aparecem como ícones na sua página pública. Cole o link completo de cada uma.
          </p>
          <div>
            <label className="admin-label">Instagram</label>
            <input
              type="url"
              value={instagramUrl}
              onChange={e => setInstagramUrl(e.target.value)}
              className="admin-input w-full px-3 py-2.5 text-sm"
              placeholder="https://instagram.com/seunegocio"
            />
          </div>
          <div>
            <label className="admin-label">Facebook</label>
            <input
              type="url"
              value={facebookUrl}
              onChange={e => setFacebookUrl(e.target.value)}
              className="admin-input w-full px-3 py-2.5 text-sm"
              placeholder="https://facebook.com/seunegocio"
            />
          </div>
          <div>
            <label className="admin-label">TikTok</label>
            <input
              type="url"
              value={tiktokUrl}
              onChange={e => setTiktokUrl(e.target.value)}
              className="admin-input w-full px-3 py-2.5 text-sm"
              placeholder="https://tiktok.com/@seunegocio"
            />
          </div>
          <div>
            <label className="admin-label">Site</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              className="admin-input w-full px-3 py-2.5 text-sm"
              placeholder="https://seunegocio.com.br"
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

      <ConfirmActionModal
        open={confirmRemoveLogo}
        title="Remover logo?"
        message="A logo do negócio vai ser removida das telas públicas. Você pode subir outra depois."
        confirmLabel="Sim, remover"
        cancelLabel="Voltar"
        tone="warn"
        loading={uploadingLogo}
        onConfirm={async () => {
          await handleRemoveLogo()
          setConfirmRemoveLogo(false)
        }}
        onClose={() => setConfirmRemoveLogo(false)}
      />

      {showReviewGuide && <GoogleReviewGuide onClose={() => setShowReviewGuide(false)} />}
    </div>
  )
}
