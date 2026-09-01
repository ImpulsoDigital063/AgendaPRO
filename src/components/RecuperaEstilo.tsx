'use client'

/* ═══════════════════════════════════════════════════════════════
   PÁGINA SEM CSS SE CONSERTA SOZINHA

   Eduardo abriu o link público do Studio Marcela em 01/09 e a página veio
   HTML cru: logo gigante, links sublinhados, botão do modal como um "X"
   solto. Não é a primeira vez — o próprio `sw.js` registra: "foi assim que
   o Olimpio abriu o app sem CSS nenhum (10/08)".

   ─── Por que acontece ─────────────────────────────────────────

   O service worker faz cache-first em `/_next/static/`, e quando a rede
   falha buscando um chunk ele devolve `504` em vez de rejeitar a promise
   (rejeitar era pior: deixava o recurso sem chegar e o app num limbo). Mas
   `504` num arquivo de CSS é o mesmo que não ter CSS: o navegador registra
   erro no recurso e segue renderizando a página pelada. E fica assim até
   alguém recarregar — coisa que a CLIENTE do salão não vai fazer. Ela sai.

   ─── O conserto ───────────────────────────────────────────────

   Duas metades, e as duas precisam existir:

   · No `sw.js`: tenta de novo antes de desistir. Queda de 4G/5G é quase
     sempre instantânea, e uma segunda tentativa resolve.
   · Aqui: se mesmo assim a folha de estilo não entrou, recarrega uma vez.

   A trava do `sessionStorage` é o que impede laço de reload numa rede que
   caiu de vez — falhando duas vezes, a página fica feia mas navegável, que
   é melhor que piscar pra sempre.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect } from 'react'

const TRAVA = 'ap_estilo_recarregado'

export default function RecuperaEstilo() {
  useEffect(() => {
    let jaTentou = false
    try {
      jaTentou = sessionStorage.getItem(TRAVA) === '1'
    } catch {
      /* modo privado bloqueia storage — segue sem a trava */
    }

    const recarregarUmaVez = () => {
      if (jaTentou) return
      jaTentou = true
      try {
        sessionStorage.setItem(TRAVA, '1')
      } catch {
        /* sem storage, o risco de laço existe — por isso a trava local
           `jaTentou` também segura dentro desta mesma sessão de página */
      }
      window.location.reload()
    }

    /* Falha explícita de <link rel="stylesheet">. Vem em captura porque
       `error` de recurso não borbulha. */
    const aoFalhar = (e: Event) => {
      const alvo = e.target
      if (alvo instanceof HTMLLinkElement && alvo.rel === 'stylesheet') {
        recarregarUmaVez()
      }
    }
    window.addEventListener('error', aoFalhar, true)

    /* Rede de segurança: alguns navegadores não emitem `error` no link e a
       folha simplesmente não aplica. Se depois do load não houver NENHUMA
       regra de estilo própria, a página está pelada. */
    const conferir = () => {
      let regras = 0
      try {
        for (const f of Array.from(document.styleSheets)) {
          try {
            regras += f.cssRules?.length ?? 0
          } catch {
            /* folha de outra origem (Google Fonts) não deixa ler as regras —
               mas o fato de existir já indica que o CSS carregou */
            regras += 1
          }
        }
      } catch {
        return
      }
      if (regras === 0) recarregarUmaVez()
    }

    const t = setTimeout(conferir, 1200)
    return () => {
      window.removeEventListener('error', aoFalhar, true)
      clearTimeout(t)
    }
  }, [])

  return null
}
