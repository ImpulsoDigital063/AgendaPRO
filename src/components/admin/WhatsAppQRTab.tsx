'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
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
  const category = business.description ?? ''

  /**
   * Imprime o cartaz (branded ou simples) via iframe isolado.
   * O HTML do cartaz é injetado no srcdoc do iframe — documento
   * proprio, isolado do dark mode do app. Quando user cancela ou
   * imprime, o iframe é removido e o user continua no PWA.
   */
  function printCartaz(mode: 'parede' | 'balcao' | 'acrilico' | 'simple') {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const args = { business, linkPretty, qrColor, svgData, category }
    let html: string
    switch (mode) {
      case 'parede':   html = buildBrandedHTML(args); break
      case 'balcao':   html = buildBalcao4em1HTML(args); break
      case 'acrilico': html = buildDisplayAcrilicoHTML(args); break
      case 'simple':   html = buildSimpleHTML(args); break
      default: return // defensivo (TS exhaustive ja cobre)
    }

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
          // AbortError = user cancelou. Outros = erro real (ex: permissao
          // negada, file size). Em ambos, evitamos baixar PNG sem ser
          // pedido — user que quer download usa o fallback abaixo so se
          // share NAO disponivel.
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
    <>
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

        {/* 3 templates de impressão pra casos de uso reais */}
        <div className="admin-card p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-mute)' }}>
            Imprimir
          </p>

          <button
            onClick={() => printCartaz('balcao')}
            className="relative w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.98]"
            style={{ background: 'var(--admin-accent)', color: '#fff' }}
          >
            <span
              className="absolute -top-2 right-3 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider"
              style={{ background: '#FACC15', color: '#0F172A' }}
            >
              ★ Recomendado
            </span>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.18)' }}>
              <IconCards />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">Cartões balcão (4 por folha)</p>
              <p className="text-[11px] opacity-85 leading-tight mt-0.5">
                4 cartões A6 numa folha A4. Imprime em casa, corta e distribui no caixa, balcão, espelho.
              </p>
            </div>
          </button>

          <button
            onClick={() => printCartaz('parede')}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors"
            style={{
              background: 'var(--admin-accent-bg)',
              color: 'var(--admin-text)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${qrColor}1F`, color: qrColor }}>
              <IconPoster />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">Cartaz parede (A5)</p>
              <p className="text-[11px] leading-tight mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                Cartaz médio pra colar na vitrine, espelho, parede principal. Caseira ou gráfica.
              </p>
            </div>
          </button>

          <button
            onClick={() => printCartaz('acrilico')}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors"
            style={{
              background: 'var(--admin-accent-bg)',
              color: 'var(--admin-text)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${qrColor}1F`, color: qrColor }}>
              <IconAcrylic />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">Display acrílico — gráfica (A6)</p>
              <p className="text-[11px] leading-tight mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                Com bleed 3mm. Salva PDF e manda pra gráfica fazer o display de vidro/acrílico de balcão.
              </p>
            </div>
          </button>

          <button
            onClick={() => printCartaz('simple')}
            className="w-full text-[11px] font-semibold py-2 rounded-lg transition-colors"
            style={{
              color: 'var(--admin-text-mute)',
              border: '1px dashed var(--admin-border)',
            }}
          >
            Imprimir simples (sem moldura/branding)
          </button>
        </div>
        <p className="text-[11px] text-center -mt-1" style={{ color: 'var(--admin-text-faded)' }}>
          Pra mandar pra gráfica: clique → toque em "Salvar como PDF" no print preview e envia o arquivo.
        </p>

        {/* Ações secundárias */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDownloadPNG}
            disabled={downloading}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-60"
            style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
          >
            <IconDownload />
            {downloading ? 'Preparando...' : 'Baixar / compartilhar PNG'}
          </button>
          <button
            onClick={handleTest}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-colors"
            style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
          >
            <IconExternal />
            Abrir página
          </button>
        </div>

        {/* Stepper visual */}
        <div className="admin-card p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--admin-text-mute)' }}>
            Como funciona
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Step n={1} label="Imprima ou compartilhe" color={qrColor} />
            <Step n={2} label="Cole no salão" color={qrColor} />
            <Step n={3} label="Cliente aponta a câmera" color={qrColor} />
            <Step n={4} label="Agenda sozinho — 24h" color={qrColor} />
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
                <span style={{ color: qrColor }}>{s.icon}</span>
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* Dica extra: usar o link na bio */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: `${qrColor}0D`,
            border: `1px solid ${qrColor}33`,
          }}
        >
          <p className="text-xs font-semibold mb-1" style={{ color: qrColor }}>
            Dica extra
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
            Cola o link na bio do Instagram, no status do WhatsApp ou no perfil do Google. Quem clica
            já cai direto na sua página de agendamento — sem precisar te chamar antes.
          </p>
        </div>
      </div>

    </>
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
// CARTAZES PARA IMPRESSAO — HTML strings injetadas no iframe srcdoc.
// Usar string em vez de React component pra ter controle total sobre
// o documento isolado (sem hidratacao, sem styled-jsx).
// =============================================================================

type BuildHTMLArgs = {
  business: Business
  linkPretty: string
  qrColor: string
  svgData: string
  category?: string
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildBrandedHTML({ business, linkPretty, qrColor, svgData, category }: BuildHTMLArgs) {
  const logoTag = business.logo_url
    ? `<img class="logo" src="${escapeHtml(business.logo_url)}" alt="${escapeHtml(business.name)}" crossorigin="anonymous" />`
    : ''
  return `<!doctype html>
<html>
  <head>
    <title>Cartaz QR - ${escapeHtml(business.name)}</title>
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
      .frame {
        width: 148mm;
        min-height: 210mm;
        padding: 8mm;
        background: linear-gradient(135deg, ${qrColor} 0%, ${qrColor}CC 100%);
        display: flex;
        align-items: stretch;
      }
      .inner {
        flex: 1;
        background: #ffffff;
        border-radius: 12px;
        padding: 14mm 12mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        border: 1px solid rgba(0,0,0,0.04);
      }
      .name {
        font-size: 26px;
        font-weight: 800;
        line-height: 1.15;
        margin: 0 0 4px;
        color: #0F172A;
        letter-spacing: -0.01em;
      }
      .category {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: ${qrColor};
        font-weight: 700;
        margin: 0 0 18px;
      }
      .qr {
        position: relative;
        display: inline-block;
        padding: 12px;
        border: 3px solid ${qrColor};
        border-radius: 18px;
        background: #fff;
        margin-bottom: 16px;
      }
      .qr svg { width: 220px; height: 220px; display: block; }
      .logo {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 48px; height: 48px;
        object-fit: contain;
        background: #fff;
        border-radius: 10px;
        padding: 3px;
        box-shadow: 0 0 0 5px #fff;
      }
      .pitch {
        font-size: 17px;
        font-weight: 700;
        line-height: 1.35;
        color: #0F172A;
        margin: 6px 0 4px;
        max-width: 260px;
      }
      .pitch-sub {
        font-size: 13px;
        color: #475569;
        margin: 0 0 14px;
      }
      .link {
        font-size: 11px;
        color: #64748B;
        word-break: break-all;
        margin: 0 0 auto;
        padding: 6px 12px;
        background: #F1F5F9;
        border-radius: 999px;
      }
      .divider {
        width: 60px;
        height: 2px;
        background: ${qrColor};
        border-radius: 2px;
        margin: 14px auto 10px;
        opacity: 0.4;
      }
      .footer { text-align: center; padding-top: 4px; }
      .powered {
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: #94A3B8;
        margin: 0 0 2px;
        font-weight: 600;
      }
      .brand {
        font-size: 14px;
        font-weight: 800;
        color: ${qrColor};
        letter-spacing: -0.01em;
        margin: 0;
      }
      .brand-tag {
        font-size: 10px;
        color: #64748B;
        margin-top: 2px;
      }
    </style>
  </head>
  <body>
    <div class="frame">
      <div class="inner">
        <h1 class="name">${escapeHtml(business.name)}</h1>
        ${category ? `<p class="category">${escapeHtml(category)}</p>` : ''}
        <div class="qr">${svgData}${logoTag}</div>
        <p class="pitch">Agende online quando quiser.</p>
        <p class="pitch-sub">Sem precisar ligar. Sem horário comercial.</p>
        <div class="link">${escapeHtml(linkPretty)}</div>
        <div class="footer">
          <div class="divider"></div>
          <p class="powered">Powered by</p>
          <p class="brand">AgendaPRO</p>
          <p class="brand-tag">Sistema de agendamento automático</p>
        </div>
      </div>
    </div>
  </body>
</html>`
}

/**
 * 4 cartões A6 numa folha A4 — pra impressora caseira (qualquer
 * navegador imprime A4). User imprime, corta nas guias tracejadas
 * e tem 4 cartões pra distribuir: caixa, balcão, espelho, vitrine.
 */
function buildBalcao4em1HTML({ business, linkPretty, qrColor, svgData }: BuildHTMLArgs) {
  const logoTag = business.logo_url
    ? `<img class="logo" src="${escapeHtml(business.logo_url)}" alt="${escapeHtml(business.name)}" crossorigin="anonymous" />`
    : ''
  // Card miniatura repetido 4x — A6 = 105×148mm
  const card = `
    <div class="card">
      <div class="cut top"></div>
      <div class="cut bottom"></div>
      <div class="cut left"></div>
      <div class="cut right"></div>
      <div class="card-inner">
        <p class="mini-name">${escapeHtml(business.name)}</p>
        <div class="mini-qr">${svgData}${logoTag}</div>
        <p class="mini-pitch">Aponte a câmera e agende</p>
        <p class="mini-link">${escapeHtml(linkPretty)}</p>
        <div class="mini-footer">
          <span class="mini-powered">Powered by</span>
          <span class="mini-brand">AgendaPRO</span>
        </div>
      </div>
    </div>
  `
  return `<!doctype html>
<html>
  <head>
    <title>Cartões balcão - ${escapeHtml(business.name)}</title>
    <meta charset="utf-8" />
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #0F172A;
        background: #fff;
      }
      .sheet {
        width: 210mm;
        height: 297mm;
        display: grid;
        grid-template-columns: 105mm 105mm;
        grid-template-rows: 148.5mm 148.5mm;
      }
      .card {
        position: relative;
        width: 105mm;
        height: 148.5mm;
        padding: 4mm;
        border: 1px dashed #CBD5E1;
        background: linear-gradient(135deg, ${qrColor} 0%, ${qrColor}CC 100%);
      }
      .card-inner {
        width: 100%;
        height: 100%;
        background: #fff;
        border-radius: 6px;
        padding: 8mm 6mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      .cut { position: absolute; background: #94A3B8; }
      .cut.top, .cut.bottom { left: 0; right: 0; height: 0; border-top: 1px dashed #94A3B8; background: none; }
      .cut.top { top: -0.5mm; } .cut.bottom { bottom: -0.5mm; }
      .cut.left, .cut.right { top: 0; bottom: 0; width: 0; border-left: 1px dashed #94A3B8; background: none; }
      .cut.left { left: -0.5mm; } .cut.right { right: -0.5mm; }
      .mini-name {
        font-size: 14px;
        font-weight: 800;
        line-height: 1.15;
        margin: 0 0 6px;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .mini-qr {
        position: relative;
        display: inline-block;
        padding: 6px;
        border: 2px solid ${qrColor};
        border-radius: 10px;
        background: #fff;
        margin-bottom: 8px;
      }
      .mini-qr svg { width: 130px; height: 130px; display: block; }
      .logo {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 28px; height: 28px;
        object-fit: contain;
        background: #fff;
        border-radius: 6px;
        padding: 2px;
        box-shadow: 0 0 0 3px #fff;
      }
      .mini-pitch {
        font-size: 11px;
        font-weight: 700;
        color: ${qrColor};
        margin: 0 0 4px;
      }
      .mini-link {
        font-size: 7px;
        color: #64748B;
        word-break: break-all;
        margin: 0 0 auto;
      }
      .mini-footer {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1px;
        margin-top: 6px;
        padding-top: 4px;
        border-top: 1px solid #E2E8F0;
        width: 100%;
      }
      .mini-powered {
        font-size: 6px;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: #94A3B8;
        font-weight: 600;
      }
      .mini-brand {
        font-size: 9px;
        font-weight: 800;
        color: ${qrColor};
      }
    </style>
  </head>
  <body>
    <div class="sheet">${card}${card}${card}${card}</div>
  </body>
</html>`
}

/**
 * Display acrílico — cartaz A6 (105×148mm) com 3mm de bleed,
 * centralizado em folha A4 com crop marks pra gráfica cortar.
 *
 * Por que A4 e não @page custom 111×154mm? iOS Safari não abre
 * print preview com size customizado não-padrão (testado e
 * confirmado). A4 é universal — qualquer print preview abre. A
 * gráfica recebe PDF A4 padrão e usa as crop marks pra cortar
 * o cartaz no tamanho final A6 com bleed embutido.
 */
function buildDisplayAcrilicoHTML({ business, linkPretty, qrColor, svgData }: BuildHTMLArgs) {
  const logoTag = business.logo_url
    ? `<img class="logo" src="${escapeHtml(business.logo_url)}" alt="${escapeHtml(business.name)}" crossorigin="anonymous" />`
    : ''
  return `<!doctype html>
<html>
  <head>
    <title>Display acrílico - ${escapeHtml(business.name)}</title>
    <meta charset="utf-8" />
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #0F172A;
        background: #fff;
      }
      .sheet {
        width: 210mm;
        height: 297mm;
        position: relative;
        background: #fff;
      }
      /* Container do cartaz centralizado (111×154mm = A6 + 3mm bleed) */
      .bleed {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 111mm;
        height: 154mm;
        padding: 3mm;
        background: linear-gradient(135deg, ${qrColor} 0%, ${qrColor}CC 100%);
      }
      .trim {
        width: 105mm;
        height: 148mm;
        background: linear-gradient(135deg, ${qrColor} 0%, ${qrColor}CC 100%);
        padding: 5mm;
        position: relative;
      }
      .inner {
        width: 100%;
        height: 100%;
        background: #fff;
        border-radius: 8px;
        padding: 6mm 5mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      .name {
        font-size: 16px;
        font-weight: 800;
        line-height: 1.1;
        margin: 0 0 8px;
        max-width: 100%;
      }
      .qr {
        position: relative;
        display: inline-block;
        padding: 8px;
        border: 2px solid ${qrColor};
        border-radius: 12px;
        background: #fff;
        margin-bottom: 10px;
      }
      .qr svg { width: 160px; height: 160px; display: block; }
      .logo {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 36px; height: 36px;
        object-fit: contain;
        background: #fff;
        border-radius: 8px;
        padding: 3px;
        box-shadow: 0 0 0 4px #fff;
      }
      .pitch {
        font-size: 13px;
        font-weight: 700;
        color: #0F172A;
        margin: 0 0 4px;
      }
      .pitch-sub {
        font-size: 10px;
        color: #475569;
        margin: 0 0 8px;
      }
      .link {
        font-size: 8px;
        color: #64748B;
        word-break: break-all;
        margin: 0 0 auto;
      }
      .divider {
        width: 30px;
        height: 1.5px;
        background: ${qrColor};
        border-radius: 2px;
        margin: 8px auto 4px;
        opacity: 0.4;
      }
      .powered {
        font-size: 7px;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: #94A3B8;
        margin: 0;
        font-weight: 600;
      }
      .brand {
        font-size: 11px;
        font-weight: 800;
        color: ${qrColor};
        margin: 0;
      }
      /* Crop marks (4 cantos) — guia pra gráfica cortar no trim line
         (105×148mm), ignorando os 3mm de bleed externo. Linhas finas
         pretas saindo pros lados e pra cima/baixo do trim. */
      .crop { position: absolute; background: #000; }
      .crop.h { width: 5mm; height: 0.3mm; }
      .crop.v { width: 0.3mm; height: 5mm; }
      /* Posicionadas relativas a .bleed: trim começa em 3mm dentro */
      .crop.tl-h { top: 3mm; left: -5mm; }
      .crop.tl-v { top: -5mm; left: 3mm; }
      .crop.tr-h { top: 3mm; right: -5mm; }
      .crop.tr-v { top: -5mm; right: 3mm; }
      .crop.bl-h { bottom: 3mm; left: -5mm; }
      .crop.bl-v { bottom: -5mm; left: 3mm; }
      .crop.br-h { bottom: 3mm; right: -5mm; }
      .crop.br-v { bottom: -5mm; right: 3mm; }
      /* Info técnica no rodapé da A4 (orientação pra gráfica) */
      .technical {
        position: absolute;
        bottom: 10mm;
        left: 0;
        right: 0;
        text-align: center;
        font-size: 8px;
        color: #64748B;
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="bleed">
        <span class="crop h tl-h"></span>
        <span class="crop v tl-v"></span>
        <span class="crop h tr-h"></span>
        <span class="crop v tr-v"></span>
        <span class="crop h bl-h"></span>
        <span class="crop v bl-v"></span>
        <span class="crop h br-h"></span>
        <span class="crop v br-v"></span>
        <div class="trim">
          <div class="inner">
            <p class="name">${escapeHtml(business.name)}</p>
            <div class="qr">${svgData}${logoTag}</div>
            <p class="pitch">Agende online quando quiser.</p>
            <p class="pitch-sub">Sem precisar ligar.</p>
            <div class="link">${escapeHtml(linkPretty)}</div>
            <div class="divider"></div>
            <p class="powered">Powered by</p>
            <p class="brand">AgendaPRO</p>
          </div>
        </div>
      </div>
      <div class="technical">
        Tamanho final: A6 (105×148mm) · Bleed: 3mm · Cortar nas marcas pretas
      </div>
    </div>
  </body>
</html>`
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
        border: 2px solid #E5E7EB;
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

function Step({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-2">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
        style={{ background: `${color}1F`, color }}
      >
        {n}
      </div>
      <p className="text-[11px] leading-tight" style={{ color: 'var(--admin-text-2)' }}>
        {label}
      </p>
    </div>
  )
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

function IconCards() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
    </svg>
  )
}

function IconPoster() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <rect x="9" y="11" width="6" height="6" />
    </svg>
  )
}

function IconAcrylic() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7l8-4 8 4-8 4-8-4z" />
      <path d="M4 7v10l8 4 8-4V7" />
      <line x1="12" y1="11" x2="12" y2="21" opacity="0.4" />
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
