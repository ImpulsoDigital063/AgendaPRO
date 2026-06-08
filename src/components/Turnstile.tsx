'use client'

import { useEffect, useRef } from 'react'

/**
 * Cloudflare Turnstile (CAPTCHA grátis) pro cadastro.
 *
 * Rollout seguro: se NEXT_PUBLIC_TURNSTILE_SITE_KEY não estiver setada, o
 * componente não renderiza nada e o cadastro segue como antes. Assim dá pra
 * deployar o código antes de configurar as chaves, sem quebrar o cadastro.
 * Quando a key existir (+ redeploy), o widget aparece e passa a exigir token.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id?: string) => void
    }
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

export default function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)

  useEffect(() => {
    if (!SITE_KEY) return

    function render() {
      if (!ref.current || !window.turnstile || widgetId.current) return
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: SITE_KEY,
        callback: (token: string) => onToken(token),
        'error-callback': () => onToken(null),
        'expired-callback': () => onToken(null),
        theme: 'dark',
      })
    }

    if (window.turnstile) {
      render()
      return
    }

    let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (!script) {
      script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', render)
    // fallback: o script pode já estar carregando · poll curto até window.turnstile existir
    const interval = setInterval(() => {
      if (window.turnstile) {
        render()
        clearInterval(interval)
      }
    }, 200)
    return () => clearInterval(interval)
  }, [onToken])

  if (!SITE_KEY) return null
  return <div ref={ref} className="flex justify-center" />
}
