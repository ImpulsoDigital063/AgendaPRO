'use client'

/* AZUL FIXO, NÃO A MARCA DO CLIENTE (Eduardo, 01/09/2026).
   Todo este componente usa --agendapro-blue em vez de --brand-primary.
   Regra: azul quando é o AgendaPRO falando. Instalar o app é assunto do
   AgendaPRO com o dono do negócio — não do salão com a cliente dele. O
   BrandThemeInjector sobrescreve --brand-*, então no Studio Isis este banner
   sairia vinho e no Olímpio, cinza. */

import { useEffect, useState } from 'react'

type Platform = 'ios' | 'android' | null

// BrowserMenuArrow removido (17/05/2026): a seta flutuante apontava pra
// posição fixa do botão de compartilhar (canto superior direito), mas:
//   - iOS 15+: barra de URL fica EMBAIXO por padrão (botão no centro inferior)
//   - iOS 14-: barra fica EM CIMA
//   - iOS 15+ "Single Tab": volta pra cima (configurável pelo usuário)
//   - Android Chrome: sempre topo direito
// Sem detecção confiável da config do usuário, qualquer seta acerta uns
// e erra outros. Mantemos só o mockup interno do modal — claro o suficiente.

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
            style={{ background: 'color-mix(in srgb, var(--agendapro-blue) 18%, transparent)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--agendapro-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

        {/* Aviso destacado pra iOS: instalar só funciona no Safari nativo */}
        {isIOS && (
          <div
            className="mt-4 rounded-xl p-3 flex items-start gap-2.5"
            style={{
              background: 'color-mix(in srgb, var(--agendapro-blue) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--agendapro-blue) 30%, transparent)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--agendapro-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-xs leading-snug" style={{ color: 'var(--admin-text)' }}>
              No iPhone, instalar funciona <strong>só no Safari</strong>. Se você abriu este link no Chrome ou outro navegador, copie o endereço e abra no Safari primeiro.
            </p>
          </div>
        )}

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
                style={{ background: 'var(--agendapro-blue)' }}
              >
                1
              </span>
              <p className="font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>
                {isIOS
                  ? 'Toque no botão compartilhar do Safari'
                  : 'Toque nos 3 pontinhos no canto superior'}
              </p>
            </div>
            {isIOS && (
              <p className="text-[11px] mb-2 leading-snug" style={{ color: 'var(--admin-text-mute)' }}>
                Esse ícone (quadrado com seta pra cima) fica na barra do Safari — pode estar <strong>embaixo</strong> (mais comum) ou <strong>em cima</strong>, dependendo da configuração do seu iPhone.
              </p>
            )}
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
                      background: 'var(--agendapro-blue)',
                      boxShadow: '0 8px 16px -4px color-mix(in srgb, var(--agendapro-blue) 40%, transparent)',
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
                      style={{ background: 'var(--agendapro-blue)' }}
                    >
                      aqui
                    </span>
                    <span className="text-sm leading-none" style={{ color: 'var(--agendapro-blue)' }}>
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
                style={{ background: 'var(--agendapro-blue)' }}
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
                  background: 'color-mix(in srgb, var(--agendapro-blue) 14%, transparent)',
                  color: 'var(--agendapro-blue)',
                  borderLeft: '4px solid var(--agendapro-blue)',
                }}
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{ background: 'color-mix(in srgb, var(--agendapro-blue) 22%, transparent)' }}
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
          style={{ background: 'var(--agendapro-blue)' }}
        >
          Entendi!
        </button>
      </div>
    </div>
    </>
  )
}

/**
 * Area determina a chave de localStorage de dispensa.
 * Cada area tem seu proprio dismiss porque sao usuarios distintos:
 *   - admin: dona da barbearia
 *   - profissional: funcionario contratado
 * Em cenario real, cada um tem seu proprio device + sessao. Mas no
 * proprio Eduardo testando ambos no mesmo iPhone, dispensar em /admin
 * nao deve esconder em /profissional. Chaves separadas resolvem.
 */
type Area = 'admin' | 'profissional'

export default function InstallBanner({ area = 'admin' }: { area?: Area } = {}) {
  const [platform, setPlatform] = useState<Platform>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void } | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isStandalone, setIsStandalone] = useState(true) // default true to avoid flash

  const dismissKey = `install-banner-dismissed-at:${area}`

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true

    setIsStandalone(standalone)
    if (standalone) return

    // Dispensa expira em 30 dias — reaparece depois pra dar nova chance de instalar
    const dismissedAt = localStorage.getItem(dismissKey)
    if (dismissedAt) {
      const diasDispensado = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24)
      if (diasDispensado < 30) return
      localStorage.removeItem(dismissKey)
    }
    // Limpa flags legadas (versoes anteriores tinham 1 chave compartilhada
    // entre admin/profissional, e versao mais antiga tinha dismiss eterno)
    localStorage.removeItem('install-banner-dismissed')
    localStorage.removeItem('install-banner-dismissed-at')

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
  }, [dismissKey])

  function handleDismiss() {
    localStorage.setItem(dismissKey, String(Date.now()))
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
      {/* Compacto · uma linha só (toca e abre o guia / instala). Antes eram
          duas linhas (cabeçalho + botão grande) e apertava a agenda no mobile. */}
      <div
        className="mx-4 mt-3 rounded-2xl overflow-hidden flex items-stretch"
        style={{
          border: '1px solid var(--admin-border)',
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--agendapro-blue) 16%, var(--admin-surface)) 0%, color-mix(in srgb, var(--agendapro-blue) 7%, var(--admin-surface)) 100%)',
        }}
      >
        <button
          onClick={() => (platform === 'android' && deferredPrompt ? handleAndroidInstall() : setShowGuide(true))}
          className="flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2.5 text-left active:scale-[0.99] transition-transform"
        >
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              /* azul do AgendaPRO, não a marca do cliente: instalar o APP é
                 assunto do AgendaPRO com o dono, não do salão com a cliente. */
              background: 'var(--agendapro-blue)',
              boxShadow: '0 4px 12px -3px color-mix(in srgb, var(--agendapro-blue) 40%, transparent)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </span>
          <span className="flex-1 min-w-0">
            {/* truncate (01/09/2026): a 363px o título quebrava em
                "Instalar / AgendaPRO" e o card virava três linhas de texto.
                Agora é uma linha; só corta em aparelho estreito de verdade, e
                aí "Instalar Agenda…" ainda se lê. */}
            <span className="text-sm font-bold block leading-tight truncate" style={{ color: 'var(--admin-text)' }}>
              Instalar AgendaPRO
            </span>
            <span className="text-[11px] block leading-tight" style={{ color: 'var(--admin-text-mute)' }}>
              {platform === 'android' && deferredPrompt ? 'Toque pra instalar' : 'Toque pra ver como instalar'}
            </span>
          </span>
          <span
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
            style={{ background: 'var(--agendapro-blue)', color: '#fff' }}
          >
            {platform === 'android' && deferredPrompt ? 'Instalar' : 'Ver'}
          </span>
        </button>
        <button
          onClick={handleDismiss}
          className="px-2.5 flex items-center justify-center flex-shrink-0"
          style={{ color: 'var(--admin-text-faded)', borderLeft: '1px solid var(--admin-border)' }}
          aria-label="Fechar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
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
