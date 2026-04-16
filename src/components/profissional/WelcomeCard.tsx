'use client'

import { useState, useEffect } from 'react'

export default function WelcomeCard({ professionalName }: { professionalName: string }) {
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('prof-welcome-dismissed')) {
      setDismissed(true)
    }
    setMounted(true)
  }, [])

  if (!mounted || dismissed) return null

  function handleDismiss() {
    localStorage.setItem('prof-welcome-dismissed', '1')
    setDismissed(true)
  }

  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(6,182,212,0.10) 100%)',
        border: '1px solid rgba(16,185,129,0.25)',
      }}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
        style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--admin-text-faded)' }}
        aria-label="Fechar"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--admin-text)' }}>
        Bem-vindo, {professionalName}!
      </h2>

      <div className="space-y-3 text-sm" style={{ color: 'var(--admin-text-mute)' }}>
        <div className="flex items-start gap-3">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{ background: 'rgba(16,185,129,0.2)', color: '#10B981' }}
          >
            1
          </span>
          <div>
            <p className="font-semibold" style={{ color: 'var(--admin-text)' }}>Instale na tela inicial</p>
            <p>Se apareceu o banner acima, toque em "Ver como" para fixar o AgendaPRO no seu celular como um app.</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{ background: 'rgba(16,185,129,0.2)', color: '#10B981' }}
          >
            2
          </span>
          <div>
            <p className="font-semibold" style={{ color: 'var(--admin-text)' }}>Sua agenda aqui</p>
            <p>Os agendamentos dos seus clientes aparecem automaticamente. Você pode confirmar ou cancelar direto daqui.</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{ background: 'rgba(16,185,129,0.2)', color: '#10B981' }}
          >
            3
          </span>
          <div>
            <p className="font-semibold" style={{ color: 'var(--admin-text)' }}>Financeiro</p>
            <p>No menu inferior, toque em "Financeiro" para ver seu faturamento e comissão.</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{ background: 'rgba(16,185,129,0.2)', color: '#10B981' }}
          >
            4
          </span>
          <div>
            <p className="font-semibold" style={{ color: 'var(--admin-text)' }}>Conta</p>
            <p>Em "Conta" você pode alterar sua senha a qualquer momento.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
