'use client'

import { useEffect, useState } from 'react'

type Platform = 'ios' | 'android' | null

function IOSGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-end" onClick={onClose}>
      <div className="bg-white w-full max-w-lg mx-auto rounded-t-3xl p-6 pb-10 animate-slideUp" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Instalar no iPhone</h2>
            <p className="text-xs text-gray-400">Use o Safari para seguir os passos</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {/* Passo 1 */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              <p className="font-semibold text-gray-900 text-sm">Toque no botão compartilhar</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-3 text-gray-300">
                  <span className="text-lg">&lsaquo;</span>
                  <span className="text-lg">&rsaquo;</span>
                </div>
                <div className="flex-1 mx-3 bg-gray-100 rounded-lg px-3 py-1.5 text-xs text-gray-400 truncate">
                  agenda-pro-seven.vercel.app
                </div>
                <div className="relative">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center animate-pulse shadow-lg shadow-blue-500/30">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">aqui</span>
                    <span className="text-blue-500 text-sm leading-none">&#9660;</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Passo 2 */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              <p className="font-semibold text-gray-900 text-sm">Role e toque em &quot;Adicionar à Tela de Inicio&quot;</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {['Copiar', 'Favoritos'].map((item) => (
                <div key={item} className="px-4 py-2.5 border-b border-gray-100 text-sm text-gray-400 flex items-center gap-3">
                  <div className="w-6 h-6 bg-gray-100 rounded-lg" />
                  {item}
                </div>
              ))}
              <div className="px-4 py-2.5 bg-blue-50 text-sm font-bold text-blue-600 flex items-center gap-3 border-l-4 border-blue-500">
                <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </div>
                Adicionar à Tela de Inicio
              </div>
            </div>
          </div>

          {/* Passo 3 */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
              <p className="font-semibold text-gray-900 text-sm">Toque em <span className="text-blue-600 font-bold">&quot;Adicionar&quot;</span> no canto superior direito</p>
            </div>
          </div>
        </div>

        <button onClick={onClose} className="w-full mt-5 bg-blue-500 text-white py-3.5 rounded-2xl font-semibold text-sm active:scale-[0.98] transition-transform">
          Entendi!
        </button>
      </div>
    </div>
  )
}

function AndroidGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-end" onClick={onClose}>
      <div className="bg-white w-full max-w-lg mx-auto rounded-t-3xl p-6 pb-10 animate-slideUp" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Instalar no Android</h2>
            <p className="text-xs text-gray-400">Use o Chrome para seguir os passos</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {/* Passo 1 */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              <p className="font-semibold text-gray-900 text-sm">Toque nos <span className="font-bold">3 pontinhos</span> (canto superior)</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 bg-gray-100 rounded-lg px-3 py-1.5 text-xs text-gray-400 truncate mr-3">
                  agenda-pro-seven.vercel.app
                </div>
                <div className="relative">
                  <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center animate-pulse shadow-lg shadow-green-500/30">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="0">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </div>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">aqui</span>
                    <span className="text-green-500 text-sm leading-none">&#9660;</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Passo 2 */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              <p className="font-semibold text-gray-900 text-sm">Toque em &quot;Adicionar à tela inicial&quot;</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {['Nova aba', 'Favoritos'].map((item) => (
                <div key={item} className="px-4 py-2.5 border-b border-gray-100 text-sm text-gray-400 flex items-center gap-3">
                  <div className="w-5 h-5 bg-gray-100 rounded" />
                  {item}
                </div>
              ))}
              <div className="px-4 py-2.5 bg-green-50 text-sm font-bold text-green-700 flex items-center gap-3 border-l-4 border-green-500">
                <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </div>
                Adicionar à tela inicial
              </div>
            </div>
          </div>

          {/* Passo 3 */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
              <p className="font-semibold text-gray-900 text-sm">Toque em <span className="text-green-600 font-bold">&quot;Adicionar&quot;</span> para confirmar</p>
            </div>
          </div>
        </div>

        <button onClick={onClose} className="w-full mt-5 bg-green-500 text-white py-3.5 rounded-2xl font-semibold text-sm active:scale-[0.98] transition-transform">
          Entendi!
        </button>
      </div>
    </div>
  )
}

export default function InstallBanner() {
  const [platform, setPlatform] = useState<Platform>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void } | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isStandalone, setIsStandalone] = useState(true) // default true to avoid flash

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true

    setIsStandalone(standalone)
    if (standalone) return
    if (localStorage.getItem('install-banner-dismissed')) return

    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
    const isAndroid = /Android/.test(ua)

    if (isIOS) setPlatform('ios')
    else if (isAndroid) setPlatform('android')

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as Event & { prompt: () => void })
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function handleDismiss() {
    localStorage.setItem('install-banner-dismissed', '1')
    setDismissed(true)
  }

  async function handleAndroidInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    setDismissed(true)
  }

  if (isStandalone || dismissed || !platform) return null

  const isIOS = platform === 'ios'
  const accentColor = isIOS ? '#3b82f6' : '#16a34a'
  const accentBg = isIOS ? 'rgba(59,130,246,0.12)' : 'rgba(22,163,106,0.12)'

  return (
    <>
      <div className="mx-4 mt-3 rounded-2xl overflow-hidden" style={{ border: `1px solid ${accentColor}30` }}>
        {/* Main banner */}
        <div
          className="px-4 py-3.5 flex items-center gap-3"
          style={{ background: accentBg }}
        >
          {/* App icon */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: accentColor }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
              Instalar AgendaPRO
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
              {isIOS
                ? 'Acesse como app direto do seu iPhone'
                : 'Acesse como app direto do celular'}
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"
            aria-label="Fechar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Action buttons */}
        <div
          className="px-4 py-3 flex gap-2"
          style={{
            background: 'var(--admin-surface)',
            borderTop: `1px solid ${accentColor}20`,
          }}
        >
          {platform === 'android' && deferredPrompt ? (
            <button
              onClick={handleAndroidInstall}
              className="flex-1 text-white text-sm font-bold py-2.5 rounded-xl active:scale-[0.98] transition-transform"
              style={{ background: accentColor }}
            >
              Instalar agora
            </button>
          ) : (
            <button
              onClick={() => setShowGuide(true)}
              className="flex-1 text-white text-sm font-bold py-2.5 rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              style={{ background: accentColor }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              Ver como instalar
            </button>
          )}
          {platform === 'android' && deferredPrompt && (
            <button
              onClick={() => setShowGuide(true)}
              className="text-xs font-semibold px-3 py-2.5 rounded-xl"
              style={{ color: accentColor, background: accentBg }}
            >
              Ajuda
            </button>
          )}
        </div>
      </div>

      {showGuide && platform === 'ios' && <IOSGuide onClose={() => setShowGuide(false)} />}
      {showGuide && platform === 'android' && <AndroidGuide onClose={() => setShowGuide(false)} />}

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
