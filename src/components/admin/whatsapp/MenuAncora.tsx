'use client'

/* ═══════════════════════════════════════════════════════════════
   MENU ÂNCORA — o que faz a página longa não assustar

   É a peça central da landing da Trinks, e a que menos parece importante
   olhando o print: cinco pílulas logo abaixo do hero. O efeito é que a
   dona VÊ que existe "Preços" e "Dúvidas frequentes" antes de rolar. Sem
   isso, página comprida dentro do sistema lê como parede de texto e ela
   fecha antes de chegar no preço.

   Duas diferenças do original:

   1. NÃO TEM "O QUE É?". A Trinks precisa porque a página abre pra quem
      talvez nem seja cliente. A nossa abre pra quem já usa o sistema todo
      dia — reexplicar a empresa pra quem está logado nela é desperdiçar a
      primeira dobra. O hero já é o "o que é".

   2. A PÍLULA ATIVA ACENDE. Enquanto ela rola, o menu mostra onde ela
      está. É orientação, não enfeite: numa página de 6 seções sem barra de
      progresso, a pílula acesa é o único sinal de "quanto falta".

   `scroll-margin-top` mora nas seções (via a classe `secao-ancora` no
   globals), não aqui — senão a seção para colada embaixo do próprio menu.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react'
import { WA } from './ui'

export type Ancora = { id: string; rotulo: string }

export const ANCORAS: Ancora[] = [
  { id: 'como-funciona', rotulo: 'Como funciona' },
  { id: 'beneficios', rotulo: 'O que você ganha' },
  { id: 'precos', rotulo: 'Preços' },
  { id: 'duvidas', rotulo: 'Dúvidas' },
]

export default function MenuAncora() {
  const [ativa, setAtiva] = useState<string>(ANCORAS[0].id)

  useEffect(() => {
    const alvos = ANCORAS.map((a) => document.getElementById(a.id)).filter(
      (e): e is HTMLElement => !!e,
    )
    if (!alvos.length) return

    /* `rootMargin` corta a janela numa faixa no terço de cima: a seção
       ativa é a que está entrando, não a que ocupa mais pixel. Sem isso a
       última seção nunca acende, porque nunca chega ao meio da tela. */
    const obs = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visivel) setAtiva(visivel.target.id)
      },
      { rootMargin: '-12% 0px -70% 0px', threshold: 0 },
    )
    alvos.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const ir = (id: string) => {
    const alvo = document.getElementById(id)
    if (!alvo) return
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    alvo.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' })
  }

  return (
    <nav
      /* Gruda no topo do scroll do painel. `-mx` + `px` devolve a sangria
         pro fundo cobrir a largura toda quando ela rola por baixo. */
      className="sticky top-0 z-20 -mx-4 px-4 lg:-mx-8 lg:px-8 py-3 mt-8"
      style={{
        background: 'rgba(255,255,255,0.86)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--admin-divider)',
      }}
      aria-label="Seções desta página"
    >
      {/* Rola de lado no mobile em vez de quebrar linha: quatro pílulas em
          duas fileiras empurram o conteúdo e comem a dobra. */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {ANCORAS.map((a) => {
          const acesa = a.id === ativa
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => ir(a.id)}
              aria-current={acesa ? 'true' : undefined}
              className="flex-shrink-0 rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition-all"
              style={
                acesa
                  ? { background: WA.fundo, color: WA.forte, border: `1px solid ${WA.borda}` }
                  : {
                      background: 'var(--admin-surface-hover)',
                      color: 'var(--admin-text-2)',
                      border: '1px solid transparent',
                    }
              }
            >
              {a.rotulo}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
