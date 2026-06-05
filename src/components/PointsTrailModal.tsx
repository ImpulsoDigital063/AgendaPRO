'use client'

import { useState } from 'react'
import Link from 'next/link'
import { IconCalendar, IconSparkles, IconGift, IconStar, IconArrowRight, IconClose } from '@/components/ui/Icon'

type Props = {
  agendarHref: string
  primary: string
  cheapestReward: { name: string; pointsRequired: number } | null
  pointsForReview: number
  pointsForReferral: number
}

/**
 * Popup "Como funciona os pontos" — abre TODA vez que o cliente acessa a
 * página pública (pedido Eduardo 05/06: a trilha inline ficou imperceptível).
 * Card claro/legível independente do tema do negócio. Fecha no X, no backdrop
 * ou no "Entendi". (Sem localStorage de propósito — é pra aparecer sempre.)
 */
export default function PointsTrailModal({ agendarHref, primary, cheapestReward, pointsForReview, pointsForReferral }: Props) {
  const [open, setOpen] = useState(true)
  if (!open) return null

  const steps = [
    { Icon: IconCalendar, t: 'Agende', d: 'Ganhe pontos a cada serviço' },
    { Icon: IconSparkles, t: 'Acumule', d: 'Seus pontos somam a cada visita' },
    {
      Icon: IconGift,
      t: 'Troque',
      d: cheapestReward ? `Por ${cheapestReward.name} · ${cheapestReward.pointsRequired} pts` : 'Por serviços grátis',
    },
  ]

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(2,6,23,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl p-5 sm:p-6"
        style={{ background: '#FFFFFF', boxShadow: '0 30px 80px -20px rgba(2,6,23,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Fechar"
          className="absolute top-3 right-3 w-10 h-10 inline-flex items-center justify-center rounded-full transition-colors hover:brightness-95"
          style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#334155' }}
        >
          <IconClose size={20} />
        </button>

        <div className="text-center mb-4">
          <span
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-2"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}
          >
            <IconGift size={24} />
          </span>
          <h3 className="text-lg font-extrabold" style={{ color: '#0F172A' }}>
            Você ganha pontos aqui!
          </h3>
          <p className="text-xs mt-1" style={{ color: '#64748B' }}>
            Cada visita vale pontos que viram serviços grátis.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {steps.map((s, i) => (
            <div key={i} className="rounded-2xl p-3 text-center" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <span
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl mb-2"
                style={{ background: hexToRgba(primary, 0.1), color: primary }}
              >
                <s.Icon size={18} />
              </span>
              <p className="font-bold text-sm" style={{ color: '#0F172A' }}>{s.t}</p>
              <p className="text-[11px] leading-snug mt-0.5" style={{ color: '#64748B' }}>{s.d}</p>
            </div>
          ))}
        </div>

        {(pointsForReview > 0 || pointsForReferral > 0) && (
          <div className="flex flex-col gap-1.5 mb-4">
            {pointsForReview > 0 && (
              <p className="flex items-center gap-2 text-xs" style={{ color: '#64748B' }}>
                <IconStar size={13} style={{ color: '#F59E0B' }} />
                Avalie no Google e ganhe <strong style={{ color: '#0F172A' }}>+{pointsForReview} pts</strong>
              </p>
            )}
            {pointsForReferral > 0 && (
              <p className="flex items-center gap-2 text-xs" style={{ color: '#64748B' }}>
                <IconSparkles size={13} style={{ color: '#F59E0B' }} />
                Indique um amigo e ganhe <strong style={{ color: '#0F172A' }}>+{pointsForReferral} pts</strong>
              </p>
            )}
          </div>
        )}

        <Link
          href={agendarHref}
          className="cta-pulse-green group w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(180deg, #22C55E 0%, #16A34A 100%)', color: 'white' }}
        >
          Agendar horário
          <span className="transition-transform group-hover:translate-x-1"><IconArrowRight size={18} /></span>
        </Link>
        <button
          onClick={() => setOpen(false)}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm mt-3 transition-colors hover:brightness-95"
          style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155' }}
        >
          <IconClose size={16} /> Fechar
        </button>
      </div>
    </div>
  )
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16) || 0
  const g = parseInt(full.slice(2, 4), 16) || 0
  const b = parseInt(full.slice(4, 6), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
