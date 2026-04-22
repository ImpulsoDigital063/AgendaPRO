'use client'

import { useEffect, useState } from 'react'
import { IconAlert, IconClose, IconGift } from '@/components/ui/Icon'

const STORAGE_KEY = 'agp-garantia-dismissed'

/**
 * Banner mostrado durante a janela de garantia (7 dias pós-pagamento).
 * Some automaticamente quando a janela acaba.
 *
 * Pode ser dispensado pelo dono. Mas se entrar em modo urgent (≤2 dias),
 * volta a aparecer mesmo que tenha sido dispensado antes — alerta crítico.
 */
export default function GarantiaBanner({ daysLeft }: { daysLeft: number }) {
  const urgent = daysLeft <= 2
  const [hidden, setHidden] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    // Se urgent, só esconde se já dismissou DEPOIS de virar urgent
    if (urgent) {
      if (stored === 'urgent') setHidden(true)
    } else {
      if (stored) setHidden(true)
    }
    setMounted(true)
  }, [urgent])

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, urgent ? 'urgent' : 'normal')
    setHidden(true)
  }

  if (daysLeft <= 0) return null
  if (!mounted) return null
  if (hidden) return null

  return (
    <div
      className="w-full px-4 py-2.5 text-center text-xs font-semibold inline-flex items-center justify-center gap-2 relative"
      style={
        urgent
          ? {
              background:
                'linear-gradient(90deg, #B91C1C 0%, #DC2626 40%, #EF4444 60%, #DC2626 100%)',
              color: '#FFF5F5',
              boxShadow: '0 6px 20px -10px rgba(220, 38, 38, 0.7)',
              textShadow: '0 1px 0 rgba(0,0,0,0.15)',
            }
          : {
              background:
                'linear-gradient(90deg, #047857 0%, #10B981 45%, #34D399 60%, #10B981 100%)',
              color: '#022C22',
              boxShadow: '0 6px 20px -10px rgba(16, 185, 129, 0.55)',
              textShadow: '0 1px 0 rgba(255,255,255,0.15)',
            }
      }
    >
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded-full"
        style={{
          background: 'rgba(255,255,255,0.2)',
          backdropFilter: 'blur(4px)',
        }}
      >
        {urgent ? <IconAlert size={12} /> : <IconGift size={12} />}
      </span>
      {urgent
        ? `Garantia termina em ${daysLeft} dia${daysLeft === 1 ? '' : 's'}. Se quiser reembolso, fala com a gente agora.`
        : `Garantia ativa — ${daysLeft} dias restantes pra pedir reembolso sem burocracia.`}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Fechar aviso"
        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-6 h-6 rounded-full transition-opacity hover:opacity-100 opacity-70"
        style={{ color: 'inherit' }}
      >
        <IconClose size={12} />
      </button>
    </div>
  )
}
