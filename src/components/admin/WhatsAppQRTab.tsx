'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import type { Business } from '@/lib/types'

type Props = {
  business: Business
  onNavigateToNegocio: () => void
}

export default function WhatsAppQRTab({ business, onNavigateToNegocio }: Props) {
  const qrRef = useRef<HTMLDivElement>(null)
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [downloading, setDownloading] = useState(false)
  // Iframe pra impressao isolada — evita window.open (que tirava o
  // user do PWA) e tambem evita print stylesheet @media print do app
  // (que o iOS Safari ignorava, imprimindo a pagina inteira em dark).
  // O iframe tem documento proprio com o HTML do cartaz so, isolado.
  const printIframeRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const slug = business.slug || ''
  const bookingLink = origin && slug ? `${origin}/${slug}` : ''
  const linkPretty = bookingLink.replace(/^https?:\/\//, '')

  // Cor do QR = brand_primary (cliente coeso visualmente). Level H
  // (high error correction, ~30% reconstruivel) pra continuar lendo
  // mesmo com a logo no centro cobrindo parte do QR.
  const qrColor = business.brand_primary || '#0F172A'
  const hasLogo = !!business.logo_url

  /**
   * Imprime o QR via iframe isolado (HTML simples — só QR + nome + link).
   * Iframe com srcdoc proprio resolve quirks iOS Safari (que ignora
   * @media print do app principal e imprimia a pagina inteira em dark).
   */
  function printQR() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const html = buildSimpleHTML({ business, linkPretty, qrColor, svgData })

    // Limpa iframe anterior se ainda existir
    if (printIframeRef.current) {
      printIframeRef.current.remove()
      printIframeRef.current = null
    }

    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.opacity = '0'
    iframe.style.pointerEvents = 'none'
    document.body.appendChild(iframe)
    printIframeRef.current = iframe

    iframe.onload = () => {
      // Race-condition guard: se user clicou outro botao de imprimir
      // antes deste iframe carregar, ignora — o novo iframe ja assumiu
      // o ref e este aqui ja foi removido do DOM.
      if (printIframeRef.current !== iframe) return
      const win = iframe.contentWindow
      if (!win) return
      // Pequeno delay pra garantir paint da img da logo no iframe
      setTimeout(() => {
        if (printIframeRef.current !== iframe) return
        win.focus()
        win.print()
      }, 200)
    }

    iframe.srcdoc = html

    // Cleanup: remove iframe quando print fecha (afterprint dispara
    // tanto em imprimir quanto cancelar). Fallback de 60s caso evento
    // nao dispare (alguns browsers iOS).
    const cleanup = () => {
      if (printIframeRef.current === iframe) {
        iframe.remove()
        printIframeRef.current = null
      }
    }
    setTimeout(() => {
      try {
        iframe.contentWindow?.addEventListener('afterprint', cleanup, { once: true })
      } catch {
        /* cross-origin paranoia */
      }
    }, 300)
    setTimeout(cleanup, 60000)
  }

  useEffect(() => {
    return () => {
      if (printIframeRef.current) {
        printIframeRef.current.remove()
        printIframeRef.current = null
      }
    }
  }, [])

  /**
   * Gera PNG e tenta compartilhar via Web Share API (iOS/Android).
   * Fallback pra download tradicional se share nao suportar arquivos.
   * Resolve a tela "data:" do iOS que parecia "arquivo desconhecido".
   */
  async function handleDownloadPNG() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    setDownloading(true)
    try {
      const blob = await renderQRtoBlob(svg, business.logo_url, hasLogo)
      if (!blob) return
      const file = new File([blob], `qrcode-${slug || 'agendamento'}.png`, { type: 'image/png' })

      // Web Share API com files (iOS 15+, Chrome Android) — abre share
      // sheet direto: Photos, Insta, WhatsApp etc, sem passar pela tela
      // "data:" do iOS.
      if (
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: `QR Code ${business.name}`,
            text: `Agende em ${business.name}: ${bookingLink}`,
          })
          return
        } catch (err) {
          // AbortError = user cancelou. Outros = erro real.
          if (err instanceof Error && err.name === 'AbortError') return
          // Erro real cai no fallback abaixo
        }
      }

      // Fallback download — so quando share API NAO disponivel ou erro
      // tecnico (nao cancelamento)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = file.name
      link.href = url
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } finally {
      setDownloading(false)
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(bookingLink)
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
          title: `Agendar em ${business.name}`,
          text: `Agende seu horário em ${business.name}:`,
          url: bookingLink,
        })
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      } catch {
        /* cancelado pelo usuario */
      }
    } else {
      handleCopyLink()
    }
  }

  function handleTest() {
    window.open(bookingLink, '_blank', 'noopener,noreferrer')
  }

  // Sem slug não tem o que mostrar (defensivo — slug é obrigatório no cadastro)
  if (!slug) {
    return (
      <div
        className="admin-card p-6 sm:p-8 text-center"
        style={{ background: 'var(--admin-surface)' }}
      >
        <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--admin-text)' }}>
          Configure o slug do seu negócio
        </h3>
        <p className="text-sm mb-5" style={{ color: 'var(--admin-text-faded)' }}>
          Sem o slug não dá pra gerar o link de agendamento.
        </p>
        <button
          type="button"
          onClick={onNavigateToNegocio}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          Ir pra Negócio
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
          style={{ background: `${qrColor}1A`, color: qrColor }}
        >
          <IconQR size={20} />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold leading-tight" style={{ color: 'var(--admin-text)' }}>
            QR Code de agendamento
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
            Cliente escaneia, escolhe horário sozinho. 24h por dia.
          </p>
        </div>
      </div>

      {/* Card QR com logo no centro */}
      <div className="admin-card p-5 sm:p-6">
        <div
          ref={qrRef}
          className="relative flex justify-center p-5 sm:p-6 rounded-2xl mx-auto"
          style={{ background: '#ffffff', border: '2px solid var(--admin-border)', maxWidth: 360 }}
        >
          {bookingLink && (
            <QRCode
              value={bookingLink}
              size={240}
              bgColor="#ffffff"
              fgColor={qrColor}
              level="H"
            />
          )}
          {hasLogo && business.logo_url && (
            <div
              className="absolute top-1/2 left-1/2 flex items-center justify-center"
              style={{
                transform: 'translate(-50%, -50%)',
                width: 56,
                height: 56,
                background: '#ffffff',
                borderRadius: 12,
                padding: 4,
                boxShadow: '0 0 0 4px #ffffff',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={business.logo_url}
                alt={business.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
          )}
        </div>

        {/* Link visivel pra copiar/colar em bio do Instagram, etc */}
        <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}>
          <span className="text-xs font-mono truncate flex-1" style={{ color: 'var(--admin-text-2)' }}>
            {linkPretty}
          </span>
          <button
            onClick={handleCopyLink}
            className="text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors"
            style={{ background: copied ? '#10B981' : 'var(--admin-accent)', color: '#fff' }}
          >
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Ação primária — Compartilhar */}
      <button
        onClick={handleShare}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
        style={{ background: qrColor, color: '#fff' }}
      >
        <IconShare />
        {shared ? 'Compartilhado!' : hasShare ? 'Compartilhar link' : 'Compartilhar (copia link)'}
      </button>

      {/* Ações secundárias — 3 botões em grid */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleDownloadPNG}
          disabled={downloading}
          className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-colors disabled:opacity-60"
          style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
        >
          <IconDownload />
          {downloading ? 'Preparando...' : 'Baixar PNG'}
        </button>
        <button
          onClick={printQR}
          className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-colors"
          style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
        >
          <IconPrint />
          Imprimir
        </button>
        <button
          onClick={handleTest}
          className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-colors"
          style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
        >
          <IconExternal />
          Testar
        </button>
      </div>
    </div>
  )
}

/**
 * Renderiza o SVG do QR + logo no centro num PNG via canvas e devolve
 * o blob. Reusado pelo handleDownloadPNG que decide entre share e
 * download tradicional.
 */
function renderQRtoBlob(svg: SVGSVGElement, logoUrl: string | null | undefined, hasLogo: boolean): Promise<Blob | null> {
  return new Promise((resolve) => {
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const img = new Image()
    img.onload = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(null)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 1024, 1024)
      ctx.drawImage(img, 0, 0, 1024, 1024)

      const finalize = () => {
        canvas.toBlob((blob) => resolve(blob), 'image/png')
      }

      if (hasLogo && logoUrl) {
        const logoImg = new Image()
        logoImg.crossOrigin = 'anonymous'
        logoImg.onload = () => {
          const logoSize = 220
          const cx = (1024 - logoSize) / 2
          const cy = (1024 - logoSize) / 2
          ctx.fillStyle = '#ffffff'
          roundRect(ctx, cx - 12, cy - 12, logoSize + 24, logoSize + 24, 24)
          ctx.fill()
          ctx.drawImage(logoImg, cx, cy, logoSize, logoSize)
          finalize()
        }
        logoImg.onerror = () => finalize()
        logoImg.src = logoUrl
      } else {
        finalize()
      }
    }
    img.onerror = () => resolve(null)
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// =============================================================================
// HTML do print — A5 simples com QR personalizado + nome + link
// Documento isolado injetado no iframe srcdoc.
// =============================================================================

type BuildHTMLArgs = {
  business: Business
  linkPretty: string
  qrColor: string
  svgData: string
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildSimpleHTML({ business, linkPretty, qrColor, svgData }: BuildHTMLArgs) {
  const logoTag = business.logo_url
    ? `<img class="logo" src="${escapeHtml(business.logo_url)}" alt="${escapeHtml(business.name)}" crossorigin="anonymous" />`
    : ''
  return `<!doctype html>
<html>
  <head>
    <title>QR Code - ${escapeHtml(business.name)}</title>
    <meta charset="utf-8" />
    <style>
      @page { size: A5; margin: 0; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #0F172A;
        background: #fff;
      }
      .page {
        width: 148mm;
        min-height: 210mm;
        padding: 20mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        background: #fff;
      }
      h1 { font-size: 28px; font-weight: 800; margin: 0 0 6px; }
      h2 { font-size: 14px; color: #64748B; font-weight: 500; margin: 0 0 26px; }
      .qr {
        position: relative;
        display: inline-block;
        padding: 16px;
        border: 2px solid ${qrColor};
        border-radius: 16px;
        background: #fff;
        margin-bottom: 20px;
      }
      .qr svg { width: 300px; height: 300px; display: block; }
      .logo {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 64px; height: 64px;
        object-fit: contain;
        background: #fff;
        border-radius: 12px;
        padding: 4px;
        box-shadow: 0 0 0 6px #fff;
      }
      .link { font-size: 13px; color: #374151; word-break: break-all; margin: 0 0 18px; }
      .cta { font-size: 18px; font-weight: 700; color: ${qrColor}; margin: 0; }
    </style>
  </head>
  <body>
    <div class="page">
      <h1>${escapeHtml(business.name)}</h1>
      <h2>Agende online em segundos</h2>
      <div class="qr">${svgData}${logoTag}</div>
      <p class="link">${escapeHtml(linkPretty)}</p>
      <p class="cta">Aponte a câmera, escaneie e agende</p>
    </div>
  </body>
</html>`
}

/* ---------- Ícones ---------- */

function IconQR({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <line x1="14" y1="14" x2="14" y2="17" />
      <line x1="14" y1="20" x2="14" y2="21" />
      <line x1="17" y1="14" x2="17" y2="14" />
      <line x1="20" y1="14" x2="21" y2="14" />
      <line x1="17" y1="17" x2="21" y2="17" />
      <line x1="17" y1="20" x2="17" y2="21" />
      <line x1="20" y1="20" x2="21" y2="20" />
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

function IconDownload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
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

function IconExternal() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  )
}
