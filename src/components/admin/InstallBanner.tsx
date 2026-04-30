'use client'

import { useEffect, useState } from 'react'

type Platform = 'ios' | 'android' | null

/**
 * Seta animada flutuando sobre o modal — aponta pro icone real do
 * navegador (canto superior direito da barra de endereco):
 *   iOS Safari:    icone de compartilhar (quadrado com seta pra cima)
 *   Android Chrome: 3 pontinhos verticais (menu)
 *
 * Reforca o passo 1 pra usuarios leigos: alem do mockup dentro do modal,
 * uma seta REAL na tela mostra exatamente onde tocar.
 */
function BrowserMenuArrow({ platform }: { platform: 'ios' | 'android' }) {
  const label = platform === 'ios' ? 'compartilhar' : '3 pontinhos'

  return (
    <div
      className="fixed pointer-events-none z-[101] install-anim-arrow-float flex flex-col items-center"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + 56px)',
        right: '6px',
      }}
    >
      {/* Seta diagonal arrow-up-right (estilo Lucide) — clean, universal, ponta apontando pro icone */}
      <svg
        width="72"
        height="72"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--brand-primary)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          filter:
            'drop-shadow(0 4px 12px color-mix(in srgb, var(--brand-primary) 60%, transparent))',
        }}
      >
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
      </svg>
      <span
        className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap -mt-1"
        style={{
          background: 'var(--brand-primary)',
          color: 'white',
          boxShadow:
            '0 6px 16px -2px color-mix(in srgb, var(--brand-primary) 50%, transparent)',
        }}
      >
        {label}
      </span>
    </div>
  )
}

function GuideSheet({
  platform,
  onClose,
}: {
  platform: 'ios' | 'android'
  onClose: () => void
}) {
  const isIOS = platform === 'ios'

  return (
    <>
      {/* Seta flutuante apontando pro icone real do navegador (iOS + Android) */}
      <BrowserMenuArrow platform={platform} />
      <div className="fixed inset-0 z-[100] bg-black/70 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-auto rounded-t-3xl p-6 pb-10 animate-slideUp"
        style={{
          background: 'var(--admin-bg)',
          borderTop: '1px solid var(--admin-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-10 h-1 rounded-full mx-auto mb-5"
          style={{ background: 'var(--admin-border-hi)' }}
        />

        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--brand-primary) 18%, transparent)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--admin-text)' }}>
              {isIOS ? 'Instalar no iPhone' : 'Instalar no Android'}
            </h2>
            <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
              {isIOS ? 'Abra esta página no Safari' : 'Abra esta página no Chrome'}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {/* Passo 1 — toque compartilhar (iOS) ou 3 pontinhos (Android) */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--brand-primary)' }}
              >
                1
              </span>
              <p className="font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>
                {isIOS
                  ? 'Toque no botão compartilhar'
                  : 'Toque nos 3 pontinhos no canto superior'}
              </p>
            </div>
            <div
              className="rounded-xl p-3"
              style={{
                background: 'var(--admin-surface-hi)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <div className="flex items-center justify-between">
                {isIOS && (
                  <div className="flex gap-3" style={{ color: 'var(--admin-text-faded)' }}>
                    <span className="text-lg">&lsaquo;</span>
                    <span className="text-lg">&rsaquo;</span>
                  </div>
                )}
                <div
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs truncate ${isIOS ? 'mx-3' : 'mr-3'}`}
                  style={{ background: 'var(--admin-surface)', color: 'var(--admin-text-faded)' }}
                >
                  agendapro.net.br
                </div>
                <div className="relative">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse"
                    style={{
                      background: 'var(--brand-primary)',
                      boxShadow: '0 8px 16px -4px color-mix(in srgb, var(--brand-primary) 40%, transparent)',
                    }}
                  >
                    {isIOS ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                        <polyline points="16 6 12 2 8 6" />
                        <line x1="12" y1="2" x2="12" y2="15" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="0">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    )}
                  </div>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span
                      className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: 'var(--brand-primary)' }}
                    >
                      aqui
                    </span>
                    <span className="text-sm leading-none" style={{ color: 'var(--brand-primary)' }}>
                      &#9660;
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Passo 2 — fundido (antes era 2 + 3): role, toque "Adicionar" e confirme */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--brand-primary)' }}
              >
                2
              </span>
              <p className="font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>
                Toque em &quot;Adicionar à Tela de Início&quot; e confirme
              </p>
            </div>
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: 'var(--admin-surface-hi)',
                border: '1px solid var(--admin-border)',
              }}
            >
              {[isIOS ? 'Copiar' : 'Nova aba', 'Favoritos'].map((item) => (
                <div
                  key={item}
                  className="px-4 py-2.5 text-sm flex items-center gap-3"
                  style={{
                    color: 'var(--admin-text-faded)',
                    borderBottom: '1px solid var(--admin-border)',
                  }}
                >
                  <div className="w-5 h-5 rounded" style={{ background: 'var(--admin-surface)' }} />
                  {item}
                </div>
              ))}
              <div
                className="px-4 py-2.5 text-sm font-bold flex items-center gap-3"
                style={{
                  background: 'color-mix(in srgb, var(--brand-primary) 14%, transparent)',
                  color: 'var(--brand-primary)',
                  borderLeft: '4px solid var(--brand-primary)',
                }}
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{ background: 'color-mix(in srgb, var(--brand-primary) 22%, transparent)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </div>
                Adicionar à Tela de Início
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 text-white py-3.5 rounded-2xl font-semibold text-sm active:scale-[0.98] transition-transform"
          style={{ background: 'var(--brand-primary)' }}
        >
          Entendi!
        </button>
      </div>
    </div>
    </>
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

    // Dispensa expira em 30 dias — reaparece depois pra dar nova chance de instalar
    const dismissedAt = localStorage.getItem('install-banner-dismissed-at')
    if (dismissedAt) {
      const diasDispensado = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24)
      if (diasDispensado < 30) return
      localStorage.removeItem('install-banner-dismissed-at')
    }
    // Limpa flag legada eterna (de versões anteriores) pra desbloquear quem dispensou antes
    localStorage.removeItem('install-banner-dismissed')

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
    localStorage.setItem('install-banner-dismissed-at', String(Date.now()))
    setDismissed(true)
  }

  async function handleAndroidInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    setDismissed(true)
  }

  if (isStandalone || dismissed || !platform) return null

  return (
    <>
      <div
        className="mx-4 mt-3 rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--admin-border)' }}
      >
        <div
          className="px-4 py-3.5 flex items-center gap-3"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 18%, var(--admin-surface)) 0%, color-mix(in srgb, var(--brand-primary) 8%, var(--admin-surface)) 100%)',
          }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'var(--brand-primary)',
              boxShadow: '0 4px 12px -2px color-mix(in srgb, var(--brand-primary) 40%, transparent)',
            }}
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
              1 toque pra abrir — sem precisar lembrar o site
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 flex-shrink-0"
            style={{ color: 'var(--admin-text-faded)' }}
            aria-label="Fechar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div
          className="px-4 py-3 flex gap-2"
          style={{
            background: 'var(--admin-surface)',
            borderTop: '1px solid var(--admin-border)',
          }}
        >
          {platform === 'android' && deferredPrompt ? (
            <>
              <button
                onClick={handleAndroidInstall}
                className="flex-1 text-white text-sm font-bold py-2.5 rounded-xl active:scale-[0.98] transition-transform"
                style={{ background: 'var(--brand-primary)' }}
              >
                Instalar agora
              </button>
              <button
                onClick={() => setShowGuide(true)}
                className="text-xs font-semibold px-3 py-2.5 rounded-xl"
                style={{
                  color: 'var(--brand-primary)',
                  background: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)',
                }}
              >
                Ajuda
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowGuide(true)}
              className="flex-1 text-white text-sm font-bold py-2.5 rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              style={{ background: 'var(--brand-primary)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              Ver como instalar
            </button>
          )}
        </div>
      </div>

      {showGuide && platform && (
        <GuideSheet platform={platform} onClose={() => setShowGuide(false)} />
      )}

      <style jsx global>{`
        @keyframes installSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes installArrowFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-slideUp {
          animation: installSlideUp 0.3s ease-out;
        }
        .install-anim-arrow-float {
          animation: installArrowFloat 1.6s ease-in-out infinite;
        }
      `}</style>
    </>
  )
}
