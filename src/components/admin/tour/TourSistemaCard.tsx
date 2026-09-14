'use client'

/* Convite do tour "Conheça seu sistema" na Início. Por enquanto só aparece
   pros negócios liberados em src/lib/tour-sistema.ts. Some no X ou quando o
   tour chega ao fim (localStorage). Sem emoji: SVG. */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { limparIdParada, montarRoteiro, TOUR_SISTEMA_CARD_OCULTO } from '@/lib/tour-sistema'

const IDS = new Set(montarRoteiro({ categoria: null, vendeProduto: true }).map((p) => p.id))

function IconMapa({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  )
}

export default function TourSistemaCard() {
  /* Com o tour aberto, o card vira uma segunda entrada pro mesmo tour atrás
     do balão (teste 14/09). Some enquanto o tour roda. */
  const params = useSearchParams()
  const id = limparIdParada(params.get('tour'))
  /* Some pra quem dispensou no X ou já chegou ao fim do tour. Começa
     escondido e só aparece depois de ler o localStorage, pra não piscar. */
  const [oculto, setOculto] = useState(true)
  useEffect(() => {
    try { setOculto(localStorage.getItem(TOUR_SISTEMA_CARD_OCULTO) === '1') } catch { setOculto(false) }
  }, [])
  if (oculto || (id && IDS.has(id))) return null

  function dispensar() {
    try { localStorage.setItem(TOUR_SISTEMA_CARD_OCULTO, '1') } catch {}
    setOculto(true)
  }

  return (
    <div
      className="rounded-2xl p-4 flex items-start gap-3 relative"
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
        }}
      >
        <IconMapa />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
          Conheça seu sistema
        </p>
        <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--admin-text)' }}>
          Veja tudo que o AgendaPRO faz em 6 partes
        </p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
          Montar o negócio, atender no balcão, fechar o caixa e fazer a clientela voltar.
        </p>

        <Link
          href="/admin/inicio?tour=abertura"
          className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-2 rounded-xl text-xs font-bold no-underline"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          Começar o tour
        </Link>
      </div>

      <button
        type="button"
        onClick={dispensar}
        aria-label="Dispensar convite do tour"
        className="absolute top-2.5 right-2.5 p-1"
        style={{ color: 'var(--admin-text-faded)' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
