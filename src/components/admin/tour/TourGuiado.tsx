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

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from '@/components/ui/Icon'

export type PassoTour = {
  /** data-tour do elemento destacado. Vazio = balão centralizado, sem alvo.
      Aceita alternativas separadas por | (vale a primeira visível). */
  alvo: string
  titulo: string
  corpo: string
  /**
   * Botão de ação no lugar do "Próximo/Entendi". Clicar ENCERRA o tour (grava
   * "já viu") e executa — serve pra levar a dona a outra tela, como abrir o
   * editor de um aviso. Use só no último passo: depois dele não há "Próximo".
   */
  acao?: { rotulo: string; executar: () => void }
  /** 'rodape' prende o balão embaixo da tela, pra não tampar o que vem logo
      abaixo do alvo (ex. números de uma tela financeira). */
  posicao?: 'auto' | 'rodape'
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
  /** Troca o "1 de 3" do topo. O tour do sistema usa pra mostrar a parte. */
  contador?: string
  /** Texto fixo do botão de sair. Sem ele: "Agora não" no passo com ação, "Pular" nos outros. */
  rotuloSair?: string
  /** Mostra "Voltar" também no 1º passo (volta pra etapa anterior de um roteiro maior). */
  aoVoltarInicio?: () => void
}

/** Primeiro elemento VISÍVEL entre as alternativas: o mesmo data-tour pode
    existir escondido (versão de outra largura de tela). */
export function acharAlvo(alvo: string): HTMLElement | null {
  for (const nome of alvo.split('|')) {
    const els = document.querySelectorAll<HTMLElement>(`[data-tour="${nome.trim()}"]`)
    for (const el of Array.from(els)) {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) return el
    }
  }
  return null
}

type Caixa = { top: number; left: number; width: number; height: number }

/** Rola o container que de fato rola (no celular o painel rola numa div, não
    na janela, e o scrollIntoView com scroll-margin não levava o alvo pro
    lugar: teste mobile 14/09). `topoDesejado` = onde o topo do alvo deve
    parar, em px a partir do topo da tela. */
function rolarAlvo(el: HTMLElement, topoDesejado: number) {
  const r = el.getBoundingClientRect()
  const delta = r.top - topoDesejado
  let pai: HTMLElement | null = el.parentElement
  while (pai) {
    const st = getComputedStyle(pai)
    if (/(auto|scroll)/.test(st.overflowY) && pai.scrollHeight > pai.clientHeight) {
      pai.scrollBy({ top: delta, behavior: 'smooth' })
      return
    }
    pai = pai.parentElement
  }
  window.scrollBy({ top: delta, behavior: 'smooth' })
}

export default function TourGuiado({ aberto, passos, rotulo, aoEncerrar, contador, rotuloSair, aoVoltarInicio }: Props) {
  const [i, setI] = useState(0)
  const [caixa, setCaixa] = useState<Caixa | null>(null)
  const [pronto, setPronto] = useState(false)
  const [fechado, setFechado] = useState(false)
  /* Altura real do balão: no celular o texto quebra mais e o balão passa de
     300px; com altura fixa ele saía cortado no fim da tela (Comissão). */
  const balaoRef = useRef<HTMLDivElement>(null)
  const [altura, setAltura] = useState(230)

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
    const el = acharAlvo(passo.alvo)
    if (!el) { setCaixa(null); return }
    /* Alvo grande (uma aba inteira): rola até o TOPO dele deixando espaço pro
       balão em cima. Centralizar jogava o balão no rodapé, por cima dos
       botões da própria aba (teste 14/09). */
    const vh0 = window.innerHeight
    const r0 = el.getBoundingClientRect()
    const grande = r0.height > vh0 * 0.45
    /* Alvo grande: topo dele desce o bastante pra caber o balão em cima.
       Alvo pequeno: fica um pouco acima do meio, sobrando espaço embaixo. */
    const reserva = window.innerWidth < 640 ? 300 : 250
    rolarAlvo(el, grande ? reserva : Math.max(80, vh0 * 0.35 - r0.height / 2))
    const medir = () => {
      const r = el.getBoundingClientRect()
      setCaixa({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    medir()
    const t = setTimeout(medir, 450) // depois do scroll suave
    /* A tela ainda pode mudar depois de medir: lista que carrega empurra o
       alvo pra baixo (Fichas modelo apontou pra um espaço vazio). */
    const ro = new ResizeObserver(medir)
    ro.observe(document.body)
    ro.observe(el)
    window.addEventListener('resize', medir)
    window.addEventListener('scroll', medir, true)
    return () => {
      clearTimeout(t)
      ro.disconnect()
      window.removeEventListener('resize', medir)
      window.removeEventListener('scroll', medir, true)
    }
  }, [i, aberto, fechado, passos])

  useLayoutEffect(() => {
    const h = balaoRef.current?.offsetHeight
    if (h && Math.abs(h - altura) > 2) setAltura(h)
  })

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

  /* Posição vertical: alvo grande → balão em cima dele (a tela já rolou pra
     abrir esse espaço); passo com posicao 'rodape' → preso embaixo (cabeçalho
     de tela de números, pra não tampar o principal logo abaixo); senão
     embaixo do alvo, ou em cima se não couber. Sem alvo, centralizado. */
  const vw = window.innerWidth
  const vh = window.innerHeight
  const espacoAbaixo = caixa ? vh - (caixa.top + caixa.height) : 0
  const grande = caixa ? caixa.height > vh * 0.45 : false
  const precisa = altura + margem + 12
  const vertical: React.CSSProperties = !caixa
    ? { top: '50%', transform: 'translateY(-50%)' }
    : passo.posicao === 'rodape'
      ? { bottom: 12 }
      : grande && caixa.top >= precisa
        ? { bottom: vh - caixa.top + margem }
        : !grande && espacoAbaixo >= precisa
          ? { top: caixa.top + caixa.height + margem }
          : caixa.top >= precisa
            ? { bottom: vh - caixa.top + margem }
            : { bottom: 12 }

  /* Horizontal: no celular ocupa a largura; em tela larga fica alinhado com
     o alvo (antes ficava sempre no meio, longe dos botões da direita). */
  const largura = 420
  const horizontal: React.CSSProperties = vw < 640 || !caixa || grande
    ? { left: 12, right: 12, marginLeft: 'auto', marginRight: 'auto' }
    : {
        left: Math.min(Math.max(caixa.left + caixa.width / 2 - largura / 2, 12), vw - largura - 12),
        width: largura,
      }
  const balao: React.CSSProperties = { position: 'fixed', ...vertical, ...horizontal }

  /* Contorno nunca passa da borda da tela (cabeçalho fixo é mais largo que o
     conteúdo e o contorno saía cortado à direita). */
  const contorno = caixa
    ? (() => {
        const left = Math.max(caixa.left - 6, 4)
        const right = Math.min(caixa.left + caixa.width + 6, vw - 4)
        return { top: caixa.top - 6, left, width: right - left, height: caixa.height + 12 }
      })()
    : null

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label={rotulo}>
      {contorno ? (
        <div
          className="absolute rounded-2xl pointer-events-none transition-all duration-200"
          style={{
            top: contorno.top,
            left: contorno.left,
            width: contorno.width,
            height: contorno.height,
            boxShadow: '0 0 0 9999px rgba(15,23,42,0.62)',
            border: '2px solid var(--admin-accent)',
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.62)' }} />
      )}

      <div
        ref={balaoRef}
        className="admin-card p-4 mx-auto"
        style={{ ...balao, maxWidth: largura, boxShadow: '0 12px 40px rgba(0,0,0,0.28)' }}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-accent)' }}>
            {contador ?? `${i + 1} de ${passos.length}`}
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

        {/* Celular: o botão de seguir ganha a linha toda (rótulos como
            "Próximo: profissionais" estouravam o balão em 378px); Sair e
            Voltar ficam embaixo. sm: volta a linha única do desktop. */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 mt-4">
          <button type="button" onClick={encerrar} className="text-sm font-semibold px-2 py-2 whitespace-nowrap" style={{ color: 'var(--admin-text-faded)' }}>
            {rotuloSair ?? (passo.acao ? 'Agora não' : 'Pular')}
          </button>
          <div className="flex-1 hidden sm:block" />
          {(i > 0 || aoVoltarInicio) && (
            <button
              type="button"
              onClick={() => (i > 0 ? setI(i - 1) : aoVoltarInicio?.())}
              className="ml-auto sm:ml-0 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap"
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
              className="order-first sm:order-none w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-sm font-semibold whitespace-nowrap"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              {passo.acao.rotulo}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => (ultimo ? encerrar() : setI(i + 1))}
              className="order-first sm:order-none w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-sm font-semibold whitespace-nowrap"
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
