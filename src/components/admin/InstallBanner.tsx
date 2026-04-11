'use client'

import { useEffect, useState } from 'react'

type Platform = 'ios' | 'android' | 'other' | null

export default function InstallBanner() {
  const [platform, setPlatform] = useState<Platform>(null)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void } | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Já está instalado como app — não mostra nada
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true

    if (isStandalone) return

    // Já dispensou antes nessa sessão
    if (sessionStorage.getItem('install-dismissed')) return

    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
    const isAndroid = /Android/.test(ua)

    if (isIOS) setPlatform('ios')
    else if (isAndroid) setPlatform('android')
    else setPlatform('other')

    // Android: captura o evento de instalação nativo
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as Event & { prompt: () => void })
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function handleDismiss() {
    sessionStorage.setItem('install-dismissed', '1')
    setDismissed(true)
  }

  async function handleAndroidInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    setDismissed(true)
  }

  if (dismissed || !platform) return null

  // Android com prompt nativo disponível
  if (platform === 'android' && deferredPrompt) {
    return (
      <div className="mx-4 mt-3 bg-gray-900 text-white rounded-2xl px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Instalar AgendaPRO</p>
          <p className="text-xs text-gray-400">Acesse direto pela tela inicial</p>
        </div>
        <div className="flex gap-2 ml-3">
          <button
            onClick={handleAndroidInstall}
            className="bg-white text-gray-900 text-xs font-bold px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors whitespace-nowrap"
          >
            Instalar
          </button>
          <button onClick={handleDismiss} className="text-gray-500 text-lg leading-none px-1">×</button>
        </div>
      </div>
    )
  }

  // iOS — mostra guia visual
  if (platform === 'ios') {
    return (
      <>
        <div className="mx-4 mt-3 bg-gray-900 text-white rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Instalar AgendaPRO</p>
            <p className="text-xs text-gray-400">Adicione à tela inicial do iPhone</p>
          </div>
          <div className="flex gap-2 ml-3">
            <button
              onClick={() => setShowIOSGuide(true)}
              className="bg-white text-gray-900 text-xs font-bold px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              Ver como
            </button>
            <button onClick={handleDismiss} className="text-gray-500 text-lg leading-none px-1">×</button>
          </div>
        </div>

        {/* Modal com instruções iOS */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] bg-black/60 flex items-end" onClick={() => setShowIOSGuide(false)}>
            <div
              className="bg-white w-full rounded-t-3xl p-6 pb-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
              <h2 className="text-lg font-bold text-gray-900 mb-1">Instalar no iPhone</h2>
              <p className="text-sm text-gray-500 mb-6">3 passos simples no Safari</p>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    {/* Share icon */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Toque em Compartilhar</p>
                    <p className="text-xs text-gray-400">O ícone de seta pra cima na barra do Safari</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Adicionar à Tela de Início</p>
                    <p className="text-xs text-gray-400">Role o menu e toque nessa opção</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Toque em Adicionar</p>
                    <p className="text-xs text-gray-400">O ícone aparece na sua tela inicial</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full bg-gray-900 text-white py-3.5 rounded-2xl font-semibold text-sm"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  return null
}
