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
    setMostrar(true)
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
          a porcentagem, o prazo pra pagar e o que acontece se a cliente cancelar. Já vem desligado:
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
          <button
            type="button"
            onClick={dispensar}
            className="rounded-lg px-3 py-2 text-xs font-semibold"
            style={{ color: 'var(--admin-text-faded)' }}
          >
            Agora não
          </button>
        </div>
      </div>

      <button
        onClick={dispensar}
        className="flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-lg"
        style={{ color: 'var(--admin-text-faded)' }}
        aria-label="Dispensar"
      >
        ✕
      </button>
    </div>
  )
}
