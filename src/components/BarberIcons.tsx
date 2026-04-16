/* SVG icon set para LPs do AgendaPRO — Barbearia
   Ícones temáticos (tesoura, navalha, máquina, barber pole)
   + ícones funcionais da SmartAgenda
   Tudo currentColor pra herdar cor do parent. */

type IconProps = { size?: number; className?: string; strokeWidth?: number }

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

/* ═══ Tema Barbearia ═══ */

export function IconScissors({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  )
}

export function IconRazor({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <rect x="3" y="9" width="13" height="3" rx="1" />
      <path d="M16 10.5h3l2-2-2-2h-3" />
      <line x1="3" y1="13" x2="3" y2="20" />
      <line x1="6" y1="13" x2="6" y2="20" />
    </svg>
  )
}

export function IconClipper({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <rect x="4" y="3" width="16" height="6" rx="1.5" />
      <line x1="6" y1="9" x2="6" y2="11" />
      <line x1="9" y1="9" x2="9" y2="11" />
      <line x1="12" y1="9" x2="12" y2="11" />
      <line x1="15" y1="9" x2="15" y2="11" />
      <line x1="18" y1="9" x2="18" y2="11" />
      <rect x="7" y="11" width="10" height="9" rx="2" />
      <line x1="12" y1="14" x2="12" y2="17" />
    </svg>
  )
}

export function IconBarberPole({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <rect x="8" y="3" width="8" height="3" rx="0.5" />
      <rect x="9" y="6" width="6" height="12" />
      <rect x="8" y="18" width="8" height="3" rx="0.5" />
      <line x1="9" y1="9" x2="15" y2="7" />
      <line x1="9" y1="13" x2="15" y2="11" />
      <line x1="9" y1="17" x2="15" y2="15" />
    </svg>
  )
}

export function IconMustache({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M2 11c1-2 3-3 5-3 2 0 3 1 5 3 2-2 3-3 5-3 2 0 4 1 5 3-1 3-3 5-6 5-2 0-3-1-4-2-1 1-2 2-4 2-3 0-5-2-6-5z" />
    </svg>
  )
}

export function IconChair({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M5 9V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" />
      <rect x="3" y="9" width="18" height="6" rx="1.5" />
      <line x1="6" y1="15" x2="6" y2="20" />
      <line x1="18" y1="15" x2="18" y2="20" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  )
}

/* ═══ Tema Salão ═══ */

export function IconHairDryer({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M3 9h4l3-5h6l3 5h2a2 2 0 0 1 0 4h-2l-3 5h-6l-3-5H3a2 2 0 0 1 0-4z" />
      <circle cx="14" cy="11" r="2" />
    </svg>
  )
}

export function IconMirror({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <circle cx="12" cy="10" r="7" />
      <line x1="12" y1="17" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  )
}

export function IconBrush({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
      <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" />
    </svg>
  )
}

export function IconCalendarHeart({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M12 18l-2.5-2.5a1.8 1.8 0 0 1 2.5-2.5 1.8 1.8 0 0 1 2.5 2.5z" />
    </svg>
  )
}

/* ═══ Tema Estética ═══ */

export function IconSpa({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M12 22c-4.97 0-9-2.24-9-5v0c4.97 0 9 2.24 9 5z" />
      <path d="M12 22c4.97 0 9-2.24 9-5v0c-4.97 0-9 2.24-9 5z" />
      <path d="M12 22V12" />
      <path d="M12 12C12 7.03 9.76 3 7 3v0c0 4.97 2.24 9 5 9z" />
      <path d="M12 12c0-4.97 2.24-9 5-9v0c0 4.97-2.24 9-5 9z" />
    </svg>
  )
}

export function IconDroplet({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  )
}

export function IconSparkles({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 17l.7 2 2 .7-2 .7L5 22.4l-.7-2-2-.7 2-.7z" />
      <path d="M19 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
    </svg>
  )
}

export function IconFace({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
      <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
    </svg>
  )
}

/* ═══ Tema Nail ═══ */

export function IconNailPolish({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M7 11v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8" />
      <path d="M10 3h4v3h2l1 5H7l1-5h2V3z" />
    </svg>
  )
}

export function IconHand({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M18 11V6a2 2 0 0 0-4 0v0" />
      <path d="M14 10V4a2 2 0 0 0-4 0v6" />
      <path d="M10 10.5V3a2 2 0 0 0-4 0v10" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8H9a8 8 0 0 1-3-1" />
    </svg>
  )
}

export function IconPalette({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" stroke="none" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  )
}

export function IconCalendar({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

/* ═══ SmartAgenda — funcionais ═══ */

export function IconBrain({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M9 3a3 3 0 0 0-3 3v0a3 3 0 0 0-2 5 3 3 0 0 0 1 5 3 3 0 0 0 4 4h0a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3z" />
      <path d="M15 3a3 3 0 0 1 3 3v0a3 3 0 0 1 2 5 3 3 0 0 1-1 5 3 3 0 0 1-4 4h0a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z" />
    </svg>
  )
}

export function IconTrophy({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M6 4h12v6a6 6 0 0 1-12 0V4z" />
      <path d="M6 6H3v2a3 3 0 0 0 3 3" />
      <path d="M18 6h3v2a3 3 0 0 1-3 3" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="16" x2="12" y2="20" />
    </svg>
  )
}

export function IconBolt({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <polygon points="13 2 4 14 12 14 11 22 20 10 12 10 13 2" />
    </svg>
  )
}

export function IconLink({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
    </svg>
  )
}

export function IconCash({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <line x1="6" y1="9" x2="6" y2="9" />
      <line x1="18" y1="15" x2="18" y2="15" />
    </svg>
  )
}

export function IconPhone({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  )
}

export function IconClock24({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  )
}

export function IconGift({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <rect x="3" y="9" width="18" height="12" rx="1" />
      <line x1="3" y1="13" x2="21" y2="13" />
      <line x1="12" y1="9" x2="12" y2="21" />
      <path d="M12 9c-2 0-4-1-4-3s2-3 4 0c2-3 4-2 4 0s-2 3-4 3z" />
    </svg>
  )
}

/* ═══ UI / utilitários ═══ */

export function IconArrowRight({ size = 20, className, strokeWidth = 2.5 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

export function IconCheck({ size = 16, className, strokeWidth = 2.5 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function IconStar({ size = 16, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} fill="currentColor" stroke="currentColor" viewBox="0 0 24 24" width={size} height={size} className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

export function IconPin({ size = 18, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

export function IconContacts({ size = 24, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  )
}

export function IconSparkle({ size = 18, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2z" />
      <path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
    </svg>
  )
}

export function IconWhatsapp({ size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

export function IconMail({ size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}
