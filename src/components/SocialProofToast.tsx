'use client'

import { useState, useEffect, useCallback } from 'react'

/* Pool de nomes/cidades — rotação aleatória */
const PROOFS = [
  { nome: 'Barber Tiago',      cidade: 'SP',  plano: 'Solo' },
  { nome: 'Barb. do Léo',      cidade: 'RJ',  plano: 'Equipe' },
  { nome: 'Studio Diego',      cidade: 'BH',  plano: 'Solo' },
  { nome: 'Barber Lucas',      cidade: 'GO',  plano: 'Equipe' },
  { nome: 'Barb. Reis',        cidade: 'PR',  plano: 'Solo' },
  { nome: 'House Barber',      cidade: 'CE',  plano: 'Equipe' },
  { nome: 'Barb. do Rafa',     cidade: 'BA',  plano: 'Solo' },
  { nome: 'Brothers Barber',   cidade: 'PE',  plano: 'Equipe' },
  { nome: 'Barber Matheus',    cidade: 'SP',  plano: 'Solo' },
  { nome: 'Studio Arthur',     cidade: 'DF',  plano: 'Solo' },
]

const TEMPOS = ['3 min', '7 min', '12 min', '18 min', '24 min']

export default function SocialProofToast() {
  const [visible, setVisible] = useState(false)
  const [current, setCurrent] = useState<number | null>(null)
  const [tempoIdx, setTempoIdx] = useState(0)
  const [shown, setShown] = useState(0)

  const showToast = useCallback(() => {
    let idx: number
    do {
      idx = Math.floor(Math.random() * PROOFS.length)
    } while (idx === current && PROOFS.length > 1)

    setCurrent(idx)
    setTempoIdx(Math.floor(Math.random() * TEMPOS.length))
    setVisible(true)

    /* Fica 4s visível */
    setTimeout(() => setVisible(false), 4000)
    setShown((s) => s + 1)
  }, [current])

  useEffect(() => {
    const first = setTimeout(() => showToast(), 75_000)
    return () => clearTimeout(first)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (shown === 1) {
      const second = setTimeout(() => showToast(), 180_000)
      return () => clearTimeout(second)
    }
  }, [shown, showToast])

  if (current === null) return null

  const proof = PROOFS[current]

  return (
    <div
      className="fixed bottom-4 left-3 z-50 pointer-events-none"
      style={{
        transition: 'transform 500ms cubic-bezier(0.16,1,0.3,1), opacity 400ms ease',
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl pointer-events-auto"
        style={{
          background: 'rgba(15,23,42,0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}
      >
        {/* Dot verde */}
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70 flex-shrink-0" />

        {/* Texto compacto */}
        <span className="text-[10px] text-slate-400 leading-tight">
          <span className="text-slate-300 font-medium">{proof.nome}</span>
          {' '}assinou {proof.plano}
          <span className="text-slate-500"> · {proof.cidade} · {TEMPOS[tempoIdx]}</span>
        </span>
      </div>
    </div>
  )
}
