'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/compress-image'

/**
 * Card de upload de foto do owner-prof na aba /admin/eu.
 *
 * Reusa o mesmo fluxo do ContaView do profissional (compressão
 * client-side via web worker → upload bucket professional-photos →
 * persiste via /api/profissional/update-photo com service_role).
 *
 * Marca o passo "Personalize seu perfil" do checklist do tutorial
 * (depende de owner-prof.photo_url IS NOT NULL).
 */
type Props = {
  professionalId: string
  businessId: string
  name: string
  initialPhotoUrl: string | null
}

export default function OwnerPhotoCard({
  professionalId,
  businessId,
  name,
  initialPhotoUrl,
}: Props) {
  const router = useRouter()
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase()

  async function handleUpload(file: File) {
    setError(null)
    setUploading(true)

    const result = await compressImage(file, 'photo')
    if (!result.ok) {
      setError(result.reason)
      setUploading(false)
      return
    }

    const optimized = result.file
    const ext = (optimized.name.split('.').pop() || 'webp').toLowerCase()
    const path = `${businessId}/${professionalId}.${ext}`

    const supabase = createClient()
    const { error: upErr } = await supabase.storage
      .from('professional-photos')
      .upload(path, optimized, {
        upsert: true,
        cacheControl: '3600',
        contentType: optimized.type,
      })

    if (upErr) {
      setError('Erro ao enviar foto: ' + upErr.message)
      setUploading(false)
      return
    }

    const { data: pub } = supabase.storage.from('professional-photos').getPublicUrl(path)
    const publicUrl = `${pub.publicUrl}?v=${Date.now()}`

    const res = await fetch('/api/profissional/update-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUrl: publicUrl }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erro ao salvar referência')
      setUploading(false)
      return
    }

    setPhotoUrl(publicUrl)
    setUploading(false)
    // Refresh server components — atualiza checklist do tutorial e
    // qualquer avatar exibido em outros componentes
    router.refresh()
  }

  // Sem foto? Mostra card de call-to-action grande
  if (!photoUrl) {
    return (
      <section className="relative max-w-lg mx-auto px-4 mb-6">
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 14%, var(--admin-surface)) 0%, color-mix(in srgb, var(--brand-secondary) 10%, var(--admin-surface)) 100%)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <div
            className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full blur-[60px] opacity-50"
            style={{ background: 'var(--admin-accent-bg)' }}
          />
          <div className="relative flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl font-extrabold"
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: 'var(--admin-text)',
                border: '2px dashed var(--admin-border)',
              }}
            >
              {initials || '👤'}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                style={{ color: 'var(--admin-accent)' }}
              >
                ✨ Sua foto profissional
              </p>
              <p className="text-sm font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
                Adicione uma foto pra clientes te reconhecerem
              </p>
              <p className="text-[11px] mt-1 leading-snug" style={{ color: 'var(--admin-text-mute)' }}>
                Aparece nos cards de agendamento e na sua página pública.
              </p>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleUpload(f)
              e.target.value = ''
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mt-4 w-full px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            style={{
              background:
                'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
              color: '#fff',
              boxShadow: '0 4px 12px -4px color-mix(in srgb, var(--brand-primary) 50%, transparent)',
            }}
          >
            {uploading ? 'Enviando…' : '📸 Escolher foto'}
          </button>

          {error && (
            <p className="text-xs mt-2.5" style={{ color: 'var(--admin-warn)' }}>
              ⚠️ {error}
            </p>
          )}
        </div>
      </section>
    )
  }

  // Com foto: card menor com preview + botão pra trocar
  return (
    <section className="relative max-w-lg mx-auto px-4 mb-6">
      <div className="admin-card p-3.5 flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden"
          style={{ background: 'var(--admin-accent-bg)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--admin-text-faded)' }}
          >
            Sua foto
          </p>
          <p
            className="text-sm font-semibold leading-tight truncate"
            style={{ color: 'var(--admin-text)' }}
          >
            ✓ Aparece pros clientes
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleUpload(f)
            e.target.value = ''
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{
            background: 'transparent',
            color: 'var(--admin-text-mute)',
            border: '1px solid var(--admin-border)',
          }}
        >
          {uploading ? 'Enviando…' : 'Trocar'}
        </button>
      </div>
      {error && (
        <p className="text-xs mt-2 text-center" style={{ color: 'var(--admin-warn)' }}>
          ⚠️ {error}
        </p>
      )}
    </section>
  )
}
