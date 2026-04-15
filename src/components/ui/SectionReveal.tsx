'use client'

import { useEffect, useRef, ReactNode } from 'react'

type SectionRevealProps = {
  children: ReactNode
  stagger?: boolean
  className?: string
  threshold?: number
  /** Re-trigger animation on exit/re-entry (default: false, one-shot) */
  once?: boolean
  as?: 'div' | 'section' | 'article' | 'header' | 'main' | 'ul'
}

/**
 * Componente wrapper que ativa a animação `.revealed` via IntersectionObserver
 * quando entra no viewport. Combina com as classes `.reveal` ou `.reveal-stagger` do globals.css.
 */
export function SectionReveal({
  children,
  stagger = false,
  className = '',
  threshold = 0.15,
  once = true,
  as = 'div',
}: SectionRevealProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            if (once) observer.unobserve(entry.target)
          } else if (!once) {
            entry.target.classList.remove('revealed')
          }
        }
      },
      { threshold, rootMargin: '0px 0px -80px 0px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, once])

  const Tag = as as any
  const baseClass = stagger ? 'reveal-stagger' : 'reveal'

  return (
    <Tag ref={ref} className={`${baseClass} ${className}`}>
      {children}
    </Tag>
  )
}
