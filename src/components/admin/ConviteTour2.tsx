'use client'

/**
 * Convite pro SEGUNDO tour da aba Sumidos (Eduardo, 08/09/2026).
 *
 * "Eles ficam ali, conhecem um pouco o que lhes foi apresentado, e quando
 * forem mais para baixo aí aparece a opção do segundo tour."
 *
 * O primeiro tour tinha crescido pra 9 passos tentando cobrir tudo — tour
 * comprido é tour pulado. Este espera a dona chegar na parte de montar o
 * cupom pra oferecer o resto, no momento em que a explicação vira útil.
 *
 * Aparece uma vez só: o dispensar grava igual ao "vi", pra não voltar a
 * cutucar a cada rolagem.
 */

import { useEffect, useState } from 'react'
import TourSumidos from './TourSumidos'

type Props = {
  /** Já viu (ou dispensou) o segundo tour? */
  jaViu: boolean
  categoria?: string | null
}

export default function ConviteTour2({ jaViu, categoria = null }: Props) {
  const [visivel, setVisivel] = useState(false)
  const [rodando, setRodando] = useState(false)
  const [dispensado, setDispensado] = useState(false)

  /* Só oferece quando a seção de desconto entra na tela. IntersectionObserver
     em vez de listener de scroll: não roda a cada pixel. */
  useEffect(() => {
    if (jaViu || dispensado || rodando) return
    const alvo = document.querySelector('[data-tour="desconto"]')
    if (!alvo) return
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setVisivel(true)
          obs.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    obs.observe(alvo)
    return () => obs.disconnect()
  }, [jaViu, dispensado, rodando])

  function dispensar() {
    setVisivel(false)
    setDispensado(true)
    fetch('/api/admin/tour-sumidos?parte=2', { method: 'POST' }).catch(() => {})
  }

  if (rodando) {
    return <TourSumidos aberto parte={2} categoria={categoria} />
  }

  if (!visivel || jaViu || dispensado) return null

  return (
    <div
      className="fixed left-3 right-3 z-[150] mx-auto admin-card p-4"
      style={{ bottom: 16, maxWidth: 420, boxShadow: '0 12px 40px rgba(0,0,0,0.24)' }}
      role="status"
    >
      <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
        Quer ver como montar o cupom?
      </p>
      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
        Três passos rápidos: escolher o desconto, editar a mensagem do jeito que
        você fala e conferir antes de gerar.
      </p>
      <div className="flex items-center gap-2 mt-3">
        <button
          type="button"
          onClick={() => { setVisivel(false); setRodando(true) }}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          Ver agora
        </button>
        <button
          type="button"
          onClick={dispensar}
          className="px-3 py-2 rounded-xl text-sm font-semibold"
          style={{ color: 'var(--admin-text-faded)' }}
        >
          Não, obrigado
        </button>
      </div>
    </div>
  )
}
