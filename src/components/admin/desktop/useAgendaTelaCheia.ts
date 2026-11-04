'use client'

/* ============================================================
 * Tela cheia da agenda (Eduardo, 04/11/2026)
 *
 * Pra recepção deixar a grade aberta no computador/tablet do balcão: some
 * menu, topbar, dock e faixas de aviso; a grade ocupa a tela inteira.
 *
 * COMO FUNCIONA (e por que assim):
 * - O modo é um atributo no <html> (data-agenda-cheia). O CSS em globals.css
 *   só age com ele ligado — nenhuma outra tela do admin muda.
 * - O fullscreen do navegador é pedido no documentElement, NUNCA num elemento
 *   filho: drawer do atendimento, modal de agendar e calendário montam via
 *   portal no <body>; com fullscreen num filho eles sumiriam.
 * - Onde não existe Fullscreen API (iPhone Safari), o modo vale só pelo CSS.
 * - NUNCA abre sozinho (Eduardo, 04/11): recarregar ou abrir o app sempre
 *   começa na agenda normal. Nada é lembrado no aparelho; a chave que a 1ª
 *   versão de teste gravava é apagada ao montar.
 * - Sair: botão, Esc (quando não há modal aberto) ou saída do fullscreen do
 *   navegador (evento fullscreenchange).
 * ============================================================ */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

const ATTR = 'data-agenda-cheia'
/* Chave da 1ª versão (lembrava por aparelho) · só pra limpar quem testou. */
const CHAVE_ANTIGA = 'agendapro:agenda-tela-cheia'

/* Estado de módulo: sobrevive a remontagem do cabeçalho (troca de dia). */
let navegadorEmTelaCheia = false
let montados = 0

type DocFs = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}
type ElFs = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

function elementoFullscreen(): Element | null {
  const d = document as DocFs
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null
}

function pedirFullscreenNavegador() {
  const el = document.documentElement as ElFs
  try {
    if (typeof el.requestFullscreen === 'function') {
      el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {})
    } else if (typeof el.webkitRequestFullscreen === 'function') {
      void el.webkitRequestFullscreen()
    }
  } catch {
    /* sem suporte: segue só com o CSS */
  }
}

function sairFullscreenNavegador() {
  const d = document as DocFs
  try {
    if (!elementoFullscreen()) return
    if (typeof d.exitFullscreen === 'function') d.exitFullscreen().catch(() => {})
    else if (typeof d.webkitExitFullscreen === 'function') void d.webkitExitFullscreen()
  } catch {
    /* ignora */
  }
}

function limparChaveAntiga() {
  try {
    window.localStorage.removeItem(CHAVE_ANTIGA)
  } catch {
    /* storage bloqueado: nada a limpar */
  }
}

function temModalAberto(): boolean {
  return !!document.querySelector('[role="dialog"][aria-modal="true"]')
}

/** Lê se a tela cheia está ligada (atributo no <html>) · pra grade adensar as
 *  linhas e alargar colunas só nesse modo. Fora dele devolve false. */
function assinarAtributo(cb: () => void) {
  const mo = new MutationObserver(cb)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: [ATTR] })
  return () => mo.disconnect()
}
export function useTelaCheiaAtiva(): boolean {
  return useSyncExternalStore(
    assinarAtributo,
    () => document.documentElement.hasAttribute(ATTR),
    () => false,
  )
}

export function useAgendaTelaCheia(habilitado: boolean) {
  const [ativo, setAtivo] = useState(false)

  const aplicar = useCallback((on: boolean) => {
    if (on) document.documentElement.setAttribute(ATTR, '')
    else document.documentElement.removeAttribute(ATTR)
    setAtivo(on)
  }, [])

  const desligar = useCallback(() => {
    aplicar(false)
    sairFullscreenNavegador()
  }, [aplicar])

  const ligar = useCallback(() => {
    aplicar(true)
    pedirFullscreenNavegador()
  }, [aplicar])

  useEffect(() => {
    if (!habilitado) return
    montados++

    limparChaveAntiga()
    // Só troca de dia DENTRO da tela cheia (navegador ainda em fullscreen)
    // remonta já ligado. Abrir/recarregar o app: sempre agenda normal.
    if (navegadorEmTelaCheia && elementoFullscreen()) aplicar(true)

    function onFullscreenChange() {
      const el = elementoFullscreen()
      if (el) {
        if (el === document.documentElement) navegadorEmTelaCheia = true
        return
      }
      if (!navegadorEmTelaCheia) return
      navegadorEmTelaCheia = false
      // Esc com o drawer aberto: o navegador sai do fullscreen, mas a pessoa
      // queria fechar o drawer. Mantém o modo CSS; o próximo Esc fecha o drawer.
      if (temModalAberto()) return
      desligar()
    }

    // Captura: roda ANTES do Esc do drawer, enquanto o modal ainda está no DOM.
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (!document.documentElement.hasAttribute(ATTR)) return
      if (temModalAberto()) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      desligar()
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('webkitfullscreenchange', onFullscreenChange)
    window.addEventListener('keydown', onKeyDown, true)

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange)
      window.removeEventListener('keydown', onKeyDown, true)
      montados--
      // Saiu da agenda (outra tela do admin): o chrome volta na hora.
      document.documentElement.removeAttribute(ATTR)
      // Se nada remontou (não foi só troca de dia), larga o fullscreen do navegador.
      window.setTimeout(() => {
        if (montados === 0 && navegadorEmTelaCheia) {
          navegadorEmTelaCheia = false
          sairFullscreenNavegador()
        }
      }, 400)
    }
  }, [habilitado, aplicar, desligar])

  return { ativo: habilitado && ativo, ligar, desligar }
}
