'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/compress-image'
import { IconPlus, IconTrash, IconClose } from '@/components/ui/Icon'

type Photo = {
  id: string
  url: string
  caption: string | null
  taken_at: string
}

type Props = {
  customerId: string
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
}

export default function GaleriaTab({ customerId }: Props) {
  const router = useRouter()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Photo | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const sb = createClient()
    const { data } = await sb
      .from('customer_photos')
      .select('id, url, caption, taken_at')
      .eq('customer_id', customerId)
      .order('taken_at', { ascending: false })
    setPhotos((data ?? []) as Photo[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  async function handleUpload(file: File) {
    setError(null)
    setUploading(true)

    // Comprime no browser ANTES do upload (memória cravada: padrão AgendaPRO)
    const compressed = await compressImage(file, 'gallery')
    if (!compressed.ok) {
      setError(compressed.reason)
      setUploading(false)
      return
    }

    const form = new FormData()
    form.append('file', compressed.file)
    const res = await fetch(`/api/admin/customers/${customerId}/photos`, {
      method: 'POST',
      body: form,
    })
    setUploading(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'falha_upload')
      return
    }
    await load()
    router.refresh()
  }

  async function remove(photoId: string) {
    if (!confirm('Remover essa foto?')) return
    const res = await fetch(`/api/admin/customers/${customerId}/photos?photoId=${photoId}`, { method: 'DELETE' })
    if (res.ok) {
      setPreview(null)
      await load()
      router.refresh()
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
          {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
        </p>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          <IconPlus size={14} /> {uploading ? 'Enviando…' : 'Adicionar Foto'}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleUpload(f)
            e.target.value = ''
          }}
        />
      </div>

      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{
          background: 'color-mix(in srgb, var(--admin-danger,#EF4444) 14%, transparent)',
          color: 'var(--admin-danger,#EF4444)',
        }}>
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-center text-sm py-10" style={{ color: 'var(--admin-text-mute)' }}>
          Carregando…
        </p>
      ) : photos.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: 'var(--admin-surface)', border: '1px dashed var(--admin-border)' }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
            Nenhuma foto adicionada
          </p>
          <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
            Faça upload de fotos de antes/depois ou referências do trabalho.
            <br />
            Formatos: JPG · PNG · WebP · máximo 5MB.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((p) => (
            <div
              key={p.id}
              className="relative rounded-xl overflow-hidden aspect-square group"
              style={{ background: 'var(--admin-surface-hi)' }}
            >
              <button
                type="button"
                onClick={() => setPreview(p)}
                className="absolute inset-0 w-full h-full"
                aria-label="Ampliar"
              >
                <Image
                  src={p.url}
                  alt={p.caption ?? 'Foto'}
                  fill
                  sizes="(max-width: 640px) 50vw, 200px"
                  style={{ objectFit: 'cover' }}
                  unoptimized
                />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  remove(p.id)
                }}
                aria-label="Remover foto"
                title="Remover foto"
                className="absolute top-1.5 right-1.5 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}
              >
                <IconTrash size={14} />
              </button>
              <div
                className="absolute bottom-0 left-0 right-0 px-2 py-1.5 text-[10px] pointer-events-none"
                style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', color: '#fff' }}
              >
                {formatDate(p.taken_at)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal preview */}
      {preview && createPortal(
        <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setPreview(null)} />
          <button
            type="button"
            onClick={() => setPreview(null)}
            aria-label="Fechar"
            className="absolute top-4 right-4 p-2 rounded-lg z-10"
            style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
          >
            <IconClose size={20} />
          </button>
          <button
            type="button"
            onClick={() => remove(preview.id)}
            aria-label="Remover"
            className="absolute top-4 left-4 p-2 rounded-lg z-10 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
            style={{ background: 'var(--admin-danger,#EF4444)', color: '#fff' }}
          >
            <IconTrash size={14} /> Remover
          </button>
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <Image
              src={preview.url}
              alt={preview.caption ?? 'Foto'}
              width={1200}
              height={1200}
              style={{ objectFit: 'contain', maxHeight: '100%', maxWidth: '100%', width: 'auto', height: 'auto' }}
              unoptimized
            />
          </div>
          {preview.caption && (
            <p className="absolute bottom-4 left-4 right-4 text-center text-sm px-4 py-2 rounded-lg" style={{
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
            }}>
              {preview.caption}
            </p>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
