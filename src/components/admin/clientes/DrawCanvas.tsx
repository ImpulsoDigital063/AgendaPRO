'use client'

/**
 * DrawCanvas · campo de desenho/mapeamento pra ficha (lash design · nail · etc).
 * Risca à mão livre com dedo (mobile · pointer/touch) ou mouse (desktop) e salva
 * como PNG (data URL) dentro da resposta da ficha. Pedido Rosy 23/06 — larga o
 * caderno de mapeamento de cílios. Serve qualquer nail/estúdio.
 *
 * Backing store fixo (W×H) escalado por CSS (width 100% + aspect-ratio) — as
 * coordenadas do ponteiro são remapeadas via getBoundingClientRect, então
 * funciona em qualquer largura. touch-action:none evita rolar a tela ao riscar.
 */

import { useEffect, useRef } from 'react'

const W = 700
const H = 320

type Props = {
  value?: string
  onChange: (dataUrl: string) => void
  disabled?: boolean
}

export default function DrawCanvas({ value, onChange, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  // Init: fundo branco (folha) + carrega desenho já salvo, se houver.
  useEffect(() => {
    const cv = canvasRef.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
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
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
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
