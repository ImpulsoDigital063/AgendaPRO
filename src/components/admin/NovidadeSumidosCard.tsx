'use client'

/* AVISO DE NOVIDADE — ABA SUMIDOS (08/09/2026).
   ───────────────────────────────────────────────────────────────────
   Mesmo raciocínio do card do sinal: o push alcança só quem ativou
   notificação — hoje 20 aparelhos em 13 negócios. Este card alcança
   100% de quem abre o painel, que é onde a notícia rende.

   Some sozinho em três casos:
     · a dona JÁ entrou na aba (tour_sumidos_em preenchido) — não se
       anuncia o que a pessoa já conhece
     · ela dispensou no ✕
     · passou o prazo — novidade tem validade, e card de anúncio que
       fica pra sempre vira parte do cenário

   Cede a vez pra faixa de notificação, igual ao do sinal: aquela é
   operação (a dona perde agendamento sem saber), esta é convite.

   Sem emoji: SVG, como em todo lugar que o cliente pode ver. */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ouvirFaixaPush } from '@/lib/aviso-push-bus'

const DISMISS_KEY = 'ap_novidade_sumidos_dismissed'
/* 30 dias, a mesma janela do selo NOVO no menu. Quem não abriu a aba nesse
   tempo não vai abrir por causa de um card. */
const ATE = new Date('2026-10-08T23:59:59-03:00').getTime()

function IconRelogio({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

export default function NovidadeSumidosCard({ jaEntrou }: { jaEntrou: boolean }) {
  const [mostrar, setMostrar] = useState(false)

  useEffect(() => {
    if (jaEntrou) return
    if (Date.now() > ATE) return
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return
    } catch {}

    /* Um aviso por vez. Se a faixa de push estiver na tela, este espera.
       O timeout é desarmado na resposta — sem isso os dois empilhavam,
       que foi o defeito visto no painel do Olímpio em 06/08. */
    let vivo = true
    const semResposta = setTimeout(() => { if (vivo) setMostrar(true) }, 2000)
    const parar = ouvirFaixaPush((faixaVisivel) => {
      clearTimeout(semResposta)
      if (vivo) setMostrar(!faixaVisivel)
    })
    return () => { vivo = false; clearTimeout(semResposta); parar() }
  }, [jaEntrou])

  if (!mostrar) return null

  function dispensar() {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {}
    setMostrar(false)
  }

  return (
    <div
      className="rounded-2xl p-4 flex items-start gap-3 relative overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary, var(--admin-accent)) 10%, var(--admin-surface)) 0%, var(--admin-surface) 70%)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <span
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background:
            'linear-gradient(135deg, var(--brand-primary, var(--admin-accent)) 0%, var(--brand-secondary, var(--admin-accent)) 100%)',
          color: '#fff',
          boxShadow: '0 3px 8px -2px rgba(0,0,0,0.25), inset 0 1px 0 0 rgba(255,255,255,0.20)',
        }}
      >
        <IconRelogio />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
          Novo · Sumidos
        </p>
        <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--admin-text)' }}>
          Quem parou de voltar agora tem aba própria
        </p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
          Escolha o prazo — 15, 20, 30 dias — veja quem sumiu e chame no WhatsApp.
          Com ou sem cupom de desconto.
        </p>

        <Link
          href="/admin/sumidos"
          className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-2 rounded-xl text-xs font-bold no-underline"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          Ver quem sumiu
        </Link>
      </div>

      <button
        type="button"
        onClick={dispensar}
        aria-label="Dispensar aviso"
        className="absolute top-2.5 right-2.5 p-1"
        style={{ color: 'var(--admin-text-faded)' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
