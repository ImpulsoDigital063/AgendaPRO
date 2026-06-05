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
 * pública (pedido Eduardo 05/06). EXPLICA o programa: o que é, como ganhar
 * (cada via + quantos pts) e como trocar. Card claro/legível, fechar bem
 * visível (X grande + botão Fechar). Sem localStorage de propósito.
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
        className="relative w-full max-w-sm rounded-3xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
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

        {/* Cabeçalho — o que é */}
        <div className="text-center mb-5 pr-8">
          <span
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-2"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}
          >
            <IconGift size={24} />
          </span>
          <h3 className="text-lg font-extrabold" style={{ color: '#0F172A' }}>
            Programa de Pontos
          </h3>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: '#64748B' }}>
            Aqui cada visita vira ponto — e ponto vira serviço grátis. Veja como funciona:
          </p>
        </div>

        {/* COMO GANHAR */}
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: '#16A34A' }}>
          1 · Como ganhar pontos
        </p>
        <div className="space-y-2 mb-4">
          <Row primary={primary} Icon={IconCalendar} title="Agende um serviço" desc="Cada serviço dá pontos (veja na lista)" />
          {pointsForReview > 0 && (
            <Row primary={primary} Icon={IconStar} title="Avalie no Google" desc="Leva 30 segundos" value={`+${pointsForReview} pts`} />
          )}
          {pointsForReferral > 0 && (
            <Row primary={primary} Icon={IconSparkles} title="Indique um amigo" desc="Quando ele agendar o 1º horário" value={`+${pointsForReferral} pts`} />
          )}
        </div>

        {/* COMO TROCAR */}
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: '#16A34A' }}>
          2 · Como trocar
        </p>
        <div className="space-y-2 mb-2">
          <Row
            primary={primary}
            Icon={IconGift}
            title="Troque por serviços grátis"
            desc={cheapestReward ? `Ex.: ${cheapestReward.name}` : 'Junte pontos e resgate prêmios'}
            value={cheapestReward ? `${cheapestReward.pointsRequired} pts` : undefined}
          />
        </div>
        <p className="text-[11px] leading-relaxed mb-5" style={{ color: '#94A3B8' }}>
          Acompanhe seu saldo e resgate em <strong style={{ color: '#64748B' }}>Meus pontos</strong>. Os pontos entram quando o atendimento é concluído.
        </p>

        {/* Ações */}
        <Link
          href={agendarHref}
          className="cta-pulse-green group w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(180deg, #22C55E 0%, #16A34A 100%)', color: 'white' }}
        >
          Agendar horário
          <span className="transition-transform group-hover:translate-x-1"><IconArrowRight size={18} /></span>
        </Link>
        <Link
          href={meusPontosHref}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm mt-2 transition-colors hover:brightness-95"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
        >
          <IconSparkles size={15} /> Ver meus pontos
        </Link>
        <button
          onClick={() => setOpen(false)}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm mt-2 transition-colors hover:brightness-95"
          style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155' }}
        >
          <IconClose size={16} /> Fechar
        </button>
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
    <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
      <span
        className="inline-flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
        style={{ background: hexToRgba(primary, 0.1), color: primary }}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-sm leading-tight" style={{ color: '#0F172A' }}>{title}</p>
        <p className="text-[11px] leading-snug mt-0.5" style={{ color: '#64748B' }}>{desc}</p>
      </div>
      {value && (
        <span className="text-sm font-extrabold tabular-nums flex-shrink-0" style={{ color: '#16A34A' }}>
          {value}
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
