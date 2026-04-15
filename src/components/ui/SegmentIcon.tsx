type SegmentIconProps = {
  segment: 'barbearia' | 'salao' | 'estetica' | 'nail'
  size?: number
  className?: string
}

/**
 * Ícones SVG custom por segmento. Inspirados mas distintos de icon-libs comuns.
 * Stroke usa `currentColor` pra respeitar o gradient do card pai.
 */
export function SegmentIcon({ segment, size = 40, className = '' }: SegmentIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 48 48',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  }

  switch (segment) {
    case 'barbearia':
      // Tesoura + navalha estilizada
      return (
        <svg {...common} aria-label="Barbearia">
          <circle cx="10" cy="34" r="4" />
          <circle cx="10" cy="14" r="4" />
          <path d="M14 16l24 22" />
          <path d="M14 32l24 -22" />
          <path d="M30 22l8 -2" />
          <path d="M30 26l8 2" />
        </svg>
      )
    case 'salao':
      // Secador de cabelo
      return (
        <svg {...common} aria-label="Salão">
          <path d="M8 18c0 -4 3 -8 10 -8h10c5 0 8 2 8 6v4c0 4 -3 6 -8 6h-10c-7 0 -10 -4 -10 -8z" />
          <path d="M26 22v8l4 6h4" />
          <circle cx="16" cy="20" r="2" />
          <path d="M38 16l4 -4" />
          <path d="M38 28l4 4" />
        </svg>
      )
    case 'estetica':
      // Gota + folha (spa/estética)
      return (
        <svg {...common} aria-label="Estética">
          <path d="M24 6c-6 8 -10 14 -10 20a10 10 0 0 0 20 0c0 -6 -4 -12 -10 -20z" />
          <path d="M24 34c2 -4 6 -6 10 -6" />
          <path d="M24 34c-2 -4 -6 -6 -10 -6" />
        </svg>
      )
    case 'nail':
      // Esmalte (garrafa)
      return (
        <svg {...common} aria-label="Nail">
          <path d="M20 8h8v4h2v4h-12v-4h2z" />
          <path d="M18 16h12v20a4 4 0 0 1 -4 4h-4a4 4 0 0 1 -4 -4z" />
          <path d="M22 22h4" />
          <path d="M22 28h4" />
        </svg>
      )
  }
}
