'use client'

/* ═══════════════════════════════════════════════════════════════
   O APP SE ATUALIZA SOZINHO

   Eduardo, 01/09: "no meu caso, que tô no PWA, como é que o cliente vai
   saber que tem que fechar e abrir o app pra mostrar atualizado? isso não
   era pro app fazer automaticamente?"

   Ele está certo, e o problema era maior que o teste dele. Duas falhas:

   1. O `sw.js` já fazia `skipWaiting()` + `clients.claim()`, então o service
      worker novo assume na hora. Mas ASSUMIR NÃO RECARREGA: o JavaScript que
      está rodando continua sendo o antigo até alguém dar refresh. Por isso
      cada deploy exigia pedir "recarrega a página" — e cliente nenhum sabe
      disso. Ela instala o app e fica num código velho por dias.

   2. O service worker só era registrado dentro do fluxo de push
      (`src/lib/push.ts`). Quem nunca ativou notificação podia não ter
      registro nenhum — nem cache, nem atualização.

   ─── Quando recarregar, que é a parte delicada ────────────────

   Recarregar no instante em que a versão nova chega perderia o que a dona
   estivesse digitando: comanda aberta, ficha de anamnese, texto de mensagem.
   Então:

   · Aba ESCONDIDA quando a versão nova assume → recarrega na hora. Ela saiu
     do app (foi ao banco, ao WhatsApp) e volta já atualizada. É exatamente o
     caso do Eduardo pagando o PIX.
   · Aba na frente dela → pílula discreta "Atualização disponível". Ela
     decide quando, e não perde nada.
   · Voltou pro app com atualização pendente e sem estar digitando → troca
     sozinho, sem perguntar.

   E procura versão nova de propósito: o navegador só busca `sw.js` sozinho
   de vez em quando. Aqui pergunta a cada 15 minutos e toda vez que ela volta.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react'

export default function AtualizadorPWA() {
  const [temAtualizacao, setTemAtualizacao] = useState(false)
  /* O listener é criado uma vez e não enxerga o estado de renders novos —
     por isso o valor vive também num ref. */
  const pendente = useRef(false)
  const recarregando = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    /* Trava contra laço: `controllerchange` pode disparar mais de uma vez, e
       reload em cima de reload deixa a dona presa numa tela piscando. */
    const recarregar = () => {
      if (recarregando.current) return
      recarregando.current = true
      window.location.reload()
    }

    const marcar = () => {
      pendente.current = true
      if (document.visibilityState === 'hidden') recarregar()
      else setTemAtualizacao(true)
    }

    const digitando = () => {
      const f = document.activeElement
      return (
        f instanceof HTMLInputElement ||
        f instanceof HTMLTextAreaElement ||
        (f instanceof HTMLElement && f.isContentEditable)
      )
    }

    let registro: ServiceWorkerRegistration | null = null

    const aoVoltar = () => {
      if (document.visibilityState !== 'visible') return
      void registro?.update().catch(() => null)
      if (pendente.current && !digitando()) recarregar()
    }

    navigator.serviceWorker.addEventListener('controllerchange', marcar)
    document.addEventListener('visibilitychange', aoVoltar)

    let intervalo: ReturnType<typeof setInterval> | null = null

    /* Registra aqui e não só no push: é o que garante que TODO mundo tenha
       service worker, inclusive quem recusou notificação. */
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        registro = reg
        void reg.update().catch(() => null)
        intervalo = setInterval(() => void reg.update().catch(() => null), 15 * 60 * 1000)
      })
      .catch(() => {
        /* Sem service worker o app funciona igual, só não cacheia. */
      })

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', marcar)
      document.removeEventListener('visibilitychange', aoVoltar)
      if (intervalo) clearInterval(intervalo)
    }
  }, [])

  if (!temAtualizacao) return null

  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="fixed left-1/2 -translate-x-1/2 z-[200] rounded-full px-4 py-2.5 text-[13px] font-semibold shadow-lg"
      style={{
        bottom: 'calc(88px + env(safe-area-inset-bottom))',
        background: 'var(--admin-text)',
        color: 'var(--admin-bg)',
      }}
    >
      Atualização disponível · tocar para aplicar
    </button>
  )
}
