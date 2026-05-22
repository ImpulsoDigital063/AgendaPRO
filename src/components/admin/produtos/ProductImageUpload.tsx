'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/compress-image'
import { IconCamera, IconClose } from '@/components/ui/Icon'

type Props = {
  businessId: string
  /** Se já tem URL salva (no caso de editar produto existente) */
  initialUrl?: string | null
  /** Chama com a nova URL · ou null se removeu */
  onChange: (url: string | null) => void
  /** Pra produto novo (sem id) usamos um id temporário pra path do bucket */
  productId?: string
}

export default function ProductImageUpload({
  businessId,
  initialUrl = null,
  onChange,
  productId,
}: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
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
    const fileId = productId || `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const path = `${businessId}/${fileId}.${ext}`

    const supabase = createClient()
    const { error: upErr } = await supabase.storage
      .from('product-photos')
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

    const { data: pub } = supabase.storage.from('product-photos').getPublicUrl(path)
    const publicUrl = `${pub.publicUrl}?v=${Date.now()}`
    setUrl(publicUrl)
    onChange(publicUrl)
    setUploading(false)
  }

  function remove() {
    setUrl(null)
    onChange(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="flex items-start gap-3">
      <div
        className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
        style={{
          background: url ? `url(${url}) center/cover` : 'var(--admin-input-bg)',
          border: '1px solid var(--admin-border)',
        }}
      >
        {!url && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'var(--admin-text-faded)' }}>
            <IconCamera size={20} />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[10px] font-bold">
            ...
          </div>
        )}
      </div>

      <div className="flex-1 space-y-1.5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-40"
          style={{
            background: 'var(--admin-accent)',
            color: '#fff',
          }}
        >
          {url ? 'Trocar foto' : 'Adicionar foto'}
        </button>
        {url && (
          <button
            type="button"
            onClick={remove}
            disabled={uploading}
            className="ml-1.5 text-xs font-semibold inline-flex items-center gap-1"
            style={{ color: '#DC2626' }}
          >
            <IconClose size={10} /> Remover
          </button>
        )}
        <p className="text-[10px]" style={{ color: 'var(--admin-text-mute)' }}>
          JPG, PNG ou WebP. Máx 5MB. Comprimido automaticamente.
        </p>
        {error && (
          <p className="text-[11px] font-semibold" style={{ color: '#DC2626' }}>{error}</p>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />
    </div>
  )
}
