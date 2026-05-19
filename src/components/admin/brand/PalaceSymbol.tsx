/**
 * Símbolo isolado da logo Palace Nail Spa (ogiva árabe com P caligráfico).
 * Usado como marcador, favicon-fallback, decoração de canto.
 *
 * Cor herda do currentColor — se quiser dourado, envolve em <span style={{color: '#C9A87C'}}>.
 */

type Props = {
  size?: number
  className?: string
  style?: React.CSSProperties
  strokeWidth?: number
  ariaHidden?: boolean
}

export default function PalaceSymbol({
  size = 32,
  className,
  style,
  strokeWidth = 3.5,
  ariaHidden = true,
}: Props) {
  return (
    <svg
      width={size}
      height={size * (280 / 200)}
      viewBox="0 0 200 280"
      fill="none"
      className={className}
      style={style}
      aria-hidden={ariaHidden}
    >
      <path
        d="M 100 10 C 60 30, 30 80, 30 140 C 30 200, 70 250, 100 270 C 130 250, 170 200, 170 140 C 170 80, 140 30, 100 10 Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <path
        d="M 82 95 L 82 215 M 82 95 C 100 95, 130 100, 130 130 C 130 165, 95 168, 82 165"
        stroke="currentColor"
        strokeWidth={strokeWidth + 1}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 96 110 Q 75 145, 95 175 Q 115 200, 92 213"
        stroke="currentColor"
        strokeWidth={strokeWidth - 1}
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  )
}
