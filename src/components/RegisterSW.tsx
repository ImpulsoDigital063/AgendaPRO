'use client'

import { useEffect } from 'react'

/**
 * Registra o service worker (/sw.js) no primeiro mount. Renderiza nada —
 * efeito puro, executa uma vez por sessao.
 *
 * Falhas sao silenciosas (a maioria das causas e benignas: navegador
 * nao suporta SW, modo privado, etc). Nao queremos quebrar a UI por
 * causa disso.
 */
export default function RegisterSW() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    // Atrasa um tick pra nao competir com first paint — SW registration
    // nao e critico pro tempo ate interativo
    const timer = setTimeout(() => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => {
          // Silencioso: SW e progressive enhancement, nao bloqueante
        })
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  return null
}
