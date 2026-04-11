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
          <div className="fixed inset-0 z-[100] bg-black/70 flex items-end" onClick={() => setShowIOSGuide(false)}>
            <div
              className="bg-white w-full rounded-t-3xl p-6 pb-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
              <h2 className="text-lg font-bold text-gray-900 mb-1">Instalar no iPhone</h2>
              <p className="text-sm text-gray-400 mb-5">Siga os passos abaixo no Safari</p>

              {/* Passo 1 — ilustração da barra do Safari */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                  <p className="font-semibold text-gray-900 text-sm">Toque no botão de compartilhar</p>
                </div>
                {/* Ilustração barra Safari */}
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 text-gray-300">
                      <span className="text-lg">‹</span>
                      <span className="text-lg">›</span>
                    </div>
                    <div className="flex-1 mx-3 bg-gray-100 rounded-lg px-3 py-1.5 text-xs text-gray-400 truncate">
                      agenda-pro-seven.vercel.app
                    </div>
                    {/* Share button destacado */}
                    <div className="relative">
                      <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center animate-pulse">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                          <polyline points="16 6 12 2 8 6" />
                          <line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                      </div>
                      {/* Seta apontando */}
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <span className="text-blue-500 text-xs font-bold whitespace-nowrap">toque aqui</span>
                        <span className="text-blue-500 text-sm">↓</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Passo 2 */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                  <p className="font-semibold text-gray-900 text-sm">Role e toque em "Adicionar à Tela de Início"</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Simulação do menu do Safari */}
                  {['Copiar', 'Favoritos', 'Ler mais tarde'].map((item) => (
                    <div key={item} className="px-4 py-2.5 border-b border-gray-100 text-sm text-gray-400 flex items-center gap-3">
                      <div className="w-7 h-7 bg-gray-100 rounded-lg" />
                      {item}
                    </div>
                  ))}
                  <div className="px-4 py-2.5 bg-blue-50 text-sm font-semibold text-blue-600 flex items-center gap-3 border-l-4 border-blue-500">
                    <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                    </div>
                    Adicionar à Tela de Início ← este
                  </div>
                </div>
              </div>

              {/* Passo 3 */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                  <p className="font-semibold text-gray-900 text-sm">Toque em <span className="text-blue-600">"Adicionar"</span> no canto superior direito</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full bg-gray-900 text-white py-3.5 rounded-2xl font-semibold text-sm"
              >
                Entendi, vou instalar agora
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  return null
}
