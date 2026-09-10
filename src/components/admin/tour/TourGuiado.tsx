'use client'

/**
 * Tour guiado genérico · aponta passos pra elementos reais da tela.
 *
 * Extraído do TourSumidos (08/09/2026) quando a aba Avisos precisou do mesmo
 * mecanismo (10/09). O TourSumidos NÃO foi migrado pra cá de propósito: é
 * trabalho vivo de outra sessão, e mexer nele no mesmo dia é pedir conflito.
 * Quando assentar, ele pode virar só a lista de passos em cima deste.
 *
 * Como funciona: cada passo aponta pra um `data-tour` na página, escurece o
 * resto com um box-shadow gigante e mostra o balão embaixo (ou em cima, se
 * não couber). Passo sem alvo, ou com alvo que não está na tela, abre o balão
 * centralizado — o tour nunca trava por um elemento que sumiu.
 *
 * Quem grava "já viu" é o chamador, em `aoEncerrar`: cada aba tem a sua
 * coluna e a sua rota.
 */

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from '@/components/ui/Icon'

export type PassoTour = {
  /** data-tour do elemento destacado. Vazio = balão centralizado, sem alvo. */
  alvo: string
  titulo: string
  corpo: string
  /**
   * Botão de ação no lugar do "Próximo/Entendi". Clicar ENCERRA o tour (grava
   * "já viu") e executa — serve pra levar a dona a outra tela, como abrir o
   * editor de um aviso. Use só no último passo: depois dele não há "Próximo".
   */
  acao?: { rotulo: string; executar: () => void }
}

type Props = {
  /** Só monta quando deve aparecer (quem chama decide: já viu? tem pacote?). */
  aberto: boolean
  /** Passos já montados. Passe memorizado, senão o tour remede a cada render. */
  passos: PassoTour[]
  /** Nome pra leitor de tela, ex. "Tour da aba Avisos". */
  rotulo: string
  /** Chamado ao pular, fechar ou concluir. É aqui que se grava "já viu". */
  aoEncerrar: () => void
}

type Caixa = { top: number; left: number; width: number; height: number }

export default function TourGuiado({ aberto, passos, rotulo, aoEncerrar }: Props) {
  const [i, setI] = useState(0)
  const [caixa, setCaixa] = useState<Caixa | null>(null)
  const [pronto, setPronto] = useState(false)
  const [fechado, setFechado] = useState(false)

  useEffect(() => setPronto(true), [])

  const encerrar = useCallback(() => {
    setFechado(true)
    aoEncerrar()
  }, [aoEncerrar])

  /* Mede o alvo do passo atual. useLayoutEffect pra não piscar o balão numa
     posição errada antes de reposicionar. */
  useLayoutEffect(() => {
    if (!aberto || fechado) return
    const passo = passos[i]
    if (!passo?.alvo) { setCaixa(null); return }
    const el = document.querySelector<HTMLElement>(`[data-tour="${passo.alvo}"]`)
    if (!el) { setCaixa(null); return }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const medir = () => {
      const r = el.getBoundingClientRect()
      setCaixa({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    medir()
    const t = setTimeout(medir, 350) // depois do scroll suave
    window.addEventListener('resize', medir)
    window.addEventListener('scroll', medir, true)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', medir)
      window.removeEventListener('scroll', medir, true)
    }
  }, [i, aberto, fechado, passos])

  useEffect(() => {
    if (!aberto || fechado) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') encerrar()
      if (e.key === 'ArrowRight') setI((v) => Math.min(v + 1, passos.length - 1))
      if (e.key === 'ArrowLeft') setI((v) => Math.max(v - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aberto, fechado, encerrar, passos.length])

  if (!aberto || fechado || !pronto || passos.length === 0) return null

  const passo = passos[i]
  const ultimo = i === passos.length - 1
  const margem = 8

  /* Balão embaixo do alvo; se não couber, em cima. Sem alvo, centralizado. */
  const espacoAbaixo = caixa ? window.innerHeight - (caixa.top + caixa.height) : 0
  const acima = caixa ? espacoAbaixo < 220 : false
  const balao: React.CSSProperties = caixa
    ? {
        position: 'fixed',
        left: 12,
        right: 12,
        ...(acima
          ? { bottom: window.innerHeight - caixa.top + margem }
          : { top: caixa.top + caixa.height + margem }),
      }
    : { position: 'fixed', left: 12, right: 12, top: '50%', transform: 'translateY(-50%)' }

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label={rotulo}>
      {caixa ? (
        <div
          className="absolute rounded-2xl pointer-events-none transition-all duration-200"
          style={{
            top: caixa.top - 6,
            left: caixa.left - 6,
            width: caixa.width + 12,
            height: caixa.height + 12,
            boxShadow: '0 0 0 9999px rgba(15,23,42,0.62)',
            border: '2px solid var(--admin-accent)',
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.62)' }} />
      )}

      <div
        className="admin-card p-4 mx-auto"
        style={{ ...balao, maxWidth: 420, boxShadow: '0 12px 40px rgba(0,0,0,0.28)' }}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-accent)' }}>
            {i + 1} de {passos.length}
          </p>
          <button type="button" onClick={encerrar} aria-label="Fechar tour" style={{ color: 'var(--admin-text-faded)' }}>
            <IconClose size={16} />
          </button>
        </div>

        <p className="text-base font-bold leading-snug" style={{ color: 'var(--admin-text)' }}>
          {passo.titulo}
        </p>
        <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
          {passo.corpo}
        </p>

        <div className="flex items-center gap-1.5 mt-3">
          {passos.map((_, n) => (
            <span
              key={n}
              className="h-1.5 rounded-full transition-all"
              style={{ width: n === i ? 18 : 6, background: n === i ? 'var(--admin-accent)' : 'var(--admin-border)' }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button type="button" onClick={encerrar} className="text-sm font-semibold px-2 py-2" style={{ color: 'var(--admin-text-faded)' }}>
            {passo.acao ? 'Agora não' : 'Pular'}
          </button>
          <div className="flex-1" />
          {i > 0 && (
            <button
              type="button"
              onClick={() => setI(i - 1)}
              className="px-3 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
            >
              Voltar
            </button>
          )}
          {passo.acao ? (
            <button
              type="button"
              onClick={() => {
                const acao = passo.acao
                encerrar()
                acao?.executar()
              }}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              {passo.acao.rotulo}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => (ultimo ? encerrar() : setI(i + 1))}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              {ultimo ? 'Entendi' : 'Próximo'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
