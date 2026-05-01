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

type PrintMode = 'branded' | 'simple' | null

export default function WhatsAppQRTab({ business, onNavigateToNegocio }: Props) {
  const qrRef = useRef<HTMLDivElement>(null)
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [downloading, setDownloading] = useState(false)
  // Print inline (sem window.open) — evita usuario ficar preso fora do
  // PWA standalone depois de cancelar a tela de impressao do iOS.
  const [printMode, setPrintMode] = useState<PrintMode>(null)

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

  // Quando muda printMode pra um valor != null, o cartaz é montado no
  // DOM e disparamos window.print() apos o paint. afterprint (ou
  // fallback timeout) reseta o estado pra esconder o cartaz da tela.
  useEffect(() => {
    if (!printMode) return

    let resetTimer: ReturnType<typeof setTimeout> | null = null
    const reset = () => {
      if (resetTimer) clearTimeout(resetTimer)
      setPrintMode(null)
    }

    // Aguarda 1 frame pro DOM atualizar antes de chamar print
    const printTimer = setTimeout(() => {
      window.addEventListener('afterprint', reset, { once: true })
      window.print()
      // Fallback: alguns navegadores nao disparam afterprint quando
      // user cancela. Reset apos 60s pra garantir que nao trava.
      resetTimer = setTimeout(reset, 60000)
    }, 60)

    return () => {
      clearTimeout(printTimer)
      if (resetTimer) clearTimeout(resetTimer)
      window.removeEventListener('afterprint', reset)
    }
  }, [printMode])

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
        } catch {
          // user cancelou — fallback pro download
        }
      }

      // Fallback download
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
      {/* Print stylesheet — quando printMode tiver valor, esconde tudo
          exceto o cartaz e mostra ele em A5. Sem isso o usuario ficaria
          preso numa janela nova. */}
      <style jsx global>{`
        @media print {
          @page {
            size: A5;
            margin: 0;
          }
          body * {
            visibility: hidden !important;
          }
          .qr-print-area,
          .qr-print-area * {
            visibility: visible !important;
          }
          .qr-print-area {
            position: absolute !important;
            left: 0;
            top: 0;
            width: 148mm;
            height: 210mm;
          }
        }
      `}</style>

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

        {/* Imprimir — 2 templates: branded (destaque) e simples */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setPrintMode('branded')}
            className="relative flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
            style={{ background: 'var(--admin-accent)', color: '#fff' }}
          >
            <span
              className="absolute -top-2 right-3 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider"
              style={{ background: '#FACC15', color: '#0F172A' }}
            >
              ★ Recomendado
            </span>
            <IconPrint />
            Imprimir cartaz
          </button>

          <button
            onClick={() => setPrintMode('simple')}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
            style={{
              background: 'var(--admin-accent-bg)',
              color: 'var(--admin-text-2)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <IconPrint />
            Imprimir simples
          </button>
        </div>
        <p className="text-[11px] text-center -mt-1" style={{ color: 'var(--admin-text-faded)' }}>
          Cartaz tem moldura, pitch pro cliente e selo AgendaPRO. Simples é só nome + QR.
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

      {/* CARTAZ DE IMPRESSAO — montado inline quando printMode setado.
          Esconde da tela com display:none e usa @media print pra
          aparecer apenas no print preview. Assim o usuario continua
          no PWA depois de cancelar/imprimir. */}
      {printMode === 'branded' && (
        <div className="qr-print-area" style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none' }}>
          <PrintCartazBranded
            business={business}
            bookingLink={bookingLink}
            linkPretty={linkPretty}
            qrColor={qrColor}
            category={category}
          />
        </div>
      )}
      {printMode === 'simple' && (
        <div className="qr-print-area" style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none' }}>
          <PrintCartazSimple
            business={business}
            bookingLink={bookingLink}
            linkPretty={linkPretty}
            qrColor={qrColor}
          />
        </div>
      )}
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
// CARTAZES PARA IMPRESSAO
// =============================================================================

type PrintProps = {
  business: Business
  bookingLink: string
  linkPretty: string
  qrColor: string
  category?: string
}

function PrintCartazBranded({ business, bookingLink, linkPretty, qrColor, category }: PrintProps) {
  return (
    <div
      style={{
        width: '148mm',
        height: '210mm',
        padding: '8mm',
        background: `linear-gradient(135deg, ${qrColor} 0%, ${qrColor}CC 100%)`,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0F172A',
        boxSizing: 'border-box',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#ffffff',
          borderRadius: 12,
          padding: '14mm 12mm',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          border: '1px solid rgba(0,0,0,0.04)',
          boxSizing: 'border-box',
        }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.15, margin: '0 0 4px', letterSpacing: '-0.01em' }}>
          {business.name}
        </h1>
        {category && (
          <p
            style={{
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: qrColor,
              fontWeight: 700,
              margin: '0 0 18px',
            }}
          >
            {category}
          </p>
        )}

        <div
          style={{
            position: 'relative',
            display: 'inline-block',
            padding: 12,
            border: `3px solid ${qrColor}`,
            borderRadius: 18,
            background: '#fff',
            marginBottom: 16,
          }}
        >
          <QRCode
            value={bookingLink}
            size={220}
            bgColor="#ffffff"
            fgColor={qrColor}
            level="H"
          />
          {business.logo_url && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 48,
                height: 48,
                background: '#fff',
                borderRadius: 10,
                padding: 3,
                boxShadow: '0 0 0 5px #fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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

        <p style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.35, color: '#0F172A', margin: '6px 0 4px', maxWidth: 260 }}>
          Agende online quando quiser.
        </p>
        <p style={{ fontSize: 13, color: '#475569', margin: '0 0 14px' }}>
          Sem precisar ligar. Sem horário comercial.
        </p>

        <div
          style={{
            fontSize: 11,
            color: '#64748B',
            wordBreak: 'break-all',
            margin: '0 0 auto',
            padding: '6px 12px',
            background: '#F1F5F9',
            borderRadius: 999,
          }}
        >
          {linkPretty}
        </div>

        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <div style={{ width: 60, height: 2, background: qrColor, borderRadius: 2, margin: '14px auto 10px', opacity: 0.4 }} />
          <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#94A3B8', margin: '0 0 2px', fontWeight: 600 }}>
            Powered by
          </p>
          <p style={{ fontSize: 14, fontWeight: 800, color: qrColor, letterSpacing: '-0.01em', margin: 0 }}>
            AgendaPRO
          </p>
          <p style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
            Sistema de agendamento automático
          </p>
        </div>
      </div>
    </div>
  )
}

function PrintCartazSimple({ business, bookingLink, linkPretty, qrColor }: PrintProps) {
  return (
    <div
      style={{
        width: '148mm',
        height: '210mm',
        padding: '20mm',
        background: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0F172A',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 6px' }}>{business.name}</h1>
      <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 26px' }}>Agende online em segundos</p>

      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          padding: 16,
          border: '2px solid #E5E7EB',
          borderRadius: 16,
          background: '#fff',
          marginBottom: 20,
        }}
      >
        <QRCode
          value={bookingLink}
          size={300}
          bgColor="#ffffff"
          fgColor={qrColor}
          level="H"
        />
        {business.logo_url && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 64,
              height: 64,
              background: '#fff',
              borderRadius: 12,
              padding: 4,
              boxShadow: '0 0 0 6px #fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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

      <p style={{ fontSize: 13, color: '#374151', wordBreak: 'break-all', margin: '0 0 18px' }}>
        {linkPretty}
      </p>
      <p style={{ fontSize: 18, fontWeight: 700, color: qrColor, margin: 0 }}>
        Aponte a câmera, escaneie e agende
      </p>
    </div>
  )
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
