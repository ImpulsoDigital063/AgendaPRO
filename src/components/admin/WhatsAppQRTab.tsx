'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { createClient } from '@/lib/supabase/client'
import type { Business } from '@/lib/types'

type Props = {
  business: Business
  onNavigateToNegocio: () => void
}

const SUGESTOES = [
  { label: 'Recepção', icon: IconReception() },
  { label: 'Espelho', icon: IconMirror() },
  { label: 'Balcão', icon: IconCounter() },
  { label: 'Vitrine', icon: IconWindow() },
  { label: 'Cardápio', icon: IconMenu() },
  { label: 'Caixa', icon: IconBox() },
]

function defaultIntroMessage(businessName: string) {
  return `Olá! Quero agendar um horário na ${businessName}.`
}

function formatPhoneBR(digits: string) {
  // Espera DDD + número (10 ou 11 dígitos). Mostra +55 se já tiver código de país.
  let local = digits
  let cc = '+55'
  if (digits.length >= 12 && digits.startsWith('55')) {
    local = digits.slice(2)
    cc = '+55'
  }
  if (local.length === 11) {
    return `${cc} (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  }
  if (local.length === 10) {
    return `${cc} (${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  }
  return `${cc} ${local}`
}

function buildPhoneForWA(digits: string) {
  // Garante que sempre tem código do país (55 BR como default).
  if (digits.length >= 12 && digits.startsWith('55')) return digits
  return `55${digits}`
}

export default function WhatsAppQRTab({ business, onNavigateToNegocio }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const qrRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const phoneClean = (business.phone || '').replace(/\D/g, '')
  const phoneForWA = buildPhoneForWA(phoneClean)
  const phonePretty = formatPhoneBR(phoneClean)

  const initialMsg = business.whatsapp_intro_message ?? defaultIntroMessage(business.name)
  const [msg, setMsg] = useState(initialMsg)
  const [savedMsg, setSavedMsg] = useState(initialMsg)
  const [saving, setSaving] = useState(false)
  const [savedFlag, setSavedFlag] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  const dirty = msg !== savedMsg
  const waMessage = encodeURIComponent(msg.trim() || defaultIntroMessage(business.name))
  const waUrl = `https://wa.me/${phoneForWA}?text=${waMessage}`

  // Debounce autosave da mensagem editável
  useEffect(() => {
    if (!dirty) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaving(true)
      const trimmed = msg.trim()
      const value = trimmed.length > 0 ? trimmed : null
      const { error } = await supabase
        .from('businesses')
        .update({ whatsapp_intro_message: value })
        .eq('id', business.id)
      setSaving(false)
      if (!error) {
        setSavedMsg(msg)
        setSavedFlag(true)
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
        savedTimeoutRef.current = setTimeout(() => setSavedFlag(false), 2000)
      }
    }, 800)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [msg, dirty, supabase, business.id])

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
    }
  }, [])

  function handleDownloadPNG() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const img = new Image()
    img.onload = () => {
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 1024, 1024)
      ctx.drawImage(img, 0, 0, 1024, 1024)
      const link = document.createElement('a')
      link.download = `qrcode-whatsapp-${business.name.toLowerCase().replace(/\s+/g, '-')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(waUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* silently */
    }
  }

  async function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${business.name} no WhatsApp`,
          text: `Agende seu horário pelo WhatsApp:`,
          url: waUrl,
        })
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      } catch {
        /* cancelado pelo usuario */
      }
    } else {
      // Fallback: copia o link
      handleCopyLink()
    }
  }

  function handleTest() {
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  function handlePrint() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const w = window.open('', '_blank', 'width=600,height=800')
    if (!w) return
    w.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>QR Code WhatsApp - ${escapeHtml(business.name)}</title>
          <meta charset="utf-8" />
          <style>
            @page { size: A5; margin: 18mm; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 24px;
              color: #111827;
              background: #fff;
              text-align: center;
            }
            h1 { font-size: 22px; margin: 0 0 4px; }
            h2 { font-size: 14px; margin: 0 0 18px; color: #6b7280; font-weight: 500; }
            .qr { display: flex; justify-content: center; padding: 16px; border: 2px solid #e5e7eb; border-radius: 16px; background: #fff; }
            .qr svg { width: 280px; height: 280px; }
            .phone { margin-top: 14px; font-size: 14px; color: #374151; }
            .cta { margin-top: 22px; font-size: 16px; font-weight: 700; color: #25D366; }
            .footer { margin-top: 18px; font-size: 11px; color: #9ca3af; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(business.name)}</h1>
          <h2>Agende pelo WhatsApp</h2>
          <div class="qr">${svgData}</div>
          <div class="phone">${escapeHtml(phonePretty)}</div>
          <div class="cta">Aponte a câmera, escaneie e fale comigo</div>
          <div class="footer">Powered by AgendaPRO</div>
          <script>window.onload = () => { window.focus(); window.print(); }<\/script>
        </body>
      </html>
    `)
    w.document.close()
  }

  // Empty state forte quando nao ha telefone
  if (!phoneClean) {
    return (
      <div
        className="admin-card p-6 sm:p-8 text-center"
        style={{ background: 'var(--admin-surface)' }}
      >
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'rgba(37, 211, 102, 0.12)', color: '#25D366' }}
        >
          <IconWhatsApp size={32} />
        </div>
        <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--admin-text)' }}>
          Cadastre seu WhatsApp primeiro
        </h3>
        <p className="text-sm mb-5 leading-relaxed max-w-sm mx-auto" style={{ color: 'var(--admin-text-faded)' }}>
          O QR Code abre o WhatsApp do seu negócio direto na conversa. Sem o número cadastrado, não dá pra gerar.
        </p>
        <button
          type="button"
          onClick={onNavigateToNegocio}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          Cadastrar telefone agora
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </button>
      </div>
    )
  }

  const hasShare = typeof navigator !== 'undefined' && !!navigator.share

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(37, 211, 102, 0.12)', color: '#25D366' }}
        >
          <IconWhatsApp size={20} />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold leading-tight" style={{ color: 'var(--admin-text)' }}>
            QR Code do WhatsApp
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
            Cliente escaneia, abre conversa com você. Sem custo de API.
          </p>
        </div>
      </div>

      {/* Card QR */}
      <div className="admin-card p-5 sm:p-6">
        <div
          ref={qrRef}
          className="flex justify-center p-5 sm:p-6 rounded-2xl mx-auto"
          style={{ background: '#ffffff', border: '2px solid var(--admin-border)', maxWidth: 360 }}
        >
          <QRCode
            value={waUrl}
            size={220}
            bgColor="#ffffff"
            fgColor="#111827"
            level="M"
          />
        </div>

        <p className="text-center text-sm mt-4 flex items-center justify-center gap-2 font-medium" style={{ color: 'var(--admin-text-2)' }}>
          <IconPhone />
          {phonePretty}
        </p>
      </div>

      {/* Mensagem editável */}
      <div className="admin-card p-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-mute)' }}>
            Mensagem que cai no seu WhatsApp
          </label>
          <span className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
            {saving ? 'Salvando...' : savedFlag ? 'Salvo' : ''}
          </span>
        </div>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder={defaultIntroMessage(business.name)}
          rows={2}
          maxLength={240}
          className="w-full text-sm px-3 py-2 rounded-xl resize-none focus:outline-none"
          style={{
            background: 'var(--admin-input-bg)',
            color: 'var(--admin-text)',
            border: '1px solid var(--admin-border)',
          }}
        />
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-faded)' }}>
          O cliente envia essa mensagem ao escanear. Pode personalizar (ex: "Quero saber preços", "Confirmar horário").
        </p>
      </div>

      {/* Ação primária — Compartilhar (Web Share) ou Imprimir */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
          style={{ background: '#25D366', color: '#fff' }}
        >
          <IconShare />
          {shared ? 'Compartilhado!' : hasShare ? 'Compartilhar' : 'Compartilhar (copia link)'}
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          <IconPrint />
          Imprimir A5
        </button>
      </div>

      {/* Ações secundárias */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleDownloadPNG}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-colors"
          style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
        >
          <IconDownload />
          PNG
        </button>
        <button
          onClick={handleCopyLink}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-colors"
          style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
        >
          <IconCopy />
          {copied ? 'Copiado!' : 'Link'}
        </button>
        <button
          onClick={handleTest}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-colors"
          style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
        >
          <IconExternal />
          Testar
        </button>
      </div>

      {/* Stepper visual */}
      <div className="admin-card p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--admin-text-mute)' }}>
          Como funciona
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Step n={1} label="Imprima ou compartilhe" />
          <Step n={2} label="Cole na parede" />
          <Step n={3} label="Cliente aponta a câmera" />
          <Step n={4} label="Cai no seu WhatsApp" />
        </div>
      </div>

      {/* Pills de sugestão de onde colar */}
      <div className="admin-card p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--admin-text-mute)' }}>
          Onde colar (sugestões)
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGESTOES.map((s) => (
            <span
              key={s.label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: 'var(--admin-accent-bg)',
                color: 'var(--admin-text-2)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <span style={{ color: 'var(--admin-accent)' }}>{s.icon}</span>
              {s.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function Step({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-2">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
        style={{ background: 'rgba(37, 211, 102, 0.12)', color: '#25D366' }}
      >
        {n}
      </div>
      <p className="text-[11px] leading-tight" style={{ color: 'var(--admin-text-2)' }}>
        {label}
      </p>
    </div>
  )
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/* ---------- Ícones ---------- */

function IconWhatsApp({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function IconPhone() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  )
}

function IconShare() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  )
}

function IconPrint() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <rect x="6" y="14" width="12" height="8"/>
    </svg>
  )
}

function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  )
}

function IconExternal() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  )
}

function IconReception() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21v-2a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2"/><path d="M3 21h18"/>
      <circle cx="12" cy="8" r="4"/>
    </svg>
  )
}

function IconMirror() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2" width="12" height="18" rx="6"/><path d="M9 22h6"/>
    </svg>
  )
}

function IconCounter() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="10" width="20" height="8" rx="1"/><path d="M4 18v3"/><path d="M20 18v3"/>
    </svg>
  )
}

function IconWindow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/>
    </svg>
  )
}

function IconMenu() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  )
}

function IconBox() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  )
}
