'use client'

/**
 * DrawCanvas · campo de desenho/mapeamento pra ficha (lash design · nail · etc).
 * Risca à mão livre com dedo (mobile · pointer/touch) ou mouse (desktop) e salva
 * como PNG (data URL) dentro da resposta da ficha. Pedido Rosy 23/06.
 *
 * background='eyes' desenha 2 contornos de olho (com guias de cílios) pra ela
 * riscar o mapeamento em cima, igual ao "Mapping Estilo" do caderno de papel.
 *
 * Backing store fixo (W×H) escalado por CSS (width 100% + aspect-ratio) — as
 * coordenadas do ponteiro são remapeadas via getBoundingClientRect. touch-action
 * :none evita rolar a tela ao riscar.
 */

import { useEffect, useRef } from 'react'

const W = 700
const H = 320

type Props = {
  value?: string
  onChange: (dataUrl: string) => void
  disabled?: boolean
  background?: 'blank' | 'eyes' | 'rosto'
  /* Diagrama do proprio negocio como fundo (perna, orelha, face, corpo).
     Vence os fundos desenhados: e o desenho que a clinica ja usa no papel,
     nao uma imitacao. A marcacao da profissional fica SEPARADA da imagem —
     trocar o diagrama depois nao apaga marcacao nenhuma. */
  backgroundUrl?: string | null
}

function drawEye(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, label: string) {
  const x1 = cx - w / 2
  const x2 = cx + w / 2
  // Amêndoa (pálpebra superior + inferior)
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x1, cy)
  ctx.quadraticCurveTo(cx, cy - h / 2, x2, cy)
  ctx.quadraticCurveTo(cx, cy + h / 2, x1, cy)
  ctx.stroke()
  // Íris
  ctx.beginPath()
  ctx.arc(cx, cy, h * 0.26, 0, Math.PI * 2)
  ctx.stroke()
  // Guias de cílios ao longo da pálpebra superior
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 1
  const n = 9
  for (let i = 1; i < n; i++) {
    const t = i / n
    const px = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2
    const py = (1 - t) * (1 - t) * cy + 2 * (1 - t) * t * (cy - h / 2) + t * t * cy
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(px, py - 14)
    ctx.stroke()
  }
  // Rótulo
  ctx.fillStyle = '#94a3b8'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(label, cx, cy + h / 2 + 28)
}

/* Rosto de frente pra marcar ponto de aplicacao (toxina, preenchimento,
   bioestimulador, fios). Antes de existir, a ficha de toxina mostrava os DOIS
   OLHOS do design de cilios — o unico fundo que havia — e uma clinica abria a
   ficha de botox e via desenho de extensao de cilios.
   Contorno simples de proposito: e guia pra marcacao a dedo, nao ilustracao
   anatomica. Linha fina e cinza pra o desenho da profissional se destacar. */
function drawRosto(ctx: CanvasRenderingContext2D) {
  const cx = W / 2
  ctx.strokeStyle = '#CBD5E1'
  ctx.lineWidth = 2
  ctx.setLineDash([])

  // contorno do rosto
  ctx.beginPath()
  ctx.ellipse(cx, 175, 118, 155, 0, 0, Math.PI * 2)
  ctx.stroke()

  // orelhas
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(cx + s * 118, 180, 14, 30, 0, 0, Math.PI * 2)
    ctx.stroke()
  }

  // sobrancelhas
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(cx + s * 30, 130)
    ctx.quadraticCurveTo(cx + s * 60, 118, cx + s * 88, 132)
    ctx.stroke()
  }

  // olhos
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(cx + s * 58, 158, 30, 13, 0, 0, Math.PI * 2)
    ctx.stroke()
  }

  // nariz
  ctx.beginPath()
  ctx.moveTo(cx, 160)
  ctx.lineTo(cx - 12, 215)
  ctx.quadraticCurveTo(cx, 225, cx + 12, 215)
  ctx.stroke()

  // boca
  ctx.beginPath()
  ctx.moveTo(cx - 42, 253)
  ctx.quadraticCurveTo(cx, 240, cx + 42, 253)
  ctx.quadraticCurveTo(cx, 272, cx - 42, 253)
  ctx.stroke()

  // tercos faciais — referencia de altura, tracejado bem leve
  ctx.strokeStyle = '#E2E8F0'
  ctx.lineWidth = 1
  ctx.setLineDash([6, 6])
  for (const y of [120, 205]) {
    ctx.beginPath()
    ctx.moveTo(cx - 130, y)
    ctx.lineTo(cx + 130, y)
    ctx.stroke()
  }
  ctx.setLineDash([])
}

export default function DrawCanvas({ value, onChange, disabled, background = 'blank', backgroundUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  function paintBg(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
    if (background === 'eyes') {
      drawEye(ctx, 185, 150, 250, 100, 'Olho esquerdo')
      drawEye(ctx, 515, 150, 250, 100, 'Olho direito')
    }
    if (background === 'rosto') drawRosto(ctx)
  }

  /* Init: fundo + marcacao ja salva por cima.
     Com imagem, a ordem importa: a imagem tem que estar desenhada ANTES da
     marcacao, senao a marcacao some embaixo dela quando a rede demora. Por
     isso a marcacao e desenhada dentro do onload, e nao em paralelo. */
  useEffect(() => {
    const cv = canvasRef.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return

    const porCima = () => {
      if (!value) return
      const marca = new Image()
      marca.onload = () => ctx.drawImage(marca, 0, 0, W, H)
      marca.src = value
    }

    paintBg(ctx)

    if (backgroundUrl) {
      const fundo = new Image()
      fundo.crossOrigin = 'anonymous'   // sem isto o canvas "suja" e nao exporta
      fundo.onload = () => {
        // contain: o diagrama nao pode distorcer — proporcao de anatomia importa
        const escala = Math.min(W / fundo.width, H / fundo.height)
        const w = fundo.width * escala
        const h = fundo.height * escala
        ctx.drawImage(fundo, (W - w) / 2, (H - h) / 2, w, h)
        porCima()
      }
      fundo.onerror = porCima   // imagem fora do ar nao pode travar a ficha
      fundo.src = backgroundUrl
      return
    }

    porCima()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundUrl])

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = canvasRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H,
    }
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return
    drawing.current = true
    last.current = pos(e)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return
    const ctx = canvasRef.current!.getContext('2d')!
    const p = pos(e)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(last.current!.x, last.current!.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
  }

  function end() {
    if (!drawing.current) return
    drawing.current = false
    last.current = null
    // webp comprime ~10x vs PNG (nativo do canvas) — desenho esparso fica ~5-15KB
    onChange(canvasRef.current!.toDataURL('image/webp', 0.85))
  }

  function clear() {
    const ctx = canvasRef.current!.getContext('2d')!
    paintBg(ctx)
    /* "Limpar" apaga a MARCACAO, nao o diagrama. Sem redesenhar a imagem aqui,
       a profissional limpa um erro e o desenho de fundo some junto — e ela
       fica com uma folha branca no meio da ficha, sem entender. */
    if (backgroundUrl) {
      const fundo = new Image()
      fundo.crossOrigin = 'anonymous'
      fundo.onload = () => {
        const escala = Math.min(W / fundo.width, H / fundo.height)
        const w = fundo.width * escala
        const h = fundo.height * escala
        ctx.drawImage(fundo, (W - w) / 2, (H - h) / 2, w, h)
      }
      fundo.src = backgroundUrl
    }
    onChange('')
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="w-full rounded-xl select-none"
        style={{
          touchAction: 'none',
          border: '1px solid var(--admin-border)',
          background: '#fff',
          aspectRatio: `${W} / ${H}`,
          cursor: disabled ? 'default' : 'crosshair',
        }}
      />
      {!disabled && (
        <button
          type="button"
          onClick={clear}
          className="mt-1.5 text-xs font-semibold"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          Limpar desenho
        </button>
      )}
    </div>
  )
}
