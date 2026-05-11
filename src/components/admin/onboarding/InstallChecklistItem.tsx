'use client'

/**
 * Item EXTRA do checklist de onboarding · "Instalar como app".
 *
 * Renderizado APÓS os 5 items do CHECKLIST_ITEMS (perfil, servicos,
 * horarios, qrcode, agendamento). Esses 5 são derivados do estado SQL
 * via getOnboardingState. Este item é puramente client-side: detecta
 * plataforma e estado standalone via Web APIs.
 *
 * Por que extra (não no SQL): server não tem como saber se o usuário
 * já adicionou o app na tela inicial do celular dele. É deteção de
 * runtime via display-mode standalone + UA + beforeinstallprompt.
 *
 * Cenários:
 *   - standalone (já instalado) → mostra como concluído (verde) ·
 *     incrementa contador do checklist
 *   - android-prompt → botão "Instalar agora" verde · dispara prompt
 *     nativo via beforeinstallprompt
 *   - android-other → abre sheet com instruções "3 pontinhos > adicionar"
 *   - ios-safari → abre sheet com instruções "compartilhar > adicionar"
 *   - ios-other (Chrome/Firefox/Edge iOS) → mostra alerta "abre no Safari"
 *     + botão "copiar link" (única forma real no iOS)
 *   - desktop / unknown → não renderiza (não faz sentido)
 *
 * Self-contained: importa só pwa-detect (helper puro). Não toca nada
 * dos 5 items do server.
 */

import { useEffect, useState } from 'react'
import {
  detectPwaPlatform,
  isStandalone,
  type PwaPlatform,
} from '@/lib/pwa-detect'

type Props = {
  /** Posição visual · 6 (renderizado após os 5 do SQL) */
  index: number
}

type BeforeInstallEvent = Event & { prompt: () => Promise<void> }

export default function InstallChecklistItem({ index }: Props) {
  const [platform, setPlatform] = useState<PwaPlatform>('unknown')
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallEvent | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  useEffect(() => {
    function refresh() {
      setPlatform(detectPwaPlatform(deferredPrompt))
    }
    refresh()

    const onBip = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallEvent)
    }
    const onInstalled = () => {
      setDeferredPrompt(null)
      setPlatform('standalone')
    }
    const dm = window.matchMedia('(display-mode: standalone)')
    const onDmChange = () => refresh()

    window.addEventListener('beforeinstallprompt', onBip)
    window.addEventListener('appinstalled', onInstalled)
    dm.addEventListener?.('change', onDmChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip)
      window.removeEventListener('appinstalled', onInstalled)
      dm.removeEventListener?.('change', onDmChange)
    }
  // deferredPrompt no deps faz refresh quando o prompt aparece
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredPrompt])

  // Auto-clear feedback
  useEffect(() => {
    if (!copyFeedback) return
    const id = setTimeout(() => setCopyFeedback(null), 2500)
    return () => clearTimeout(id)
  }, [copyFeedback])

  // Desktop/unknown não vê item (não faz sentido)
  if (platform === 'desktop' || platform === 'unknown') return null

  const done = platform === 'standalone' || isStandalone()

  async function handleClick() {
    if (done) return
    if (platform === 'android-prompt' && deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        // resultado fica pra event 'appinstalled' tratar
      } catch (err) {
        console.warn('[InstallChecklistItem] prompt falhou', err)
      }
      return
    }
    if (platform === 'ios-other') {
      // Copia URL · usuario precisa abrir Safari e colar.
      // Apple bloqueia abrir Safari programaticamente · única saída real.
      const url = window.location.origin + '/admin'
      try {
        await navigator.clipboard.writeText(url)
        setCopyFeedback('Link copiado · agora abra o Safari e cole')
      } catch {
        setCopyFeedback(`Copie manualmente: ${url}`)
      }
      return
    }
    // ios-safari ou android-other → abre sheet com instruções
    setShowGuide(true)
  }

  const subtitle: string = (() => {
    if (done) return '✓ Concluído'
    switch (platform) {
      case 'android-prompt': return 'Toque pra instalar · 1 toque'
      case 'android-other': return 'Adicionar à tela inicial · ver passo a passo'
      case 'ios-safari': return 'Adicionar à Tela de Início · ver passo a passo'
      case 'ios-other': return 'Apple só permite no Safari · copiar link'
      default: return 'Instalar como app'
    }
  })()

  const ctaIcon = (() => {
    if (done) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )
    }
    return (
      <span style={{ color: 'var(--admin-text-faded)', fontSize: '11px', fontWeight: 700 }}>
        {index}
      </span>
    )
  })()

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={done}
        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.005] disabled:cursor-default text-left"
        style={{
          background: done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${done ? 'rgba(16,185,129,0.18)' : 'var(--admin-border)'}`,
        }}
      >
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
          style={{
            background: done ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${done ? 'rgba(16,185,129,0.30)' : 'var(--admin-border)'}`,
          }}
        >
          {ctaIcon}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-semibold leading-tight"
            style={{
              color: done ? 'var(--admin-text-faded)' : 'var(--admin-text)',
              textDecoration: done ? 'line-through' : 'none',
            }}
          >
            <span className="mr-1.5">📲</span>
            Instalar como app no celular
          </p>
          <p
            className="text-[11px] mt-0.5 leading-snug"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            {subtitle}
          </p>
        </div>

        {!done && (
          <span
            className="flex-shrink-0 text-xs font-semibold"
            style={{ color: 'var(--admin-accent)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
        )}
      </button>

      {/* Toast feedback (iOS Other · copia link) */}
      {copyFeedback && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-full text-sm font-medium max-w-[85vw] text-center"
          style={{
            background: 'rgba(15,23,42,0.95)',
            color: '#ffffff',
            boxShadow: '0 12px 32px -8px rgba(0,0,0,0.5)',
          }}
        >
          {copyFeedback}
        </div>
      )}

      {/* Sheet guide pra android-other e ios-safari */}
      {showGuide && (platform === 'ios-safari' || platform === 'android-other') && (
        <InstallGuideSheet
          platform={platform === 'ios-safari' ? 'ios' : 'android'}
          onClose={() => setShowGuide(false)}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────
// Sheet guide simplificado · pra Android-other e iOS Safari
// (Mesma UX do InstallBanner GuideSheet, simplificada pro checklist)
// ─────────────────────────────────────────────────────────────────

function InstallGuideSheet({
  platform,
  onClose,
}: {
  platform: 'ios' | 'android'
  onClose: () => void
}) {
  const isIOS = platform === 'ios'

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 flex items-end"
      onClick={onClose}
    >
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

        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--admin-text)' }}>
          {isIOS ? 'Instalar no iPhone' : 'Instalar no Android'}
        </h2>
        <p className="text-xs mb-5" style={{ color: 'var(--admin-text-faded)' }}>
          {isIOS ? '2 toques no Safari' : '2 toques no Chrome'}
        </p>

        <ol className="space-y-3 mb-5">
          <li
            className="flex gap-3 items-start p-3 rounded-xl"
            style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
          >
            <span
              className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--brand-primary)' }}
            >
              1
            </span>
            <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
              {isIOS
                ? 'Toque no botão Compartilhar (quadrado com seta pra cima · embaixo da tela)'
                : 'Toque nos 3 pontinhos no canto superior direito'}
            </p>
          </li>
          <li
            className="flex gap-3 items-start p-3 rounded-xl"
            style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
          >
            <span
              className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--brand-primary)' }}
            >
              2
            </span>
            <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
              Role a tela e toque em <strong>&quot;Adicionar à Tela de Início&quot;</strong>{isIOS ? '. Confirme o nome (AgendaPRO) e pronto.' : '. Pode aparecer como "Instalar app".'}
            </p>
          </li>
        </ol>

        <button
          onClick={onClose}
          className="w-full text-white py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
          style={{ background: 'var(--brand-primary)' }}
        >
          Entendi
        </button>
      </div>
    </div>
  )
}
