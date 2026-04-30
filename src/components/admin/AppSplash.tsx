'use client'

import { useEffect, useState } from 'react'

type Phase = 'visible' | 'fading' | 'gone'

/**
 * Splash interno estilo Facebook/Instagram — aparece logo apos o iOS
 * encerrar a apple-touch-startup-image, mantendo continuidade visual
 * com o icone PRO da tela inicial. Some apos ~600ms.
 *
 * Mostra apenas em PWA standalone (display-mode: standalone) e somente
 * uma vez por sessao (sessionStorage). Nao incomoda em navegacao
 * interna /admin -> /admin/configuracoes etc.
 *
 * Truque de percepcao: durante esses 600ms, as queries Supabase do
 * server component rodam em background. Quando a splash some, o
 * dashboard ja esta pronto (ou com skeleton bem proximo do final).
 */
function readInitialPhase(): Phase {
  if (typeof window === 'undefined') return 'gone' // SSR: nao renderiza splash
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  const alreadyShown = sessionStorage.getItem('agendapro-splash-shown')
  return isStandalone && !alreadyShown ? 'visible' : 'gone'
}

export default function AppSplash() {
  const [phase, setPhase] = useState<Phase>(readInitialPhase)

  useEffect(() => {
    if (phase !== 'visible') return
    sessionStorage.setItem('agendapro-splash-shown', '1')

    // 400ms visible (com pop animation) + 200ms fade-out = 600ms total
    const fadeTimer = setTimeout(() => setPhase('fading'), 400)
    const goneTimer = setTimeout(() => setPhase('gone'), 600)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(goneTimer)
    }
  }, [phase])

  if (phase === 'gone') return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        background: '#030510',
        opacity: phase === 'fading' ? 0 : 1,
        transition: 'opacity 200ms ease-out',
        pointerEvents: phase === 'fading' ? 'none' : 'auto',
      }}
    >
      <div
        style={{
          width: 132,
          height: 132,
          background:
            'linear-gradient(135deg, #3B82F6 0%, #6366F1 50%, #8B5CF6 100%)',
          borderRadius: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 46,
          fontWeight: 800,
          letterSpacing: -2,
          boxShadow: '0 30px 60px rgba(59,130,246,0.5)',
          animation: 'agendaproSplashPop 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        PRO
      </div>
      <style>{`
        @keyframes agendaproSplashPop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
