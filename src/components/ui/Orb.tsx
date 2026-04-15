type OrbProps = {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  style?: React.CSSProperties
  delay?: number
  className?: string
}

/**
 * Orb flutuante com blur pesado — usado no fundo do hero para dar o "brilho nos olhos".
 * Posicione absoluto e passe `style={{ top, left }}` para ancorar.
 */
export function Orb({
  size = 'md',
  color = '#3B82F6',
  style,
  delay = 0,
  className = '',
}: OrbProps) {
  const sizeClass = size === 'lg' ? 'orb-lg' : size === 'sm' ? 'orb-sm' : 'orb-md'
  return (
    <div
      className={`orb ${sizeClass} ${className}`}
      style={{
        background: color,
        animationDelay: `${delay}s`,
        ...style,
      }}
      aria-hidden="true"
    />
  )
}
