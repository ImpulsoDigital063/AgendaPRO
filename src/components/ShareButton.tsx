'use client'

import { useState } from 'react'
import { IconShare, IconCheck } from '@/components/ui/Icon'

export default function ShareButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const url = `${window.location.origin}/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <button
      onClick={handleCopy}
      aria-label="Compartilhar link de agendamento"
      title={copied ? 'Link copiado!' : 'Compartilhar página'}
      className="relative inline-flex items-center justify-center rounded-full transition-all hover:scale-[1.04] active:scale-95"
      style={{
        width: 36,
        height: 36,
        background: copied ? 'rgba(16,185,129,0.15)' : 'var(--admin-surface)',
        border: `1px solid ${copied ? 'rgba(16,185,129,0.35)' : 'var(--admin-border)'}`,
        color: copied ? 'var(--admin-success)' : 'var(--admin-text-2)',
      }}
    >
      {copied ? <IconCheck size={16} /> : <IconShare size={16} />}
    </button>
  )
}
