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

   ─── 04/11/2026: versão do BUILD, não do sw.js ─────────────────

   Até aqui só havia atualização se alguém lembrasse de bumpar o sw.js. Agora
   o app também pergunta /api/versao (no-store) e compara com o carimbo que
   ele mesmo carrega (NEXT_PUBLIC_APP_VERSAO, next.config.ts). Diferente =
   versão nova no ar, com ou sem bump. Mesmas regras de quando recarregar:
   · abrindo o app ou voltando pra ele, sem estar digitando → troca na hora;
   · escondido → troca na hora;
   · na frente dela, no meio do uso → pílula, e troca quando ela voltar.
   Trava contra laço: no máximo 2 recargas pela mesma versão por sessão; a
   segunda limpa cache e service worker antes. Depois disso, só a pílula.

   E se o app foi instalado por um endereço que nunca recebe código novo
   (prévia de branch, link fixo de deploy), leva pro www.agendapro.net.br
   (ver destinoOficial em src/lib/app-versao.ts).

   Cada abertura conta pro banco versão, endereço e modo (app_presenca, v185)
   — é como a gente prova quem está em qual versão.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react'
import {
  VERSAO_APP,
  destinoOficial,
  registrarPresenca,
  versaoPublicada,
  type AreaApp,
} from '@/lib/app-versao'

const CHAVE_TENTATIVAS = 'agendapro:recarga-versao'

/** Quantas vezes esta sessão já recarregou atrás da versão `alvo`. */
function tentativasPara(alvo: string): number {
  try {
    const j = JSON.parse(sessionStorage.getItem(CHAVE_TENTATIVAS) ?? 'null') as
      | { alvo?: string; n?: number }
      | null
    return j && j.alvo === alvo ? j.n ?? 0 : 0
  } catch {
    return 0
  }
}

function anotarTentativa(alvo: string, n: number) {
  try {
    sessionStorage.setItem(CHAVE_TENTATIVAS, JSON.stringify({ alvo, n }))
  } catch {
    /* sem sessionStorage: a trava `recarregando` ainda evita laço na sessão */
  }
}

export default function AtualizadorPWA({ area = 'admin' }: { area?: AreaApp }) {
  const [temAtualizacao, setTemAtualizacao] = useState(false)
  /* O listener é criado uma vez e não enxerga o estado de renders novos —
     por isso o valor vive também num ref. */
  const pendente = useRef(false)
  const recarregando = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    /* ── Em desenvolvimento, NÃO registra ────────────────────────────
       01/09: passei três rodadas mexendo no hero da tela de WhatsApp e o
       Eduardo continuou vendo a versão antiga em `localhost:3005` — ele
       perguntou por que não tinha mudado nada. Não era o código: era o
       service worker servindo o bundle em cache pro próprio dev server.

       Em produção o cache é o ponto do PWA. Em dev ele só esconde o que
       você acabou de escrever, e faz diagnosticar a camada errada.

       Sai ANTES de registrar qualquer listener, senão o `return` pula a
       função de limpeza lá embaixo e vaza `controllerchange` e
       `visibilitychange` a cada remontagem. E desregistra o que já existe:
       um SW instalado numa sessão anterior sobrevive a este guard sozinho. */
    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker
        .getRegistrations()
        .then((rs) => Promise.all(rs.map((r) => r.unregister())))
        .then(() => (typeof caches !== 'undefined' ? caches.keys() : []))
        .then((chaves) => Promise.all((chaves as string[]).map((c) => caches.delete(c))))
        .catch(() => null)
      return
    }

    /* App instalado num endereço que não acompanha os deploys → oficial.
       replace: não deixa o endereço velho no "voltar". */
    const destino = destinoOficial()
    if (destino) {
      window.location.replace(destino)
      return
    }

    /* Tira o ?_v= da recarga forçada da barra (só cosmético, a página já veio
       nova). */
    try {
      const u = new URL(window.location.href)
      if (u.searchParams.has('_v')) {
        u.searchParams.delete('_v')
        window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash)
      }
    } catch {
      /* ok */
    }

    /* Trava contra laço: `controllerchange` pode disparar mais de uma vez, e
       reload em cima de reload deixa a dona presa numa tela piscando. */
    const recarregar = () => {
      if (recarregando.current) return
      recarregando.current = true
      window.location.reload()
    }

    /* Recarga atrás de uma versão do BUILD. 1ª vez: reload comum (o HTML é
       no-store e traz os chunks novos). 2ª vez pela mesma versão: limpa os
       caches do app, desregistra o service worker e navega com ?_v= pra furar
       qualquer cache de memória do WebKit. 3ª: desiste e deixa a pílula. */
    const recarregarPara = (alvo: string) => {
      if (recarregando.current) return
      const n = tentativasPara(alvo)
      if (n >= 2) {
        setTemAtualizacao(true)
        return
      }
      anotarTentativa(alvo, n + 1)
      recarregando.current = true
      if (n === 0) {
        window.location.reload()
        return
      }
      const limpar = async () => {
        try {
          const rs = await navigator.serviceWorker.getRegistrations()
          await Promise.all(rs.map((r) => r.unregister()))
        } catch {
          /* ok */
        }
        try {
          if (typeof caches !== 'undefined') {
            const ks = await caches.keys()
            await Promise.all(ks.filter((k) => k.startsWith('agendapro-')).map((k) => caches.delete(k)))
          }
        } catch {
          /* ok */
        }
      }
      void limpar().finally(() => {
        const u = new URL(window.location.href)
        u.searchParams.set('_v', alvo.slice(-8))
        window.location.replace(u.toString())
      })
    }

    let versaoNova: string | null = null

    /* Página que abriu SEM service worker no controle (primeira visita, ou
       logo depois da limpeza da 2ª tentativa acima): o primeiro
       `controllerchange` é só o sw assumindo, não versão nova. Antes isso
       virava uma recarga a mais na volta seguinte (visto no teste de 04/11). */
    let ignorarPrimeiraTroca = !navigator.serviceWorker.controller
    const marcar = () => {
      if (ignorarPrimeiraTroca) {
        ignorarPrimeiraTroca = false
        return
      }
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

    /* Compara o build carregado com o publicado. `momento`:
       · 'abertura' / 'volta' — ela acabou de abrir ou voltar: sem digitar,
         troca na hora (é o caso do iPhone preso na versão velha);
       · 'intervalo' — ela pode estar no meio de algo: escondido troca,
         visível só marca e mostra a pílula. */
    const checarVersao = async (momento: 'abertura' | 'volta' | 'intervalo') => {
      const publicada = await versaoPublicada()
      if (!publicada || publicada === VERSAO_APP) return
      versaoNova = publicada
      pendente.current = true
      if (document.visibilityState === 'hidden') recarregarPara(publicada)
      else if (momento !== 'intervalo' && !digitando()) recarregarPara(publicada)
      else setTemAtualizacao(true)
    }

    const aoVoltar = () => {
      if (document.visibilityState !== 'visible') return
      void registro?.update().catch(() => null)
      void registrarPresenca(area)
      if (pendente.current && !digitando()) {
        if (versaoNova) recarregarPara(versaoNova)
        else recarregar()
        return
      }
      void checarVersao('volta')
    }

    /* ── Tela sem estilo: recarrega UMA vez ──────────────────────────
       Quando um CSS ou chunk nao chega, o service worker devolve 504 e a
       tela abre sem estilo nenhum — tudo link azul (Olimpio 10/08, Eduardo
       no app da Marcela em 23/09). O proprio sw avisa aqui; o reload busca
       HTML e assets de novo e resolve.

       Duas travas, porque reload automatico e faca de dois gumes:
       · UMA vez por sessao (sessionStorage) — rede ruim nao vira piscada;
       · so ONLINE. Offline, recarregar troca a tela feia por uma tela de
         erro do navegador, e ai ela perde ate o que estava na frente. */
    const aoFaltarRecurso = (e: MessageEvent) => {
      if ((e.data as { tipo?: string } | null)?.tipo !== 'recurso-faltando') return
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return
      try {
        if (sessionStorage.getItem('agendapro:recarga-recurso')) return
        sessionStorage.setItem('agendapro:recarga-recurso', '1')
      } catch {
        /* navegador sem sessionStorage (aba privada antiga): segue e
           recarrega — a trava do `recarregando` ainda evita o laco. */
      }
      recarregar()
    }

    /* ── Toque na notificação: abrir o endereço do aviso ─────────────
       No iPhone o app instalado abre pela notificação na tela de início
       (agenda), ignorando o navigate/openWindow do sw (Marcela 06/11: push
       de Metas abria a agenda). O sw agora (v227) deixa o endereço guardado
       no Cache Storage e também manda postMessage; aqui a tela vai até ele.
       Vale 2 min e é apagado antes de navegar, então não vira laço. */
    const irPara = (url: string) => {
      try {
        const alvo = new URL(url, window.location.origin)
        if (alvo.origin !== window.location.origin) return
        if (alvo.pathname + alvo.search === window.location.pathname + window.location.search) return
        window.location.assign(alvo.pathname + alvo.search + alvo.hash)
      } catch {
        /* endereço inválido: fica onde está */
      }
    }
    const abrirPendente = async () => {
      try {
        if (typeof caches === 'undefined') return
        const c = await caches.open('aviso-abrir')
        const r = await c.match('/__abrir')
        if (!r) return
        await c.delete('/__abrir')
        const { url, em } = (await r.json()) as { url?: string; em?: number }
        if (url && em && Date.now() - em < 2 * 60 * 1000) irPara(url)
      } catch {
        /* sem cache: segue na tela */
      }
    }
    const aoAbrirPeloAviso = (e: MessageEvent) => {
      const d = e.data as { tipo?: string; url?: string } | null
      if (d?.tipo !== 'abrir' || !d.url) return
      void caches?.open('aviso-abrir').then((c) => c.delete('/__abrir')).catch(() => null)
      irPara(d.url)
    }
    const aoVoltarAbrir = () => { if (document.visibilityState === 'visible') void abrirPendente() }
    void abrirPendente()

    navigator.serviceWorker.addEventListener('controllerchange', marcar)
    navigator.serviceWorker.addEventListener('message', aoFaltarRecurso)
    navigator.serviceWorker.addEventListener('message', aoAbrirPeloAviso)
    document.addEventListener('visibilitychange', aoVoltar)
    document.addEventListener('visibilitychange', aoVoltarAbrir)

    let intervalo: ReturnType<typeof setInterval> | null = null

    void checarVersao('abertura')
    void registrarPresenca(area)
    const intervaloVersao = setInterval(() => void checarVersao('intervalo'), 15 * 60 * 1000)

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
      navigator.serviceWorker.removeEventListener('message', aoFaltarRecurso)
      navigator.serviceWorker.removeEventListener('message', aoAbrirPeloAviso)
      document.removeEventListener('visibilitychange', aoVoltarAbrir)
      document.removeEventListener('visibilitychange', aoVoltar)
      if (intervalo) clearInterval(intervalo)
      clearInterval(intervaloVersao)
    }
  }, [area])

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
