'use client'

import { useState } from 'react'
import { IconInbox, IconShare, IconCheck, IconWhatsapp } from '@/components/ui/Icon'

export default function EmptyTodayCTA({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)

  function bookingUrl() {
    if (typeof window === 'undefined') return `https://agendapro.net.br/${slug}`
    return `${window.location.origin}/${slug}`
  }

  async function handleCopy() {
    const url = bookingUrl()
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(`Agende seu horário comigo: ${bookingUrl()}`)}`

  return (
    <div className="admin-card p-6 text-center">
      <div
        className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3"
        style={{
          background: 'var(--admin-accent-bg)',
          color: 'var(--admin-accent)',
        }}
      >
        <IconInbox size={26} />
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
        Nenhum agendamento hoje
      </p>
      <p className="text-xs mt-1 mb-4" style={{ color: 'var(--admin-text-mute)' }}>
        Compartilha teu link agora — em minutos cliente já agenda sozinho
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all inline-flex items-center justify-center gap-1.5 hover:translate-y-[-1px]"
          style={
            copied
              ? {
                  background: 'rgba(16,185,129,0.15)',
                  color: 'var(--admin-success)',
                  border: '1px solid rgba(16,185,129,0.3)',
                }
              : {
                  background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                  color: '#fff',
                  boxShadow: '0 8px 20px rgba(59,130,246,0.35)',
                }
          }
        >
          {copied ? <><IconCheck size={14} /> Copiado</> : <><IconShare size={14} /> Copiar link</>}
        </button>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all inline-flex items-center justify-center gap-1.5 hover:translate-y-[-1px]"
          style={{
            background: 'rgba(37,211,102,0.12)',
            color: '#16A34A',
            border: '1px solid rgba(37,211,102,0.25)',
          }}
        >
          <IconWhatsapp size={14} /> WhatsApp
        </a>
      </div>
    </div>
  )
}
