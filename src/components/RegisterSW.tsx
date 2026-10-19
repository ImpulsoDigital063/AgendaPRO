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

    /* Em desenvolvimento NÃO registra (mesma regra do AtualizadorPWA): o sw.js
       guarda os chunks de /_next/static e o navegador seguia mostrando a versão
       velha da página mesmo com o código novo (18/10, LP /clinicas). E desregistra
       o que ficou de antes. Em produção nada muda. */
    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker
        .getRegistrations()
        .then((rs) => Promise.all(rs.map((r) => r.unregister())))
        .then(() => (typeof caches !== 'undefined' ? caches.keys() : []))
        .then((chaves) => Promise.all((chaves as string[]).map((c) => caches.delete(c))))
        .catch(() => null)
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
