'use client'

/**
 * Pack de Divulgação V2 — gerador de criativos premium pro cliente postar
 * no Insta. Cada template puxa logo + paleta + slug do business e gera
 * PNG via Canvas API (zero custo servidor).
 *
 * Estratégia branding: rodapé discreto "Agendamento por agendapro.net.br"
 * em todos templates. Cada post do cliente vira distribuição passiva da
 * marca (loop viral estilo Calendly/Linktree).
 *
 * V2 fixes pós-feedback Eduardo (11/05/2026):
 *  - Design premium (gradient mesh · serif · padrões geométricos · ornamentação)
 *  - Usa primary + secondary juntos (resolve cor lisa quando primary é preto)
 *  - Preview mais fiel ao PNG final
 *  - Mobile 2 colunas (não ocupar tela inteira)
 *  - Logo do cliente em destaque (não só centralizada pequena)
 */

import { useEffect, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import type { Business } from '@/lib/types'

type TemplateFormat = 'story' | 'feed'

type TemplateDef = {
  id: 'estamos-digital' | 'horario-hoje' | 'ainda-liga'
  title: string
  desc: string
  format: TemplateFormat
  size: { w: number; h: number }
}

const TEMPLATES: TemplateDef[] = [
  {
    id: 'estamos-digital',
    title: 'Estamos no digital',
    desc: 'Anúncio do lançamento — posta uma vez quando começar',
    format: 'story',
    size: { w: 1080, h: 1920 },
  },
  {
    id: 'horario-hoje',
    title: 'Hoje tem horário',
    desc: 'Manhã com agenda fraca — cria urgência diária',
    format: 'story',
    size: { w: 1080, h: 1920 },
  },
  {
    id: 'ainda-liga',
    title: 'Você ainda liga pra marcar?',
    desc: 'Post educativo — pode usar no feed toda semana',
    format: 'feed',
    size: { w: 1080, h: 1080 },
  },
]

// ─────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────

/** Clareia (+) ou escurece (-) cor hex. */
function shade(hex: string, percent: number): string {
  const h = hex.replace('#', '')
  const num = parseInt(
    h.length === 3 ? h.split('').map((c) => c + c).join('') : h,
    16,
  )
  let r = (num >> 16) + Math.round(2.55 * percent)
  let g = ((num >> 8) & 0xff) + Math.round(2.55 * percent)
  let b = (num & 0xff) + Math.round(2.55 * percent)
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/** Detecta se cor é "muito escura" pra decidir contrast. */
function isDark(hex: string): boolean {
  const h = hex.replace('#', '')
  const num = parseInt(
    h.length === 3 ? h.split('').map((c) => c + c).join('') : h,
    16,
  )
  const r = num >> 16
  const g = (num >> 8) & 0xff
  const b = num & 0xff
  // luminância relativa simplificada
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

/** Carrega imagem (logo) com CORS · funciona pra data URI também. */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

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

/** Selo discreto rodapé · cor automática conforme fundo. */
function drawBrandSeal(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  darkBg: boolean,
) {
  ctx.save()
  ctx.font = '500 22px "Georgia", "Times New Roman", serif'
  ctx.fillStyle = darkBg ? 'rgba(255,255,255,0.42)' : 'rgba(15,23,42,0.42)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText(
    'Agendamento por agendapro.net.br',
    w / 2,
    h - 44,
  )
  ctx.restore()
}

/** Gradient mesh (3 cores) — base premium pra evitar cor lisa. */
function fillMeshBg(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  primary: string,
  secondary: string,
) {
  // Camada 1: gradient diagonal primary → escurecido
  const g1 = ctx.createLinearGradient(0, 0, w, h)
  g1.addColorStop(0, primary)
  g1.addColorStop(1, shade(primary, -40))
  ctx.fillStyle = g1
  ctx.fillRect(0, 0, w, h)

  // Camada 2: glow secondary canto superior direito
  const g2 = ctx.createRadialGradient(w * 0.85, h * 0.15, 0, w * 0.85, h * 0.15, w * 0.7)
  g2.addColorStop(0, hexToRgba(secondary, 0.35))
  g2.addColorStop(1, hexToRgba(secondary, 0))
  ctx.fillStyle = g2
  ctx.fillRect(0, 0, w, h)

  // Camada 3: vinheta escurecida nos cantos pra profundidade
  const g3 = ctx.createRadialGradient(w / 2, h / 2, w * 0.4, w / 2, h / 2, w * 0.9)
  g3.addColorStop(0, 'rgba(0,0,0,0)')
  g3.addColorStop(1, 'rgba(0,0,0,0.35)')
  ctx.fillStyle = g3
  ctx.fillRect(0, 0, w, h)
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const num = parseInt(
    h.length === 3 ? h.split('').map((c) => c + c).join('') : h,
    16,
  )
  return `rgba(${num >> 16}, ${(num >> 8) & 0xff}, ${num & 0xff}, ${alpha})`
}

/** Padrão de pontos sutis (tipo grain) — adiciona depth ao fundo. */
function drawDotPattern(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  alpha = 0.05,
) {
  ctx.save()
  ctx.fillStyle = `rgba(255,255,255,${alpha})`
  for (let x = 0; x < w; x += 50) {
    for (let y = 0; y < h; y += 50) {
      ctx.beginPath()
      ctx.arc(x, y, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

/** Divisor ornamental: linha + diamante central. */
function drawOrnament(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  color: string,
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 1.5
  // linha esquerda
  ctx.beginPath()
  ctx.moveTo(cx - width / 2, cy)
  ctx.lineTo(cx - 18, cy)
  ctx.stroke()
  // linha direita
  ctx.beginPath()
  ctx.moveTo(cx + 18, cy)
  ctx.lineTo(cx + width / 2, cy)
  ctx.stroke()
  // diamante central
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(Math.PI / 4)
  ctx.fillRect(-6, -6, 12, 12)
  ctx.restore()
  ctx.restore()
}

// ─────────────────────────────────────────────────────────────────
// RENDERS
// ─────────────────────────────────────────────────────────────────

type RenderArgs = {
  canvas: HTMLCanvasElement
  business: Business
  bookingUrl: string
  qrSvgString: string | null
}

async function renderEstamosDigital({
  canvas,
  business,
  bookingUrl,
  qrSvgString,
}: RenderArgs) {
  const W = 1080
  const H = 1920
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const primary = business.brand_primary ?? '#3B82F6'
  const secondary = business.brand_secondary ?? '#06B6D4'

  // BG mesh
  fillMeshBg(ctx, W, H, primary, secondary)
  drawDotPattern(ctx, W, H, 0.04)

  // EYEBROW
  ctx.fillStyle = hexToRgba(secondary, 0.85)
  ctx.font = '500 30px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('A G O R A   N O   D I G I T A L', W / 2, 130)

  drawOrnament(ctx, W / 2, 200, 220, hexToRgba(secondary, 0.55))

  // HEADLINE SERIF
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 96px "Georgia", "Times New Roman", serif'
  ctx.textBaseline = 'top'
  ctx.fillText('Agendamento', W / 2, 260)
  ctx.font = 'italic 700 96px "Georgia", "Times New Roman", serif'
  ctx.fillText('online', W / 2, 380)

  // CARD BRANCO COM LOGO + QR
  const cardX = 80
  const cardY = 560
  const cardW = W - 160
  const cardH = 1080

  // Sombra projetada
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = 60
  ctx.shadowOffsetY = 30
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, cardX, cardY, cardW, cardH, 56)
  ctx.fill()
  ctx.restore()

  // Decorações nos cantos do card (linhas L)
  ctx.save()
  ctx.strokeStyle = hexToRgba(primary, 0.4)
  ctx.lineWidth = 3
  const cornerSize = 30
  const inset = 28
  // canto top-left
  ctx.beginPath()
  ctx.moveTo(cardX + inset, cardY + inset + cornerSize)
  ctx.lineTo(cardX + inset, cardY + inset)
  ctx.lineTo(cardX + inset + cornerSize, cardY + inset)
  ctx.stroke()
  // canto top-right
  ctx.beginPath()
  ctx.moveTo(cardX + cardW - inset - cornerSize, cardY + inset)
  ctx.lineTo(cardX + cardW - inset, cardY + inset)
  ctx.lineTo(cardX + cardW - inset, cardY + inset + cornerSize)
  ctx.stroke()
  // canto bottom-left
  ctx.beginPath()
  ctx.moveTo(cardX + inset, cardY + cardH - inset - cornerSize)
  ctx.lineTo(cardX + inset, cardY + cardH - inset)
  ctx.lineTo(cardX + inset + cornerSize, cardY + cardH - inset)
  ctx.stroke()
  // canto bottom-right
  ctx.beginPath()
  ctx.moveTo(cardX + cardW - inset - cornerSize, cardY + cardH - inset)
  ctx.lineTo(cardX + cardW - inset, cardY + cardH - inset)
  ctx.lineTo(cardX + cardW - inset, cardY + cardH - inset - cornerSize)
  ctx.stroke()
  ctx.restore()

  // Conteúdo do card
  let cy = cardY + 100

  // Logo do cliente OU iniciais como fallback
  if (business.logo_url) {
    const logo = await loadImage(business.logo_url)
    if (logo) {
      const maxSize = 220
      const ratio = Math.min(maxSize / logo.width, maxSize / logo.height)
      const lw = logo.width * ratio
      const lh = logo.height * ratio
      ctx.drawImage(logo, W / 2 - lw / 2, cy, lw, lh)
      cy += lh + 30
    } else {
      cy += 30
    }
  } else {
    // Fallback: círculo com iniciais
    const initial = business.name.charAt(0).toUpperCase()
    ctx.save()
    ctx.fillStyle = primary
    ctx.beginPath()
    ctx.arc(W / 2, cy + 90, 90, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 110px "Georgia", serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(initial, W / 2, cy + 90)
    ctx.restore()
    cy += 220
  }

  // Nome do negócio
  ctx.fillStyle = '#0F172A'
  ctx.font = '700 48px "Georgia", "Times New Roman", serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const nameLines = wrapLines(ctx, business.name, cardW - 120)
  for (const line of nameLines) {
    ctx.fillText(line, W / 2, cy)
    cy += 60
  }
  cy += 20

  drawOrnament(ctx, W / 2, cy, 180, hexToRgba(primary, 0.4))
  cy += 50

  // QR Code
  if (qrSvgString) {
    try {
      const qrImg = await svgStringToImage(qrSvgString)
      const qrSize = 480
      ctx.drawImage(qrImg, W / 2 - qrSize / 2, cy, qrSize, qrSize)
      cy += qrSize + 40
    } catch {
      cy += 40
    }
  }

  // URL textual em destaque
  ctx.fillStyle = primary
  ctx.font = '700 38px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.fillText(bookingUrl, W / 2, cy)

  // CTA pós-card
  ctx.fillStyle = '#ffffff'
  ctx.font = '500 44px "Georgia", serif'
  ctx.fillText('Aponte sua câmera no QR', W / 2, cardY + cardH + 80)
  ctx.font = 'italic 32px "Georgia", serif'
  ctx.fillStyle = hexToRgba(secondary, 0.9)
  ctx.fillText('e marque seu horário em segundos', W / 2, cardY + cardH + 140)

  drawBrandSeal(ctx, W, H, true)
}

async function renderHorarioHoje({ canvas, business, bookingUrl }: RenderArgs) {
  const W = 1080
  const H = 1920
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const primary = business.brand_primary ?? '#3B82F6'
  const secondary = business.brand_secondary ?? '#06B6D4'

  // BG mesh
  fillMeshBg(ctx, W, H, primary, secondary)
  drawDotPattern(ctx, W, H, 0.05)

  // Linhas diagonais decorativas (canto superior esquerdo)
  ctx.save()
  ctx.strokeStyle = hexToRgba(secondary, 0.18)
  ctx.lineWidth = 2
  for (let i = 0; i < 8; i++) {
    ctx.beginPath()
    ctx.moveTo(0, 100 + i * 80)
    ctx.lineTo(400 - i * 50, 0)
    ctx.stroke()
  }
  ctx.restore()

  // DATA (canto superior direito)
  const today = new Date()
  const dia = String(today.getDate()).padStart(2, '0')
  const mes = today
    .toLocaleString('pt-BR', { month: 'short' })
    .replace('.', '')
    .toUpperCase()

  ctx.save()
  ctx.fillStyle = hexToRgba(secondary, 0.95)
  ctx.font = '700 38px "Georgia", serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText(`${dia} · ${mes}`, W - 80, 140)
  ctx.restore()

  // EYEBROW
  ctx.fillStyle = hexToRgba(secondary, 0.85)
  ctx.font = '500 30px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('S Ó   H O J E', W / 2, 320)

  // HEADLINE GIGANTE — "Hoje" italic serif
  ctx.fillStyle = '#ffffff'
  ctx.font = 'italic 700 220px "Georgia", "Times New Roman", serif'
  ctx.fillText('Hoje', W / 2, 380)

  // Subhead "tem horário"
  ctx.font = '700 92px "Georgia", serif'
  ctx.fillText('tem horário', W / 2, 640)

  drawOrnament(ctx, W / 2, 800, 200, hexToRgba(secondary, 0.6))

  // CHIPS DE HORÁRIOS SUGERIDOS
  const chips = ['14:00', '15:30', '17:00']
  const chipW = 230
  const chipH = 90
  const gap = 30
  const totalW = chips.length * chipW + (chips.length - 1) * gap
  let chipX = W / 2 - totalW / 2
  const chipY = 870

  for (const time of chips) {
    // chip bg
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    roundRect(ctx, chipX, chipY, chipW, chipH, 18)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    // text
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 46px system-ui, -apple-system, "Helvetica Neue", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(time, chipX + chipW / 2, chipY + chipH / 2)
    chipX += chipW + gap
  }

  ctx.textBaseline = 'top'
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = 'italic 28px "Georgia", serif'
  ctx.textAlign = 'center'
  ctx.fillText('exemplos de horários abertos', W / 2, chipY + chipH + 20)

  // NOME NEGÓCIO — sobe pra fechar o gap entre chips e CTA card
  ctx.fillStyle = '#ffffff'
  ctx.font = '600 56px "Georgia", serif'
  ctx.fillText(business.name, W / 2, 1180)

  // CTA CARD (aproximado do nome — antes tinha gap visual feio)
  const ctaX = 90
  const ctaY = 1330
  const ctaW = W - 180
  const ctaH = 290

  // sombra
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = 50
  ctx.shadowOffsetY = 24
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 32)
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = '#0F172A'
  ctx.font = '700 50px "Georgia", serif'
  ctx.fillText('Garante o seu', W / 2, ctaY + 65)

  ctx.fillStyle = 'rgba(15,23,42,0.55)'
  ctx.font = 'italic 26px "Georgia", serif'
  ctx.fillText('antes que esgote', W / 2, ctaY + 130)

  // URL
  ctx.fillStyle = primary
  ctx.font = '700 36px system-ui, -apple-system, "Helvetica Neue", sans-serif'
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
  const secondary = business.brand_secondary ?? '#06B6D4'

  // BG mesh
  fillMeshBg(ctx, W, H, primary, secondary)
  drawDotPattern(ctx, W, H, 0.05)

  // FAIXA BRANCA DIAGONAL na parte de baixo (não horizontal)
  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(0, H * 0.65)
  ctx.lineTo(W, H * 0.55)
  ctx.lineTo(W, H)
  ctx.lineTo(0, H)
  ctx.closePath()
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 40
  ctx.shadowOffsetY = -10
  ctx.fill()
  ctx.restore()

  // EYEBROW
  ctx.fillStyle = hexToRgba(secondary, 0.85)
  ctx.font = '500 24px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('A G E N D A M E N T O', W / 2, 80)

  // PERGUNTA · SERIF ITALIC GRANDE
  ctx.fillStyle = '#ffffff'
  ctx.font = 'italic 700 78px "Georgia", "Times New Roman", serif'
  ctx.fillText('Você ainda liga', W / 2, 170)
  ctx.fillText('pra marcar', W / 2, 265)
  ctx.fillText('horário?', W / 2, 360)

  // Ícone telefone tachado (minimalist)
  ctx.save()
  ctx.translate(W / 2, 540)
  // Telefone arredondado
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  roundRect(ctx, -40, -55, 80, 110, 14)
  ctx.stroke()
  // botão de speaker
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(-12, -38)
  ctx.lineTo(12, -38)
  ctx.stroke()
  // X tachado (dois traços diagonais)
  ctx.strokeStyle = secondary
  ctx.lineWidth = 12
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-75, -75)
  ctx.lineTo(75, 75)
  ctx.moveTo(75, -75)
  ctx.lineTo(-75, 75)
  ctx.stroke()
  ctx.restore()

  // BLOCO BRANCO INFERIOR — nome + agora no digital + URL
  // Logo cliente em destaque (era 80px, ficou perdida — agora 130px)
  let bottomY = H * 0.66
  if (business.logo_url) {
    const logo = await loadImage(business.logo_url)
    if (logo) {
      const maxSize = 130
      const ratio = Math.min(maxSize / logo.width, maxSize / logo.height)
      const lw = logo.width * ratio
      const lh = logo.height * ratio
      ctx.drawImage(logo, W / 2 - lw / 2, bottomY, lw, lh)
      bottomY += lh + 14
    }
  }

  ctx.fillStyle = '#0F172A'
  ctx.font = '700 48px "Georgia", "Times New Roman", serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(business.name, W / 2, bottomY)
  bottomY += 58

  // "agora no digital" — escurece primary pra ter contraste no fundo branco.
  // Antes ficava ilegível quando primary era azul claro / cor saturada.
  ctx.fillStyle = shade(primary, -30)
  ctx.font = 'italic 32px "Georgia", serif'
  ctx.fillText('agora no digital', W / 2, bottomY)
  bottomY += 54

  ctx.fillStyle = '#0F172A'
  ctx.font = '700 30px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.fillText(bookingUrl, W / 2, bottomY)
  bottomY += 38

  ctx.fillStyle = 'rgba(15,23,42,0.45)'
  ctx.font = 'italic 22px "Georgia", serif'
  ctx.fillText('→ link na bio', W / 2, bottomY)

  // Selo do feed 1:1 fica EMBUTIDO na faixa branca → some sobreposto com
  // "link na bio". Renderiza acima da faixa branca (no fundo azul) onde
  // tem espaço respirando.
  ctx.save()
  ctx.font = '500 18px "Georgia", "Times New Roman", serif'
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(
    'Agendamento por agendapro.net.br',
    W / 2,
    H * 0.57,
  )
  ctx.restore()
}

const RENDERERS: Record<TemplateDef['id'], (args: RenderArgs) => Promise<void>> = {
  'estamos-digital': renderEstamosDigital,
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
  const secondary = business.brand_secondary ?? '#06B6D4'

  const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.agendapro.net.br')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
  const bookingUrl = `${APP_URL}/${business.slug}`
  const bookingFull = `https://${bookingUrl}`

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
        }
      }

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
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(primary, 0.06)} 0%, ${hexToRgba(secondary, 0.04)} 100%)`,
          borderLeft: `3px solid ${primary}`,
        }}
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
          Cada cliente que ver, agenda direto com você sem precisar ligar.
        </p>
      </div>

      {/* Grid de templates — 2 col mobile, 3 col desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {TEMPLATES.map((t) => (
          <TemplatePreview
            key={t.id}
            template={t}
            business={business}
            primary={primary}
            secondary={secondary}
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

      {/* Dica */}
      <div
        className="admin-card-deep p-4 text-xs leading-relaxed"
        style={{ color: 'var(--admin-text-mute)' }}
      >
        <strong style={{ color: 'var(--admin-text)' }}>Dica:</strong> as artes
        saem com sua logo, sua cor e o link da sua página. Quanto mais cliente
        ver no story do seu cliente, mais agendamento orgânico você ganha sem
        pagar anúncio.
      </div>

      {/* QR Code escondido */}
      <div
        ref={qrContainerRef}
        style={{
          position: 'absolute',
          left: -99999,
          top: 0,
          width: 480,
          height: 480,
        }}
        aria-hidden="true"
      >
        <QRCode value={bookingFull} size={480} bgColor="#FFFFFF" fgColor="#0F172A" />
      </div>

      {/* Canvas escondido */}
      <canvas ref={canvasRef} style={{ display: 'none' }} aria-hidden="true" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// PREVIEW CARD — visualmente fiel ao PNG (não simplificado)
// ─────────────────────────────────────────────────────────────────

type CardProps = {
  template: TemplateDef
  business: Business
  primary: string
  secondary: string
  downloading: boolean
  onDownload: () => void
}

function TemplatePreview({
  template,
  business,
  primary,
  secondary,
  downloading,
  onDownload,
}: CardProps) {
  const isStory = template.format === 'story'
  const aspect = isStory ? '9 / 16' : '1 / 1'

  // BG mesh CSS equivalente ao Canvas
  const meshBg = `
    radial-gradient(ellipse 90% 60% at 85% 15%, ${hexToRgba(secondary, 0.35)} 0%, transparent 55%),
    radial-gradient(ellipse 70% 50% at 15% 85%, rgba(0,0,0,0.35) 0%, transparent 55%),
    linear-gradient(135deg, ${primary} 0%, ${shade(primary, -40)} 100%)
  `

  return (
    <div
      className="admin-card-deep p-2.5 flex flex-col gap-2.5"
      style={{ borderColor: 'var(--admin-border)' }}
    >
      {/* Preview */}
      <div
        className="w-full overflow-hidden rounded-lg relative"
        style={{
          aspectRatio: aspect,
          background: meshBg,
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {template.id === 'estamos-digital' && (
          <PreviewEstamosDigital
            business={business}
            primary={primary}
            secondary={secondary}
          />
        )}
        {template.id === 'horario-hoje' && (
          <PreviewHorarioHoje secondary={secondary} />
        )}
        {template.id === 'ainda-liga' && (
          <PreviewAindaLiga
            business={business}
            primary={primary}
            secondary={secondary}
          />
        )}
      </div>

      {/* Info + CTA */}
      <div className="flex flex-col gap-1.5">
        <h4
          className="text-xs sm:text-sm font-semibold leading-tight"
          style={{ color: 'var(--admin-text)' }}
        >
          {template.title}
        </h4>
        <p
          className="text-[10px] sm:text-xs leading-snug"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          {template.desc}
        </p>
        <p
          className="text-[9px] uppercase tracking-wider opacity-60 mt-0.5"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          {isStory ? 'Story · 9:16' : 'Feed · 1:1'}
        </p>

        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="w-full py-2 mt-1 rounded-lg text-xs sm:text-sm font-semibold transition-all disabled:opacity-50"
          style={{
            background: `linear-gradient(135deg, ${primary} 0%, ${shade(primary, -20)} 100%)`,
            color: '#ffffff',
            boxShadow: `0 6px 14px -8px ${primary}`,
          }}
        >
          {downloading ? 'Gerando…' : 'Baixar PNG'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// PREVIEWS (CSS · fiel ao Canvas final)
// ─────────────────────────────────────────────────────────────────

function PreviewEstamosDigital({
  business,
  primary,
  secondary,
}: {
  business: Business
  primary: string
  secondary: string
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center px-2 py-3 text-white">
      <span
        className="text-[6px] tracking-[0.25em] mb-1 mt-1"
        style={{ color: hexToRgba(secondary, 0.85) }}
      >
        AGORA NO DIGITAL
      </span>
      <span
        className="text-[15px] font-bold leading-none mt-1"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        Agendamento
      </span>
      <span
        className="text-[15px] italic font-bold leading-none"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        online
      </span>

      <div
        className="mt-2 w-[85%] flex-1 bg-white rounded-lg flex flex-col items-center justify-center px-2 py-2 relative"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
      >
        {business.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.logo_url}
            alt={business.name}
            className="max-w-[40px] max-h-[40px] object-contain mb-1"
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center mb-1"
            style={{ background: primary }}
          >
            <span className="text-white text-[9px] font-bold">
              {business.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <span
          className="text-[7px] font-bold leading-tight text-center px-1"
          style={{ color: '#0F172A', fontFamily: 'Georgia, serif' }}
        >
          {business.name.length > 18
            ? business.name.slice(0, 16) + '…'
            : business.name}
        </span>
        <div
          className="my-1 bg-slate-800 rounded"
          style={{ width: 38, height: 38 }}
        >
          <div className="w-full h-full grid grid-cols-5 grid-rows-5 gap-px p-px">
            {Array.from({ length: 25 }).map((_, i) => (
              <div
                key={i}
                className={i % 3 === 0 ? 'bg-white' : 'bg-slate-800'}
              />
            ))}
          </div>
        </div>
        <span
          className="text-[5px] font-bold"
          style={{ color: primary }}
        >
          agendapro.net.br
        </span>
      </div>

      <span className="text-[6px] mt-1 opacity-80">aponte sua câmera</span>
    </div>
  )
}

function PreviewHorarioHoje({ secondary }: { secondary: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-2">
      <span
        className="text-[5px] tracking-[0.25em] mb-1"
        style={{ color: hexToRgba(secondary, 0.85) }}
      >
        SÓ HOJE
      </span>
      <span
        className="text-[28px] italic font-bold leading-none"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        Hoje
      </span>
      <span
        className="text-[12px] font-bold leading-tight mt-0.5"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        tem horário
      </span>
      <div className="flex gap-1 mt-2">
        {['14:00', '15:30', '17:00'].map((t) => (
          <div
            key={t}
            className="px-1 py-0.5 rounded text-[6px] font-bold border"
            style={{
              background: 'rgba(255,255,255,0.12)',
              borderColor: 'rgba(255,255,255,0.25)',
            }}
          >
            {t}
          </div>
        ))}
      </div>
      <div
        className="mt-2 px-2 py-1 bg-white rounded text-[7px] font-bold"
        style={{ color: '#0F172A', fontFamily: 'Georgia, serif' }}
      >
        Garante o seu
      </div>
    </div>
  )
}

function PreviewAindaLiga({
  business,
  primary,
}: {
  business: Business
  primary: string
  secondary: string
}) {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 flex flex-col items-center justify-start text-white pt-3 px-2">
        <span
          className="text-[10px] italic font-bold leading-tight text-center"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Você ainda
          <br />
          liga pra marcar
          <br />
          horário?
        </span>
      </div>
      <div
        className="absolute left-0 right-0 bottom-0 bg-white flex flex-col items-center justify-center text-center px-2"
        style={{
          height: '40%',
          clipPath: 'polygon(0 15%, 100% 0%, 100% 100%, 0% 100%)',
          paddingTop: '10%',
        }}
      >
        <span
          className="text-[8px] font-bold leading-tight"
          style={{ color: '#0F172A', fontFamily: 'Georgia, serif' }}
        >
          {business.name.length > 16
            ? business.name.slice(0, 14) + '…'
            : business.name}
        </span>
        <span
          className="text-[6px] italic mt-0.5"
          style={{ color: primary, fontFamily: 'Georgia, serif' }}
        >
          agora no digital
        </span>
      </div>
    </div>
  )
}
