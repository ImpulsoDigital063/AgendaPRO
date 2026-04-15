import type { ReactNode } from 'react'

export type Mechanism =
  | 'agenda24h'
  | 'lembrete'
  | 'fidelidade'
  | 'fila'
  | 'indicacao'
  | 'reviews'
  | 'comissao'
  | 'whitelabel'

const PALETTE: Record<Mechanism, { from: string; to: string; glow: string }> = {
  agenda24h:  { from: '#3B82F6', to: '#06B6D4', glow: 'rgba(59,130,246,0.45)' },
  lembrete:   { from: '#06B6D4', to: '#22D3EE', glow: 'rgba(34,211,238,0.45)' },
  fidelidade: { from: '#F59E0B', to: '#FBBF24', glow: 'rgba(251,191,36,0.45)' },
  fila:       { from: '#8B5CF6', to: '#A78BFA', glow: 'rgba(139,92,246,0.45)' },
  indicacao:  { from: '#EC4899', to: '#F472B6', glow: 'rgba(236,72,153,0.45)' },
  reviews:    { from: '#10B981', to: '#34D399', glow: 'rgba(16,185,129,0.45)' },
  comissao:   { from: '#3B82F6', to: '#8B5CF6', glow: 'rgba(139,92,246,0.45)' },
  whitelabel: { from: '#06B6D4', to: '#8B5CF6', glow: 'rgba(6,182,212,0.45)' },
}

export function MechanismIcon({ kind, size = 96 }: { kind: Mechanism; size?: number }) {
  const { from, to, glow } = PALETTE[kind]
  const id = `g-${kind}`

  const wrap = (children: ReactNode) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      style={{ filter: `drop-shadow(0 0 24px ${glow})` }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
          <stop stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <radialGradient id={`${id}-bg`} cx="48" cy="48" r="44" gradientUnits="userSpaceOnUse">
          <stop stopColor={from} stopOpacity="0.18" />
          <stop offset="1" stopColor={from} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="92" height="92" rx="22" fill={`url(#${id}-bg)`} stroke={from} strokeOpacity="0.25" />
      {children}
    </svg>
  )

  switch (kind) {
    case 'agenda24h':
      return wrap(
        <g stroke={`url(#${id})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <rect x="22" y="26" width="52" height="48" rx="6" />
          <line x1="22" y1="40" x2="74" y2="40" />
          <line x1="34" y1="20" x2="34" y2="32" />
          <line x1="62" y1="20" x2="62" y2="32" />
          <circle cx="48" cy="56" r="9" fill={`url(#${id})`} fillOpacity="0.18" />
          <path d="M48 51 V57 L52 60" />
        </g>
      )
    case 'lembrete':
      return wrap(
        <g stroke={`url(#${id})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M30 60 V46 a18 18 0 0 1 36 0 V60 l4 6 H26 z" />
          <path d="M44 70 a4 4 0 0 0 8 0" />
          <circle cx="68" cy="30" r="6" fill={`url(#${id})`} stroke="none" />
        </g>
      )
    case 'fidelidade':
      return wrap(
        <g fill="none" stroke={`url(#${id})`} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M48 22 l6 14 15 1 -11.5 10 3.5 15 -13 -8 -13 8 3.5 -15 -11.5 -10 15 -1 z" fill={`url(#${id})`} fillOpacity="0.18" />
          <circle cx="68" cy="28" r="3" fill={`url(#${id})`} stroke="none" />
          <circle cx="28" cy="62" r="2.5" fill={`url(#${id})`} stroke="none" />
        </g>
      )
    case 'fila':
      return wrap(
        <g fill="none" stroke={`url(#${id})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="30" cy="48" r="7" fill={`url(#${id})`} fillOpacity="0.18" />
          <circle cx="50" cy="48" r="7" />
          <circle cx="70" cy="48" r="7" />
          <path d="M37 48 H43" />
          <path d="M57 48 H63" />
          <path d="M30 30 V20 M27 23 L30 20 L33 23" />
        </g>
      )
    case 'indicacao':
      return wrap(
        <g fill="none" stroke={`url(#${id})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="36" r="8" fill={`url(#${id})`} fillOpacity="0.2" />
          <circle cx="64" cy="60" r="8" fill={`url(#${id})`} fillOpacity="0.2" />
          <path d="M40 42 L56 54" strokeDasharray="3 4" />
          <path d="M48 26 L52 30 L48 34" />
          <path d="M52 30 H38" />
        </g>
      )
    case 'reviews':
      return wrap(
        <g fill={`url(#${id})`} stroke={`url(#${id})`} strokeWidth="1.5" strokeLinejoin="round">
          {[20, 36, 52, 68].map((x) => (
            <path key={x} d={`M${x} 50 l3 6 7 .5 -5 4.5 1.5 7 -6.5 -3.5 -6.5 3.5 1.5 -7 -5 -4.5 7 -.5 z`} fillOpacity="0.9" />
          ))}
          <circle cx="76" cy="32" r="6" fill={`url(#${id})`} />
          <text x="76" y="35" textAnchor="middle" fontSize="7" fontWeight="700" fill="#0B0F1F" stroke="none">5</text>
        </g>
      )
    case 'comissao':
      return wrap(
        <g fill="none" stroke={`url(#${id})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="48" cy="50" r="20" />
          <path d="M48 30 V50 L66 50" fill={`url(#${id})`} fillOpacity="0.25" />
          <line x1="48" y1="50" x2="32" y2="62" />
          <text x="48" y="78" textAnchor="middle" fontSize="9" fontWeight="700" fill={from} stroke="none">R$</text>
        </g>
      )
    case 'whitelabel':
      return wrap(
        <g fill="none" stroke={`url(#${id})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="32" y="20" width="32" height="56" rx="5" />
          <line x1="40" y1="28" x2="56" y2="28" />
          <rect x="38" y="36" width="20" height="14" rx="3" fill={`url(#${id})`} fillOpacity="0.25" />
          <line x1="38" y1="56" x2="58" y2="56" />
          <line x1="38" y1="62" x2="52" y2="62" />
          <circle cx="48" cy="70" r="2" fill={`url(#${id})`} stroke="none" />
        </g>
      )
  }
}
