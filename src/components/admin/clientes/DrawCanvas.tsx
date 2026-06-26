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
  background?: 'blank' | 'eyes'
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

export default function DrawCanvas({ value, onChange, disabled, background = 'blank' }: Props) {
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
  }

  // Init: fundo (branco · ou olhos) + carrega desenho já salvo, se houver.
  useEffect(() => {
    const cv = canvasRef.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    paintBg(ctx)
    if (value) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, W, H)
      img.src = value
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    onChange(canvasRef.current!.toDataURL('image/png'))
  }

  function clear() {
    const ctx = canvasRef.current!.getContext('2d')!
    paintBg(ctx)
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
