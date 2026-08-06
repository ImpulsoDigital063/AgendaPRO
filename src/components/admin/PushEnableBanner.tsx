'use client'

// Faixa que liga a notificação de agendamento novo no celular. Aparece na
// agenda e no Início do dono, na área do profissional e na recepção. Decide
// sozinha o que mostrar:
//  - 'enable'      → botão "Ativar notificações" (navegador suporta, ainda não ativou)
//  - 'ios-install' → dica de instalar na tela de início (iPhone no Safari, sem PWA)
//  - 'blocked'     → permissão negada no aparelho: explica como liberar nos ajustes
//  - null          → some (já ativo NOS DOIS LADOS · dispensado · sem suporte)
//
// "Já ativo" quer dizer assinatura no aparelho E row no banco — é o banco que o
// /api/notify lê. Se só o aparelho tiver, a faixa reenvia pro banco antes de
// sumir (ver syncPushSubscription em lib/push).
//
// Dispensa: 7 dias em localStorage pra quem já recebe em algum aparelho; só a
// sessão atual pra quem não tem NENHUM registrado — esse tem que rever o
// convite toda vez que abrir a agenda.
import { useEffect, useState } from 'react'
import { registerPush, pushSupported, syncPushSubscription, contarDevicesRegistrados, type PushResult } from '@/lib/push'

// Dispensa temporária: guarda o timestamp e volta a oferecer depois de 7 dias
// (antes era permanente · um "agora não" matava o banner pra sempre → adoção baixa).
const DISMISS_KEY = 'ap_push_banner_dismissed_at'
const DISMISS_DAYS = 7

// Quem NÃO tem nenhum aparelho registrado no banco não entra na dispensa de 7
// dias (Eduardo, 06/08: "quando o Olímpio e o funcionário dele abrirem a agenda,
// têm que ver o aviso"). Pra essas pessoas o convite volta toda vez que a tela
// é aberta de novo — o ✕ vale só pra sessão atual, pra não atrapalhar quem está
// no meio de um atendimento. Quem já ativou em ALGUM aparelho mantém a dispensa
// de 7 dias no aparelho novo: já recebe notificação, o convite ali é opcional.
const DISMISS_SESSION_KEY = 'ap_push_banner_dismissed_session'

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

type Mode = 'enable' | 'ios-install' | 'blocked' | null

export default function PushEnableBanner() {
  const [mode, setMode] = useState<Mode>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // true = pessoa sem nenhum aparelho registrado (o convite insiste; ver topo)
  const [persistente, setPersistente] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (typeof window === 'undefined') return

      const ua = navigator.userAgent
      const isIOS = /iphone|ipad|ipod/i.test(ua)
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true

      // Sem NENHUM aparelho no banco = pessoa que não recebe notificação em
      // lugar nenhum. Aí a dispensa de 7 dias não vale (só a da sessão), senão
      // um "agora não" apagava o convite por uma semana justo pra quem mais
      // precisa dele. null (não deu pra consultar) cai no comportamento antigo.
      const registrados = await contarDevicesRegistrados()
      if (!alive) return
      const nuncaAtivou = registrados === 0
      setPersistente(nuncaAtivou)

      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0)
      const dispensada = nuncaAtivou
        ? sessionStorage.getItem(DISMISS_SESSION_KEY) === '1'
        : !!(dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86400000)

      if (!pushSupported()) {
        // iPhone no Safari (não instalado) não expõe PushManager — o push só
        // liga depois de "Adicionar à Tela de Início". Aí mostramos a dica.
        if (isIOS && !isStandalone && alive && !dispensada) setMode('ios-install')
        return
      }

      // REPARO SILENCIOSO (06/08 · caso Olímpio) — roda ANTES de qualquer
      // dispensa. Se o aparelho tem assinatura, reenvia pro banco: se a row
      // tinha sumido (RPC falhou na hora, ou o /api/notify apagou por 404/410),
      // volta sozinha. Antes a faixa via "tem assinatura no navegador", sumia,
      // e o dono ficava sem push sem ninguém saber. É idempotente.
      const temNoAparelho = Notification.permission === 'granted' && (await syncPushSubscription())
      if (temNoAparelho) return // agora "ativo" quer dizer ativo NOS DOIS lados

      if (dispensada) return

      // Permissão negada NÃO some mais em silêncio: o código não consegue
      // re-pedir, então a única saída é o dono liberar nos ajustes do aparelho —
      // e pra isso ele precisa saber que está bloqueado.
      if (Notification.permission === 'denied') {
        if (alive) setMode('blocked')
        return
      }

      if (alive) setMode('enable')
    })()
    return () => {
      alive = false
    }
  }, [])

  function dismiss() {
    try {
      // Nunca ativou em aparelho nenhum → some só nesta sessão; volta na
      // próxima vez que abrir a agenda. Já ativou em algum → 7 dias.
      if (persistente) sessionStorage.setItem(DISMISS_SESSION_KEY, '1')
      else localStorage.setItem(DISMISS_KEY, String(Date.now()))
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

  // Permissão negada neste aparelho. Não dá pra re-pedir por código — some o
  // botão, entra a instrução. Antes essa faixa simplesmente não aparecia, e o
  // dono achava que o sistema é que não avisava.
  if (mode === 'blocked') {
    const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
    return (
      <div className={wrap} style={wrapStyle}>
        {iconBox}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
            Notificações bloqueadas neste aparelho
          </p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
            {isIOS ? (
              <>Você não vai ser avisado de agendamento novo. Pra liberar: <strong>Ajustes</strong> → <strong>Notificações</strong> → <strong>AgendaPRO</strong> → ligar <strong>&ldquo;Permitir notificações&rdquo;</strong>, e volte aqui.</>
            ) : (
              <>Você não vai ser avisado de agendamento novo. Pra liberar: toque no <strong>cadeado</strong> ao lado do endereço → <strong>Notificações</strong> → <strong>Permitir</strong>, e recarregue a página.</>
            )}
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
          Seu celular apita quando um cliente agenda pelo seu link e em avisos importantes da sua conta — mesmo com o app fechado.
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
