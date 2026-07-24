'use client'

// Faixa da home do painel (/admin/inicio) que liga a notificação de
// agendamento novo no celular do dono. Decide sozinha o que mostrar:
//  - 'enable'      → botão "Ativar notificações" (navegador suporta, ainda não ativou)
//  - 'ios-install' → dica de instalar na tela de início (iPhone no Safari, sem PWA)
//  - null          → some (já ativo · dispensado · não suportado · permissão negada)
// Dismissível: guarda em localStorage pra não incomodar quem fechou.
import { useEffect, useState } from 'react'
import { registerPush, pushSupported, hasActivePushSubscription, type PushResult } from '@/lib/push'

const DISMISS_KEY = 'ap_push_banner_dismissed'

function IconBell({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function IconShare({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4" />
      <path d="m8 8 4-4 4 4" />
      <path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
    </svg>
  )
}

type Mode = 'enable' | 'ios-install' | null

export default function PushEnableBanner() {
  const [mode, setMode] = useState<Mode>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (typeof window === 'undefined') return
      if (localStorage.getItem(DISMISS_KEY) === '1') return

      const ua = navigator.userAgent
      const isIOS = /iphone|ipad|ipod/i.test(ua)
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true

      if (!pushSupported()) {
        // iPhone no Safari (não instalado) não expõe PushManager — o push só
        // liga depois de "Adicionar à Tela de Início". Aí mostramos a dica.
        if (isIOS && !isStandalone && alive) setMode('ios-install')
        return
      }

      if (Notification.permission === 'denied') return // não dá pra re-pedir por código
      if (await hasActivePushSubscription()) return // já ativo neste aparelho

      if (alive) setMode('enable')
    })()
    return () => {
      alive = false
    }
  }, [])

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {}
    setMode(null)
  }

  async function ativar() {
    setBusy(true)
    setError(null)
    const res: PushResult = await registerPush()
    setBusy(false)
    if (res === 'granted') {
      setDone(true)
      setTimeout(() => setMode(null), 3500)
    } else if (res === 'denied') {
      setError('Notificações bloqueadas. Reative nas configurações do navegador/celular.')
    } else if (res === 'unsupported') {
      setError('Este aparelho/navegador não suporta notificação.')
    } else {
      setError('Não deu pra ativar agora. Tente de novo.')
    }
  }

  if (!mode && !done) return null

  const wrap = 'relative rounded-2xl p-4 overflow-hidden flex items-start gap-3'
  const wrapStyle = {
    background:
      'linear-gradient(135deg, color-mix(in srgb, var(--admin-accent) 12%, var(--admin-surface)) 0%, var(--admin-surface) 70%)',
    border: '1px solid var(--admin-border)',
  } as const
  const iconBox = (
    <span
      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{
        background: 'linear-gradient(135deg, var(--brand-primary, var(--admin-accent)) 0%, var(--brand-secondary, var(--admin-accent)) 100%)',
        color: '#fff',
        boxShadow: '0 3px 8px -2px rgba(0,0,0,0.25), inset 0 1px 0 0 rgba(255,255,255,0.20)',
      }}
    >
      <IconBell />
    </span>
  )

  // Sucesso rápido
  if (done) {
    return (
      <div className={wrap} style={wrapStyle}>
        {iconBox}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
            Notificações ativadas ✅
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
            Seu celular vai apitar quando entrar um agendamento novo.
          </p>
        </div>
      </div>
    )
  }

  // iPhone sem app instalado
  if (mode === 'ios-install') {
    return (
      <div className={wrap} style={wrapStyle}>
        {iconBox}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
            Quer ser avisada no celular a cada agendamento?
          </p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
            No iPhone, primeiro instale o app: toque em{' '}
            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--admin-text)' }}>
              Compartilhar <IconShare size={13} />
            </span>{' '}
            (embaixo, no Safari) e depois em <strong>&ldquo;Adicionar à Tela de Início&rdquo;</strong>. Abra o app por lá e a opção de ativar aparece aqui.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-lg"
          style={{ color: 'var(--admin-text-faded)' }}
          aria-label="Dispensar"
        >
          ✕
        </button>
      </div>
    )
  }

  // Botão de ativar (Android / desktop / iPhone já instalado)
  return (
    <div className={wrap} style={wrapStyle}>
      {iconBox}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
          Ative as notificações neste aparelho
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
          Seu celular apita e mostra o aviso quando um cliente agenda pelo seu link — mesmo com o app fechado.
        </p>
        {error && (
          <p className="text-xs mt-2 font-medium" style={{ color: '#DC2626' }}>
            {error}
          </p>
        )}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={ativar}
            disabled={busy}
            className="text-xs font-bold px-4 py-2 rounded-xl transition-all hover:translate-y-[-1px] disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, var(--brand-primary, var(--admin-accent)) 0%, var(--brand-secondary, var(--admin-accent)) 100%)',
              color: '#fff',
              boxShadow: '0 3px 10px -2px color-mix(in srgb, var(--admin-accent) 40%, transparent)',
            }}
          >
            {busy ? 'Ativando…' : 'Ativar notificações'}
          </button>
          <button
            onClick={dismiss}
            className="text-xs font-semibold px-3 py-2 rounded-xl"
            style={{ color: 'var(--admin-text-faded)' }}
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  )
}
