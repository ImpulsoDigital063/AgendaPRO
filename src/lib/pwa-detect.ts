/**
 * Detector único de plataforma PWA · compartilhado por InstallBanner
 * e o item "Instalar como app" do checklist de onboarding.
 *
 * Apple bloqueia PWA install em browsers não-Safari no iOS (Chrome,
 * Firefox, Edge usam WebKit por baixo mas SEM beforeinstallprompt
 * nem Add-to-Home-Screen). Único caminho real é o usuário abrir o
 * link no Safari nativo. Detector identifica esse caso pra UI
 * mostrar instrução certa em vez de guide errado.
 */

export type PwaPlatform =
  | 'standalone'      // já instalado · roda em modo app
  | 'android-prompt'  // Android com beforeinstallprompt disponível
  | 'android-other'   // Android sem prompt (raro · Firefox Android etc)
  | 'ios-safari'      // Safari iOS · pode usar Add-to-Home-Screen
  | 'ios-other'       // Chrome/Firefox/Edge/Brave iOS · precisa abrir Safari
  | 'desktop'         // desktop · sem caso de uso PWA mobile
  | 'unknown'

/** Roda em modo PWA standalone (instalado via Add-to-Home-Screen). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/**
 * deferredPrompt: evento `beforeinstallprompt` capturado (Android Chrome).
 * Se truthy, usuário pode instalar com 1 clique (prompt nativo).
 */
export function detectPwaPlatform(deferredPrompt?: unknown): PwaPlatform {
  if (typeof window === 'undefined') return 'unknown'
  if (isStandalone()) return 'standalone'

  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
  const isAndroid = /Android/.test(ua)

  if (isIOS) {
    // Browsers não-Safari no iOS têm UA específico:
    // - Chrome iOS: CriOS
    // - Firefox iOS: FxiOS
    // - Edge iOS: EdgiOS
    // - Brave iOS: usa CriOS também (compatibilidade Chromium)
    // - DuckDuckGo iOS: DuckDuckGo
    const isIOSOtherBrowser = /(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)/.test(ua)
    if (isIOSOtherBrowser) return 'ios-other'
    return 'ios-safari'
  }

  if (isAndroid) {
    return deferredPrompt ? 'android-prompt' : 'android-other'
  }

  return 'desktop'
}

/** UI label resumido por plataforma · usado em banners/cards. */
export function pwaPlatformLabel(p: PwaPlatform): string {
  switch (p) {
    case 'standalone': return 'App instalado'
    case 'android-prompt': return 'Instalar como app'
    case 'android-other': return 'Adicionar à tela inicial'
    case 'ios-safari': return 'Adicionar à Tela de Início'
    case 'ios-other': return 'Abrir no Safari pra instalar'
    case 'desktop': return 'Use no celular'
    case 'unknown': return 'Instalar'
  }
}
