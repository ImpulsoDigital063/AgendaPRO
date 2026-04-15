'use client'

import { Orb } from './Orb'

type AnimatedGradientProps = {
  /** extra content (e.g. particles, grids) rendered above the gradient */
  children?: React.ReactNode
}

/**
 * Fundo animado completo pro hero: mesh gradient + grid pattern + orbs flutuantes.
 * Use em container com `position: relative` + `overflow: hidden`.
 */
export function AnimatedGradient({ children }: AnimatedGradientProps) {
  return (
    <div className="hero-bg">
      {/* Orbs — ficam por cima do gradient mesh, atrás do conteúdo */}
      <Orb size="lg" color="#1E40AF" style={{ top: '-10%', left: '-8%' }} delay={0} />
      <Orb size="md" color="#06B6D4" style={{ top: '20%', right: '-5%' }} delay={3} />
      <Orb size="sm" color="#8B5CF6" style={{ bottom: '10%', left: '30%' }} delay={6} />
      <Orb size="md" color="#3B82F6" style={{ bottom: '-10%', right: '25%' }} delay={9} />
      {children}
    </div>
  )
}
