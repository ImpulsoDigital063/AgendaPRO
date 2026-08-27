'use client'

/* AVISO DE NOVIDADE — SINAL NO AGENDAMENTO (06/08).
   ───────────────────────────────────────────────────────────────────
   O push da novidade alcança só quem ativou notificação: 7 pessoas de
   ~20 negócios. Este card alcança 100% de quem abre o painel, que é
   onde a notícia rende.

   Some sozinho em três casos:
     · o negócio JÁ ligou o sinal (não se anuncia o que a pessoa usa)
     · a dona dispensou no ✕
     · passou o prazo do aviso — novidade tem validade, e card de
       anúncio que fica pra sempre vira parte do cenário e some da
       atenção sem ninguém fechar

   Sem emoji: SVG, como em todo lugar que a cliente pode ver. */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ouvirFaixaPush } from '@/lib/aviso-push-bus'

const DISMISS_KEY = 'ap_novidade_sinal_dismissed'
/* Depois disso o card não aparece mais pra ninguém, mesmo sem dispensar.
   Quem não ligou o sinal em ~3 semanas não vai ligar por causa de um card. */
const ATE = new Date('2026-08-31T23:59:59-03:00').getTime()

function IconEscudo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export default function NovidadeSinalCard({ sinalAtivo }: { sinalAtivo: boolean }) {
  const [mostrar, setMostrar] = useState(false)

  useEffect(() => {
    if (sinalAtivo) return
    if (Date.now() > ATE) return
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return
    } catch {}

    /* UM AVISO POR VEZ (06/08). A faixa de notificação tem prioridade: ela é
       operação — a dona perde agendamento sem saber. Esta aqui é convite e
       pode esperar. Empilhados, os dois comiam metade da primeira dobra no
       celular antes da agenda aparecer.

       A faixa avisa de forma assíncrona (consulta o banco antes de decidir);
       se em 2s ela não falou, é porque não está nesta tela — aí este card
       aparece. Fechar a faixa dispara `false` e este card entra na hora. */
    let vivo = true
    /* O timeout é DESARMADO na resposta. Na primeira versão ele continuava
       armado e, 2s depois de a faixa dizer "estou visível", forçava o card a
       aparecer assim mesmo — os dois voltavam a empilhar (visto no print do
       painel do Olímpio). Declarado antes do ouvinte porque `ouvirFaixaPush`
       responde na hora quando a faixa já decidiu. */
    const semResposta = setTimeout(() => { if (vivo) setMostrar(true) }, 2000)
    const parar = ouvirFaixaPush((faixaVisivel) => {
      clearTimeout(semResposta)
      if (vivo) setMostrar(!faixaVisivel)
    })

    return () => { vivo = false; clearTimeout(semResposta); parar() }
  }, [sinalAtivo])

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
        <IconEscudo />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
          Novidade
        </p>
        <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--admin-text)' }}>
          Cansou de furo na agenda?
        </p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
          Agora dá pra pedir um <strong>sinal por PIX</strong> pra confirmar o horário. O dinheiro cai
          direto na sua conta, sem taxa e sem intermediário — a gente só monta o código. Você escolhe
          a porcentagem, o prazo pra pagar e o que acontece se o cliente cancelar. Já vem desligado:
          só sente quem quiser usar.
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Link
            href="/admin/financeiro/sinal"
            className="rounded-lg px-3 py-2 text-xs font-bold text-white"
            style={{ background: 'var(--brand-primary, var(--admin-accent))' }}
          >
            Ver como funciona
          </Link>
        </div>
      </div>

      {/* ✕ visível: borda, fundo e 28px de área de toque. O "Agora não" saiu —
          com o ✕ à mostra, dois botões de fechar viravam ruído. */}
      <button
        onClick={dispensar}
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[13px] leading-none"
        style={{
          color: 'var(--admin-text-mute)',
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
        }}
        aria-label="Fechar aviso"
        title="Fechar"
      >
        ✕
      </button>
    </div>
  )
}
