'use client'

import { useRef, useState, useMemo } from 'react'
import type { Business } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/compress-image'
import {
  IconCheck,
  IconCamera,
  IconInstagram,
  IconFacebook,
  IconTiktok,
  IconGlobe,
  IconCopy,
  IconExternalLink,
  IconAlert,
  IconInfo,
} from '@/components/ui/Icon'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'
import GoogleReviewGuide from '@/components/admin/GoogleReviewGuide'
import StickyActionBar from '@/components/admin/StickyActionBar'

type Props = {
  business: Business
}

function maskPhoneProgressive(raw: string): string {
  const d = (raw || '').replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export default function NegocioTab({ business }: Props) {
  const [name, setName] = useState(business.name)
  const [phone, setPhone] = useState(maskPhoneProgressive(business.phone || ''))
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
  const [linkCopied, setLinkCopied] = useState(false)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const [snapshot, setSnapshot] = useState({
    name: business.name,
    phone: maskPhoneProgressive(business.phone || ''),
    address: business.address || '',
    description: business.description || '',
    googleMapsUrl: business.google_place_id || '',
    googleRating: business.google_rating ? String(business.google_rating) : '',
    googleReviewsCount: business.google_reviews_count ? String(business.google_reviews_count) : '',
    pointsForReview: business.points_for_review ? String(business.points_for_review) : '',
    instagramUrl: business.instagram_url || '',
    facebookUrl: business.facebook_url || '',
    tiktokUrl: business.tiktok_url || '',
    websiteUrl: business.website_url || '',
  })

  const isDirty = useMemo(
    () =>
      name !== snapshot.name ||
      phone !== snapshot.phone ||
      address !== snapshot.address ||
      description !== snapshot.description ||
      googleMapsUrl !== snapshot.googleMapsUrl ||
      googleRating !== snapshot.googleRating ||
      googleReviewsCount !== snapshot.googleReviewsCount ||
      pointsForReview !== snapshot.pointsForReview ||
      instagramUrl !== snapshot.instagramUrl ||
      facebookUrl !== snapshot.facebookUrl ||
      tiktokUrl !== snapshot.tiktokUrl ||
      websiteUrl !== snapshot.websiteUrl,
    [name, phone, address, description, googleMapsUrl, googleRating, googleReviewsCount, pointsForReview, instagramUrl, facebookUrl, tiktokUrl, websiteUrl, snapshot]
  )

  async function handleUploadLogo(file: File) {
    setError('')
    setUploadingLogo(true)

    const result = await compressImage(file, 'logo')
    if (!result.ok) {
      setError(result.reason)
      setUploadingLogo(false)
      return
    }

    const optimized = result.file
    const ext = (optimized.name.split('.').pop() || 'webp').toLowerCase()
    const path = `${business.id}/_logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('professional-photos')
      .upload(path, optimized, { upsert: true, cacheControl: '3600', contentType: optimized.type })

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

    const phoneDigits = phone.replace(/\D/g, '')

    const { error: err } = await supabase
      .from('businesses')
      .update({
        name: name.trim(),
        phone: phoneDigits || null,
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
      setSnapshot({
        name: name.trim(),
        phone,
        address: address.trim(),
        description: description.trim(),
        googleMapsUrl: googleMapsUrl.trim(),
        googleRating,
        googleReviewsCount,
        pointsForReview,
        instagramUrl: instagramUrl.trim(),
        facebookUrl: facebookUrl.trim(),
        tiktokUrl: tiktokUrl.trim(),
        websiteUrl: websiteUrl.trim(),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const publicUrl = `agendapro.net.br/${business.slug}`
  const fullUrl = `https://${publicUrl}`

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Sub-card 1: Identidade visual */}
      <Section title="Identidade visual" subtitle="Como seu negócio aparece nas telas públicas">
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
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
              Logo do negócio
            </p>
            <p className="text-[11px] mb-2" style={{ color: 'var(--admin-text-mute)' }}>
              PNG, JPG ou WEBP · quadrada 512×512 · até 4MB
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
            <div className="flex gap-2 flex-wrap">
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
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setConfirmRemoveLogo(true)}
                  disabled={uploadingLogo}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  style={{
                    background: 'transparent',
                    color: 'var(--admin-text-faded)',
                    border: '1px solid var(--admin-border)',
                  }}
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="admin-label">Nome do negócio *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="admin-input w-full px-3 py-2.5 text-sm"
            placeholder="Nome que vai aparecer pra seus clientes"
          />
        </div>
      </Section>

      {/* Sub-card 2: Contato e localização */}
      <Section title="Contato e localização" subtitle="Como o cliente fala com você">
        <div>
          <label className="admin-label">WhatsApp</label>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={e => setPhone(maskPhoneProgressive(e.target.value))}
            className="admin-input w-full px-3 py-2.5 text-sm"
            placeholder="(63) 99999-9999"
            maxLength={15}
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
      </Section>

      {/* Sub-card 3: Sobre o negócio */}
      <Section title="Sobre o negócio" subtitle="Aparece como subtítulo na sua página pública">
        <div>
          <label className="admin-label">Categoria ou descrição curta</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="admin-input w-full px-3 py-2.5 text-sm resize-none"
            placeholder="Ex: Barbearia · Salão de beleza · Clínica de estética"
          />
        </div>
      </Section>

      {/* Sub-card 4: Reputação Google */}
      <Section
        title="Reputação no Google"
        subtitle="Mostra prova social na sua página e dá pontos pra quem avaliar"
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <label className="admin-label !mb-0">Link direto pra avaliar</label>
            <button
              type="button"
              onClick={() => setShowReviewGuide(true)}
              className="text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--admin-accent)' }}
            >
              <IconInfo size={14} />
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
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-mute)' }}>
            Use o link <strong>direto de avaliação</strong>. Link comum do Maps pede pra baixar o app.
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

        <div
          className="flex items-start gap-2 rounded-lg px-3 py-2.5"
          style={{
            background: 'color-mix(in srgb, var(--admin-warn) 10%, var(--admin-input-bg))',
            border: '1px solid color-mix(in srgb, var(--admin-warn) 30%, var(--admin-border))',
          }}
        >
          <IconAlert size={14} style={{ color: 'var(--admin-warn)', marginTop: 2, flexShrink: 0 }} />
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
            Use os números reais do seu Google. Mentir aqui prejudica sua credibilidade quando o cliente clica e vê o número diferente.
          </p>
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
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-mute)' }}>
            Cliente ganha esses pontos no programa de fidelidade ao confirmar que avaliou.
          </p>
        </div>
      </Section>

      {/* Sub-card 5: Redes sociais */}
      <Section
        title="Redes sociais"
        subtitle="Aparecem como ícones na sua página pública"
      >
        <SocialInput
          icon={<IconInstagram size={16} />}
          iconColor="#E1306C"
          label="Instagram"
          value={instagramUrl}
          onChange={setInstagramUrl}
          placeholder="https://instagram.com/seunegocio"
        />
        <SocialInput
          icon={<IconFacebook size={16} />}
          iconColor="#1877F2"
          label="Facebook"
          value={facebookUrl}
          onChange={setFacebookUrl}
          placeholder="https://facebook.com/seunegocio"
        />
        <SocialInput
          icon={<IconTiktok size={16} />}
          iconColor="var(--admin-text)"
          label="TikTok"
          value={tiktokUrl}
          onChange={setTiktokUrl}
          placeholder="https://tiktok.com/@seunegocio"
        />
        <SocialInput
          icon={<IconGlobe size={16} />}
          iconColor="var(--admin-text-faded)"
          label="Site"
          value={websiteUrl}
          onChange={setWebsiteUrl}
          placeholder="https://seunegocio.com.br"
        />
      </Section>

      {/* Sub-card 6: Link público */}
      <Section
        title="Link público de agendamento"
        subtitle="Compartilhe esse link no Instagram, WhatsApp e cartões"
      >
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{
            background: 'var(--admin-input-bg)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <span className="text-xs whitespace-nowrap" style={{ color: 'var(--admin-text-mute)' }}>
            agendapro.net.br/
          </span>
          <span
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--admin-accent)' }}
          >
            {business.slug}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
            style={{
              background: linkCopied ? 'rgba(16,185,129,0.15)' : 'var(--admin-input-bg)',
              color: linkCopied ? '#16A34A' : 'var(--admin-text)',
              border: `1px solid ${linkCopied ? 'rgba(16,185,129,0.4)' : 'var(--admin-border)'}`,
            }}
          >
            {linkCopied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            {linkCopied ? 'Copiado!' : 'Copiar link'}
          </button>
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
            style={{
              background: 'var(--admin-accent-bg)',
              color: 'var(--admin-accent)',
              border: '1px solid var(--admin-accent-border)',
            }}
          >
            <IconExternalLink size={14} />
            Abrir página
          </a>
        </div>

        <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
          O endereço não pode ser alterado após o cadastro.
        </p>
      </Section>

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

      <StickyActionBar
        dirty={isDirty}
        saving={saving}
        saved={saved}
        error={error}
        onSave={handleSave}
        offsetBottom={72}
      />
    </div>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="admin-card-deep p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>
          {title}
        </h3>
        {subtitle && (
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}

function SocialInput({
  icon,
  iconColor,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode
  iconColor: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div>
      <label
        className="admin-label flex items-center gap-1.5"
        style={{ color: 'var(--admin-text-mute)' }}
      >
        <span style={{ color: iconColor, display: 'inline-flex' }}>{icon}</span>
        {label}
      </label>
      <input
        type="url"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="admin-input w-full px-3 py-2.5 text-sm"
        placeholder={placeholder}
      />
    </div>
  )
}
