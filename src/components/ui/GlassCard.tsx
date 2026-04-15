import { ReactNode, HTMLAttributes } from 'react'

type GlassCardProps = {
  children: ReactNode
  variant?: 'default' | 'strong' | 'glow'
  hover?: boolean
  className?: string
} & HTMLAttributes<HTMLDivElement>

export function GlassCard({
  children,
  variant = 'default',
  hover = true,
  className = '',
  ...rest
}: GlassCardProps) {
  const base =
    variant === 'strong' ? 'glass-strong' :
    variant === 'glow'   ? 'glass glow-border' :
                           'glass'

  const hoverClass = hover ? 'hover:-translate-y-1 hover:shadow-xl' : ''

  return (
    <div className={`${base} ${hoverClass} ${className}`} {...rest}>
      {children}
    </div>
  )
}
