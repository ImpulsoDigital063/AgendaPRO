'use client'

import { useState } from 'react'
import Link from 'next/link'
import { IconCalendar, IconSparkles, IconGift, IconStar, IconArrowRight, IconClose } from '@/components/ui/Icon'

type Props = {
  agendarHref: string
  meusPontosHref: string
  primary: string
  cheapestReward: { name: string; pointsRequired: number } | null
  pointsForReview: number
  pointsForReferral: number
}

/**
 * Popup "Programa de Pontos" — abre TODA vez que o cliente acessa a página
 * pública (Eduardo 05/06). EXPLICA o programa (o que é · como ganhar · como
 * trocar). Conteúdo rola; o botão Agendar + Fechar ficam FIXOS no rodapé,
 * sempre visíveis sem rolar (Olímpio 05/06: CTA caía abaixo da dobra).
 */
export default function PointsTrailModal({
  agendarHref,
  meusPontosHref,
  primary,
  cheapestReward,
  pointsForReview,
  pointsForReferral,
}: Props) {
  const [open, setOpen] = useState(true)
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(2,6,23,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl flex flex-col max-h-[88vh]"
        style={{ background: '#FFFFFF', boxShadow: '0 30px 80px -20px rgba(2,6,23,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Fechar"
          className="absolute top-3 right-3 z-10 w-9 h-9 inline-flex items-center justify-center rounded-full transition-colors hover:brightness-95"
          style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#334155' }}
        >
          <IconClose size={18} />
        </button>

        {/* Conteúdo rolável */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-5 pb-2">
          <div className="text-center mb-3 pr-8">
            <span
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-1.5"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}
            >
              <IconGift size={20} />
            </span>
            <h3 className="text-base font-extrabold" style={{ color: '#0F172A' }}>
              Programa de Pontos
            </h3>
            <p className="text-[11px] mt-0.5 leading-snug" style={{ color: '#64748B' }}>
              Cada visita vira ponto — e ponto vira serviço grátis.
            </p>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ color: '#16A34A' }}>
            1 · Como ganhar
          </p>
          <div className="space-y-1.5 mb-3">
            <Row primary={primary} Icon={IconCalendar} title="Agende um serviço" desc="Cada serviço dá pontos" />
            {pointsForReview > 0 && (
              <Row primary={primary} Icon={IconStar} title="Avalie no Google" desc="Leva 30 segundos" value={`+${pointsForReview}`} />
            )}
            {pointsForReferral > 0 && (
              <Row primary={primary} Icon={IconSparkles} title="Indique um amigo" desc="Quando ele agendar" value={`+${pointsForReferral}`} />
            )}
          </div>

          <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ color: '#16A34A' }}>
            2 · Como trocar
          </p>
          <div className="mb-2">
            <Row
              primary={primary}
              Icon={IconGift}
              title="Troque por serviços grátis"
              desc={cheapestReward ? `Ex.: ${cheapestReward.name}` : 'Junte pontos e resgate'}
              value={cheapestReward ? `${cheapestReward.pointsRequired}` : undefined}
            />
          </div>
          <p className="text-[11px] leading-snug" style={{ color: '#94A3B8' }}>
            Acompanhe seu saldo em{' '}
            <Link href={meusPontosHref} className="font-bold underline" style={{ color: '#92400E' }}>
              Meus pontos
            </Link>
            . Os pontos entram quando o atendimento conclui.
          </p>
        </div>

        {/* Rodapé FIXO — sempre visível sem rolar */}
        <div className="flex-shrink-0 px-5 pt-3 pb-4" style={{ borderTop: '1px solid #E2E8F0' }}>
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
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl font-bold text-sm mt-2 transition-colors hover:brightness-95"
            style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155' }}
          >
            <IconClose size={15} /> Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({
  Icon,
  title,
  desc,
  value,
  primary,
}: {
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  title: string
  desc: string
  value?: string
  primary: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl p-2.5" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
      <span
        className="inline-flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
        style={{ background: hexToRgba(primary, 0.1), color: primary }}
      >
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-sm leading-tight" style={{ color: '#0F172A' }}>{title}</p>
        <p className="text-[11px] leading-snug" style={{ color: '#64748B' }}>{desc}</p>
      </div>
      {value && (
        <span className="text-sm font-extrabold tabular-nums flex-shrink-0" style={{ color: '#16A34A' }}>
          {value} <span className="text-[10px] font-bold">pts</span>
        </span>
      )}
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
