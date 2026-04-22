'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  value: number
  duration?: number
  format?: (n: number) => string
  className?: string
  style?: React.CSSProperties
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export default function CountUp({ value, duration = 700, format, className, style }: Props) {
  const [display, setDisplay] = useState(0)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) {
      setDisplay(value)
      return
    }
    startedRef.current = true

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      return
    }

    let raf = 0
    const start = performance.now()
    const from = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = easeOutCubic(progress)
      setDisplay(Math.round(from + (value - from) * eased))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return (
    <span className={className} style={style}>
      {format ? format(display) : display}
    </span>
  )
}
