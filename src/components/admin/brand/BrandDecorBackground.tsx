/**
 * BrandDecorBackground · decoração sutil de fundo usando símbolo da marca.
 *
 * Renderiza o símbolo do business em opacity baixa, posicionado fora do
 * fluxo visual principal (canto superior direito ou centro). Universal:
 * qualquer business pode usar (default usa AgendaPRO sigil).
 *
 * Patterns disponíveis:
 * - 'corner': símbolo grande no canto superior direito (default · hero)
 * - 'centered': símbolo gigante centralizado atrás do conteúdo (login · splash)
 * - 'scatter': múltiplos símbolos em grade sutil (pattern de fundo geral)
 *
 * Cor herda do `--brand-primary` por default (pode override via prop).
 */

import PalaceSymbol from './PalaceSymbol'

type Pattern = 'corner' | 'centered' | 'scatter'

type Props = {
  pattern?: Pattern
  /** Override de cor · default usa --brand-primary do CSS var */
  color?: string
  /** Override de opacity · default por pattern */
  opacity?: number
  /** Slug do business pra escolher símbolo customizado · 'palace-nail-spa' usa o símbolo Palace */
  brand?: string
}

export default function BrandDecorBackground({
  pattern = 'corner',
  color,
  opacity,
  brand,
}: Props) {
  // Atualmente só temos símbolo customizado pra Palace. Outros businesses
  // veem decoração genérica via CSS vars (sem símbolo específico).
  const useSymbol = brand === 'palace-nail-spa'
  if (!useSymbol) return null

  const finalColor = color ?? 'var(--brand-primary, var(--admin-accent))'

  if (pattern === 'centered') {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 flex items-center justify-center z-0"
        style={{ color: finalColor, opacity: opacity ?? 0.04 }}
      >
        <PalaceSymbol size={600} strokeWidth={2} />
      </div>
    )
  }

  if (pattern === 'scatter') {
    // Pattern via SVG inline · escalável e leve. Repete o símbolo em grade
    // diagonal pra criar textura premium sem virar carpete.
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden z-0"
        style={{ color: finalColor, opacity: opacity ?? 0.035 }}
      >
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <pattern id="palace-pattern" x="0" y="0" width="220" height="280" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
              <g transform="translate(60, 40) scale(0.4)">
                <path d="M 100 10 C 60 30, 30 80, 30 140 C 30 200, 70 250, 100 270 C 130 250, 170 200, 170 140 C 170 80, 140 30, 100 10 Z" stroke="currentColor" strokeWidth="3.5" fill="none" />
                <path d="M 82 95 L 82 215 M 82 95 C 100 95, 130 100, 130 130 C 130 165, 95 168, 82 165" stroke="currentColor" strokeWidth="4.5" fill="none" strokeLinecap="round" />
              </g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#palace-pattern)" />
        </svg>
      </div>
    )
  }

  // Default · corner
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-0"
      style={{
        color: finalColor,
        opacity: opacity ?? 0.07,
        top: -40,
        right: -80,
      }}
    >
      <PalaceSymbol size={320} strokeWidth={2.5} />
    </div>
  )
}
