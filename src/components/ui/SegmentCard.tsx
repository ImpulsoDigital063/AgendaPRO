'use client'

import Link from 'next/link'
import { useRef, MouseEvent } from 'react'
import { SegmentIcon } from './SegmentIcon'

export type Segment = 'barbearia' | 'salao' | 'estetica' | 'nail'

const CONFIG: Record<Segment, {
  title:     string
  promise:   string
  accent:    string
  gradient:  string
  iconColor: string
  href:      string
}> = {
  barbearia: {
    title:     'Para barbearias',
    promise:   'Fila cheia sem bater foto no Insta.',
    accent:    '#3B82F6',
    gradient:  'linear-gradient(135deg, rgba(30,64,175,0.35) 0%, rgba(6,182,212,0.25) 100%)',
    iconColor: '#60A5FA',
    href:      '/barbearia',
  },
  salao: {
    title:     'Para salões',
    promise:   'Cliente que agenda, volta e indica sozinho.',
    accent:    '#8B5CF6',
    gradient:  'linear-gradient(135deg, rgba(124,58,237,0.35) 0%, rgba(236,72,153,0.2) 100%)',
    iconColor: '#C4B5FD',
    href:      '/salao',
  },
  estetica: {
    title:     'Para estética',
    promise:   'Ticket alto organizado com elegância.',
    accent:    '#06B6D4',
    gradient:  'linear-gradient(135deg, rgba(6,182,212,0.3) 0%, rgba(30,64,175,0.25) 100%)',
    iconColor: '#67E8F9',
    href:      '/estetica',
  },
  nail: {
    title:     'Para nail designers',
    promise:   'Próximas 3 semanas sempre lotadas.',
    accent:    '#EC4899',
    gradient:  'linear-gradient(135deg, rgba(236,72,153,0.3) 0%, rgba(244,114,182,0.2) 100%)',
    iconColor: '#F9A8D4',
    href:      '/nail',
  },
}

type SegmentCardProps = {
  segment: Segment
}

export function SegmentCard({ segment }: SegmentCardProps) {
  const cfg = CONFIG[segment]
  const ref = useRef<HTMLAnchorElement>(null)

  const handleMouseMove = (e: MouseEvent<HTMLAnchorElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    el.style.setProperty('--tilt-x', `${y * -4}deg`)
    el.style.setProperty('--tilt-y', `${x * 4}deg`)
    el.style.setProperty('--glow-x', `${(x + 0.5) * 100}%`)
    el.style.setProperty('--glow-y', `${(y + 0.5) * 100}%`)
  }

  const handleMouseLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--tilt-x', '0deg')
    el.style.setProperty('--tilt-y', '0deg')
  }

  return (
    <Link
      ref={ref}
      href={cfg.href}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="segment-card glass glow-border group relative block rounded-3xl p-8 md:p-10 overflow-hidden transition-all duration-500"
      style={{
        transform: 'perspective(1200px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Gradient wash do segmento */}
      <div
        className="absolute inset-0 opacity-60 transition-opacity duration-500 group-hover:opacity-90"
        style={{ background: cfg.gradient }}
        aria-hidden="true"
      />

      {/* Highlight que segue o cursor */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle 260px at var(--glow-x, 50%) var(--glow-y, 50%), ${cfg.accent}40 0%, transparent 70%)`,
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-5 md:gap-6">
        {/* Ícone — respira no hover */}
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-500 group-hover:scale-110"
          style={{
            background: `${cfg.accent}15`,
            border: `1px solid ${cfg.accent}40`,
            color: cfg.iconColor,
            boxShadow: `0 0 40px ${cfg.accent}30`,
          }}
        >
          <SegmentIcon segment={segment} size={32} />
        </div>

        {/* Título + promessa */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            {cfg.title}
          </h3>
          <p className="text-base md:text-lg text-slate-300 leading-snug" style={{ minHeight: '3em' }}>
            {cfg.promise}
          </p>
        </div>

        {/* CTA do card */}
        <div
          className="mt-2 inline-flex items-center gap-2 text-sm font-semibold transition-all duration-300"
          style={{ color: cfg.iconColor }}
        >
          <span>Ver como funciona</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-300 group-hover:translate-x-1"
          >
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  )
}
