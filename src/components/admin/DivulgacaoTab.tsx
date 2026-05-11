'use client'

/**
 * Pack de Divulgação — gerador de criativos prontos pro cliente postar
 * no Insta (story + feed). Cada template puxa logo + paleta + slug do
 * próprio business e gera PNG via Canvas API.
 *
 * Estratégia branding: rodapé discreto "Agendamento por agendapro.net.br"
 * em todos templates. Cada post do cliente vira distribuição passiva da
 * marca (loop viral estilo Calendly/Linktree).
 *
 * 3 templates MVP:
 *  1. "Estamos no digital"     (story 9:16) — anúncio de lançamento
 *  2. "Hoje tem horário"       (story 9:16) — urgência diária
 *  3. "Você ainda liga?"       (feed 1:1)   — educação recorrente
 *
 * Cada um adapta cor de fundo via business.brand_primary (white-label
 * soft do v4-branding). Logo do cliente puxada de business.logo_url.
 */

import { useEffect, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import type { Business } from '@/lib/types'

type TemplateFormat = 'story' | 'feed'

type TemplateDef = {
  id: 'digital' | 'horario-hoje' | 'ainda-liga'
  title: string
  desc: string
  format: TemplateFormat
  size: { w: number; h: number }
  /** Cor de preview do card (gradient ou sólido) */
  previewBg: (brand: string) => string
}

const TEMPLATES: TemplateDef[] = [
  {
    id: 'digital',
    title: 'Estamos no digital',
    desc: 'Anúncio do lançamento — posta uma vez quando começar a usar o app',
    format: 'story',
    size: { w: 1080, h: 1920 },
    previewBg: (b) => `linear-gradient(135deg, ${b} 0%, ${shade(b, -30)} 100%)`,
  },
  {
    id: 'horario-hoje',
    title: 'Hoje tem horário',
    desc: 'Manhã com agenda fraca? Posta isso pra criar urgência',
    format: 'story',
    size: { w: 1080, h: 1920 },
    previewBg: (b) => b,
  },
  {
    id: 'ainda-liga',
    title: 'Você ainda liga pra marcar?',
    desc: 'Post educativo — pode usar no feed toda semana',
    format: 'feed',
    size: { w: 1080, h: 1080 },
    previewBg: (b) => `linear-gradient(180deg, ${b} 0%, ${b} 60%, #ffffff 60%, #ffffff 100%)`,
  },
]

/** Clareia (+) ou escurece (-) cor hex. */
function shade(hex: string, percent: number): string {
  const h = hex.replace('#', '')
  const num = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  let r = (num >> 16) + Math.round(2.55 * percent)
  let g = ((num >> 8) & 0xff) + Math.round(2.55 * percent)
  let b = (num & 0xff) + Math.round(2.55 * percent)
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/** Carrega imagem (logo) com CORS habilitado pra drawImage funcionar. */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Converte string SVG em Image pra drawImage no canvas. */
function svgStringToImage(svgString: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

/** Desenha retângulo arredondado. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
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

/** Quebra texto em linhas que cabem em maxWidth. */
function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width <= maxWidth) {
      current = test
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

/** Selo padrão de branding · canto inferior · fonte fina + opacity baixa. */
function drawBrandSeal(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dark: boolean,
) {
  ctx.save()
  ctx.font = '500 22px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.fillStyle = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.42)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText('Agendamento por agendapro.net.br', w / 2, h - 36)
  ctx.restore()
}

// ─────────────────────────────────────────────────────────────────
// RENDERS POR TEMPLATE
// ─────────────────────────────────────────────────────────────────

type RenderArgs = {
  canvas: HTMLCanvasElement
  business: Business
  bookingUrl: string
  qrSvgString: string | null
}

async function renderDigital({ canvas, business, bookingUrl, qrSvgString }: RenderArgs) {
  const W = 1080
  const H = 1920
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const primary = business.brand_primary ?? '#3B82F6'

  // Background gradient diagonal
  const grad = ctx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, primary)
  grad.addColorStop(1, shade(primary, -35))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Top text
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = '500 36px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('A G O R A   N O   D I G I T A L', W / 2, 200)

  // Business name
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 78px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  const nameLines = wrapLines(ctx, business.name, W - 160)
  let nameY = 290
  for (const line of nameLines) {
    ctx.fillText(line, W / 2, nameY)
    nameY += 96
  }

  // White card (centro) com logo + QR
  const cardX = 90
  const cardY = nameY + 60
  const cardW = W - 180
  const cardH = 1100
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, cardX, cardY, cardW, cardH, 48)
  ctx.fill()
  ctx.shadowColor = 'rgba(0,0,0,0.15)'
  ctx.shadowBlur = 40
  ctx.shadowOffsetY = 20

  // Logo dentro do card (se tiver)
  let cursorY = cardY + 80
  if (business.logo_url) {
    const logo = await loadImage(business.logo_url)
    if (logo) {
      const logoMax = 200
      const ratio = Math.min(logoMax / logo.width, logoMax / logo.height)
      const lw = logo.width * ratio
      const lh = logo.height * ratio
      ctx.shadowColor = 'transparent'
      ctx.drawImage(logo, W / 2 - lw / 2, cursorY, lw, lh)
      cursorY += lh + 60
    }
  } else {
    cursorY += 40
  }

  // QR Code
  if (qrSvgString) {
    try {
      const qrImg = await svgStringToImage(qrSvgString)
      const qrSize = 560
      ctx.shadowColor = 'transparent'
      ctx.drawImage(qrImg, W / 2 - qrSize / 2, cursorY, qrSize, qrSize)
      cursorY += qrSize + 50
    } catch {
      cursorY += 50
    }
  }

  // URL textual
  ctx.fillStyle = primary
  ctx.font = 'bold 38px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.fillText(bookingUrl, W / 2, cursorY + 20)

  // CTA
  ctx.fillStyle = '#ffffff'
  ctx.font = '500 42px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.fillText('Aponte sua câmera no QR', W / 2, cardY + cardH + 100)
  ctx.font = '300 32px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.fillText('e marque seu horário em segundos', W / 2, cardY + cardH + 145)

  drawBrandSeal(ctx, W, H, true)
}

async function renderHorarioHoje({ canvas, business, bookingUrl }: RenderArgs) {
  const W = 1080
  const H = 1920
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const primary = business.brand_primary ?? '#3B82F6'

  // Background sólido com gradient sutil
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, shade(primary, 15))
  grad.addColorStop(1, shade(primary, -20))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Texture: linhas diagonais sutis
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = 2
  for (let i = -H; i < W + H; i += 60) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + H, H)
    ctx.stroke()
  }
  ctx.restore()

  // Top eyebrow
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = '500 32px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('S Ó   H O J E', W / 2, 280)

  // Headline grande
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 130px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.fillText('Hoje', W / 2, 480)
  ctx.font = 'bold 110px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.fillText('tem horário', W / 2, 620)

  // Ícone relógio (SVG path)
  ctx.save()
  ctx.translate(W / 2, 900)
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.arc(0, 0, 140, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, -80)
  ctx.moveTo(0, 0)
  ctx.lineTo(60, 0)
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.restore()

  // Negócio
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = '500 46px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.fillText(business.name, W / 2, 1280)

  // CTA card
  const ctaX = 100
  const ctaY = 1420
  const ctaW = W - 200
  const ctaH = 280
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 36)
  ctx.fill()

  ctx.fillStyle = '#0F172A'
  ctx.font = 'bold 56px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.fillText('Garanta o seu', W / 2, ctaY + 110)

  ctx.fillStyle = primary
  ctx.font = 'bold 38px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.fillText(bookingUrl, W / 2, ctaY + 200)

  drawBrandSeal(ctx, W, H, true)
}

async function renderAindaLiga({ canvas, business, bookingUrl }: RenderArgs) {
  const W = 1080
  const H = 1080
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const primary = business.brand_primary ?? '#3B82F6'

  // Top 60% color, bottom 40% white
  ctx.fillStyle = primary
  ctx.fillRect(0, 0, W, Math.floor(H * 0.6))
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, Math.floor(H * 0.6), W, Math.ceil(H * 0.4))

  // Top text
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.font = '500 26px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('A G E N D A M E N T O', W / 2, 100)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 68px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.fillText('Você ainda liga', W / 2, 220)
  ctx.fillText('pra marcar', W / 2, 305)
  ctx.fillText('horário?', W / 2, 390)

  // Telefone com X (ícone)
  ctx.save()
  ctx.translate(W / 2, 530)
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = 8
  ctx.lineCap = 'round'
  // Telefone simplificado
  roundRect(ctx, -40, -50, 80, 100, 12)
  ctx.stroke()
  // Linha do X
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 14
  ctx.beginPath()
  ctx.moveTo(-90, -90)
  ctx.lineTo(90, 90)
  ctx.moveTo(90, -90)
  ctx.lineTo(-90, 90)
  ctx.stroke()
  ctx.restore()

  // Bottom (branco)
  const bottomY = Math.floor(H * 0.6) + 90
  ctx.fillStyle = '#0F172A'
  ctx.font = 'bold 48px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.fillText(business.name, W / 2, bottomY)

  ctx.fillStyle = primary
  ctx.font = '500 38px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.fillText('agora no digital', W / 2, bottomY + 56)

  ctx.fillStyle = '#0F172A'
  ctx.font = 'bold 36px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.fillText(bookingUrl, W / 2, bottomY + 138)

  ctx.fillStyle = 'rgba(15,23,42,0.55)'
  ctx.font = '500 24px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.fillText('(link na bio do Insta)', W / 2, bottomY + 184)

  drawBrandSeal(ctx, W, H, false)
}

const RENDERERS: Record<TemplateDef['id'], (args: RenderArgs) => Promise<void>> = {
  'digital': renderDigital,
  'horario-hoje': renderHorarioHoje,
  'ainda-liga': renderAindaLiga,
}

// ─────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────

type Props = { business: Business }

export default function DivulgacaoTab({ business }: Props) {
  const qrContainerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const primary = business.brand_primary ?? '#3B82F6'

  const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.agendapro.net.br')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
  const bookingUrl = `${APP_URL}/${business.slug}`
  const bookingFull = `https://${bookingUrl}`

  // Auto-clear feedback após 3s
  useEffect(() => {
    if (!feedback) return
    const id = setTimeout(() => setFeedback(null), 3000)
    return () => clearTimeout(id)
  }, [feedback])

  async function handleDownload(templateId: TemplateDef['id']) {
    if (!canvasRef.current) return
    setDownloading(templateId)
    setFeedback(null)
    try {
      // Captura SVG do QR Code (escondido)
      const qrSvg = qrContainerRef.current?.querySelector('svg')
      const qrSvgString = qrSvg
        ? new XMLSerializer().serializeToString(qrSvg)
        : null

      await RENDERERS[templateId]({
        canvas: canvasRef.current,
        business,
        bookingUrl,
        qrSvgString,
      })

      const blob: Blob | null = await new Promise((resolve) =>
        canvasRef.current!.toBlob((b) => resolve(b), 'image/png', 0.95),
      )
      if (!blob) {
        setFeedback('Falha ao gerar imagem. Tenta de novo.')
        return
      }

      const safeName = business.slug || 'agendapro'
      const file = new File([blob], `${safeName}-${templateId}.png`, {
        type: 'image/png',
      })

      // Web Share API com files (iOS 15+/Android Chrome) — abre share sheet
      // direto: Photos, Insta, WhatsApp etc. Resolve a tela "data:" do iOS
      // que parecia "arquivo desconhecido".
      if (
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: `${business.name} — divulgação`,
            text: `Agende em ${business.name}: ${bookingFull}`,
          })
          setFeedback('Compartilhado!')
          return
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return
          // erro real cai pro fallback
        }
      }

      // Fallback download tradicional
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = file.name
      link.href = url
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setFeedback('PNG baixado!')
    } catch (err) {
      console.error('[Divulgacao] erro gerando PNG', err)
      setFeedback('Erro ao gerar. Tenta de novo.')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header explicativo */}
      <div
        className="admin-card-deep p-5"
        style={{ borderLeft: `3px solid ${primary}` }}
      >
        <h3
          className="text-base font-semibold mb-1"
          style={{ color: 'var(--admin-text)' }}
        >
          Pack de divulgação
        </h3>
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          Artes prontas com a sua marca · clica em Baixar e posta no Insta.
          Cada cliente que ver, vai poder agendar direto com você sem precisar ligar.
        </p>
      </div>

      {/* Grid de templates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map((t) => (
          <TemplatePreview
            key={t.id}
            template={t}
            business={business}
            primary={primary}
            downloading={downloading === t.id}
            onDownload={() => handleDownload(t.id)}
          />
        ))}
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-medium"
          style={{
            background: 'rgba(15,23,42,0.92)',
            color: '#ffffff',
            boxShadow: '0 12px 32px -8px rgba(0,0,0,0.4)',
          }}
        >
          {feedback}
        </div>
      )}

      {/* Dica de uso */}
      <div
        className="admin-card-deep p-4 text-xs leading-relaxed"
        style={{ color: 'var(--admin-text-mute)' }}
      >
        <strong style={{ color: 'var(--admin-text)' }}>Dica:</strong> a arte sai
        com a sua logo, sua cor e o link da sua página. Quanto mais a galera
        ver no story dos seus clientes, mais agendamento orgânico você ganha
        sem pagar anúncio.
      </div>

      {/* QR Code escondido — usado pra render no canvas */}
      <div
        ref={qrContainerRef}
        style={{
          position: 'absolute',
          left: -99999,
          top: 0,
          width: 400,
          height: 400,
        }}
        aria-hidden="true"
      >
        <QRCode
          value={bookingFull}
          size={400}
          bgColor="#FFFFFF"
          fgColor="#0F172A"
        />
      </div>

      {/* Canvas escondido — usado pra gerar PNG */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// CARD DE PREVIEW
// ─────────────────────────────────────────────────────────────────

type CardProps = {
  template: TemplateDef
  business: Business
  primary: string
  downloading: boolean
  onDownload: () => void
}

function TemplatePreview({
  template,
  business,
  primary,
  downloading,
  onDownload,
}: CardProps) {
  const isStory = template.format === 'story'
  const aspect = isStory ? '9 / 16' : '1 / 1'

  // Preview visual simples — não é o PNG final, só pra cliente entender o que vai sair
  let previewBg = template.previewBg(primary)
  let previewContent: React.ReactNode

  if (template.id === 'digital') {
    previewContent = (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-3">
        <span className="text-[7px] tracking-[0.3em] opacity-80 mb-1">
          NO DIGITAL
        </span>
        <span className="text-[12px] font-bold leading-tight px-2 mb-2">
          {business.name}
        </span>
        <div
          className="bg-white rounded-lg flex items-center justify-center"
          style={{ width: 60, height: 60 }}
        >
          <span className="text-[8px] font-mono" style={{ color: primary }}>
            QR
          </span>
        </div>
        <span className="text-[7px] opacity-70 mt-2">aponte a câmera</span>
      </div>
    )
  } else if (template.id === 'horario-hoje') {
    previewContent = (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-3">
        <span className="text-[6px] tracking-[0.3em] opacity-80 mb-1">
          SÓ HOJE
        </span>
        <span className="text-[18px] font-bold leading-none">Hoje</span>
        <span className="text-[14px] font-bold leading-none mt-1">
          tem horário
        </span>
        <div className="w-6 h-6 rounded-full border-2 border-white/80 my-2" />
        <div
          className="bg-white text-slate-900 px-2 py-1 rounded text-[8px] font-bold mt-1"
          style={{ color: primary }}
        >
          Garanta o seu
        </div>
      </div>
    )
  } else {
    previewContent = (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center text-white text-center px-3">
          <span className="text-[10px] font-bold leading-tight">
            Você ainda liga
            <br />
            pra marcar
            <br />
            horário?
          </span>
        </div>
        <div className="bg-white p-2 flex flex-col items-center justify-center" style={{ height: '40%' }}>
          <span className="text-[8px] font-bold text-slate-900">
            {business.name}
          </span>
          <span className="text-[7px]" style={{ color: primary }}>
            agora no digital
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="admin-card-deep p-3 flex flex-col gap-3"
      style={{ borderColor: 'var(--admin-border)' }}
    >
      {/* Preview */}
      <div
        className="w-full overflow-hidden rounded-lg relative"
        style={{
          aspectRatio: aspect,
          background: previewBg,
          border: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        {previewContent}
      </div>

      {/* Info + CTA */}
      <div className="flex flex-col gap-2">
        <div>
          <h4
            className="text-sm font-semibold"
            style={{ color: 'var(--admin-text)' }}
          >
            {template.title}
          </h4>
          <p
            className="text-xs leading-snug mt-0.5"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            {template.desc}
          </p>
        </div>

        <div
          className="flex items-center gap-2 text-[10px] uppercase tracking-wider"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          <span>{isStory ? 'Story · 9:16' : 'Feed · 1:1'}</span>
        </div>

        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
          style={{
            background: `linear-gradient(135deg, ${primary} 0%, ${shade(primary, -20)} 100%)`,
            color: '#ffffff',
            boxShadow: `0 6px 16px -8px ${primary}`,
          }}
        >
          {downloading ? 'Gerando…' : 'Baixar PNG'}
        </button>
      </div>
    </div>
  )
}
