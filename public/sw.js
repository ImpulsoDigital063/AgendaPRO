// AgendaPRO Service Worker — cache de assets estaticos pra acelerar
// aberturas subsequentes do PWA. Estrategia conservadora: cacheia apenas
// estaticos imutaveis (icones, logos, manifest, chunks /_next/static),
// nao cacheia HTML nem API (sempre fresh, evita problemas de auth/dados).
//
// Atualizacao: incrementar STATIC_CACHE_VERSION pra invalidar cache
// antigo. install() limpa caches de versoes anteriores automaticamente.

// v2 (03/06): bump força os SWs instalados a limpar o cache estático e
// rebaixar os chunks novos pós-deploy da nova UI. Sem isso, app instalado
// (ex: Olímpio) servia chunk JS antigo + HTML novo → hidratação quebrava
// e botões (ex: +Agendar) não respondiam. Bumpar SEMPRE que mudar UI/chunks.
// v3 (24/07): bump ao adicionar os handlers de Web Push (push +
// notificationclick) — força os SWs instalados a pegar a versão que sabe
// mostrar notificação de agendamento novo pro dono.
// v4 (10/08): Olímpio abriu o app e viu a tela SEM CSS — HTML novo carregou
// (não é cacheado) e o CSS novo do deploy morreu no caminho. O fetch abaixo
// não tinha .catch(), então qualquer oscilação de rede matava o recurso em vez
// de tentar o cache. Mesmo sintoma de 03/06, que na época pegou o JS.
// v101 (08/09): dedupe de telefone (painel + importacao) e ficha de cilios
//   liberada pra categoria 'Cilios e sobrancelhas'. Bump porque a aba de
//   Configuracoes mudou.
// v23 (28/08): rotulo de duracao do servico de dia inteiro no link publico.
// v22 (28/08): v122 — serviço mais longo que o turno atravessa o intervalo
//               no link público (DN). Bump porque o BookingFlow mudou.
// v21 (25/08): troca do botão de faturar por "Marcar como atendido" no
// atendimento de convênio + selo do card dividido mostrando a empresa.
// v104 (13/09): período escolhido na mão no Financeiro (pedido da Letícia,
//   Viva Cacheada). Bump porque o seletor de período mudou no mobile e no
//   desktop — sem ele, celular com o app instalado serve a barra antiga.
// v105 (13/09): o seletor de período virou calendário (marca dia inicial e
//   final) e abre como janela sobre a tela. A v104 tinha dois campos de data
//   num painel ancorado no botão, que no celular abria pra fora da tela.
// v106 (13/09): "Relatório financeiro" ganhou entrada própria na seção
//   Financeiro dos dois menus (celular e computador). Até aqui a tela só era
//   alcançável pelo "Ver tudo" do cartão da Início.
// v107 (13/09): calendário de período chegou em Cancelados, Despesas e no
//   financeiro do profissional (as três já usavam a mesma barra Hoje/7/Mês).
// v110 (16/09): telefone da cliente virou campo editável na ficha (celular e
//   computador) e a troca propaga pras cópias do número no negócio inteiro.
// v111 (16/09): previa do link com a cara do negocio, modal de pontos so com
//   Fechar, push do pedido de avaliacao e botoes de avaliacao/indicacao na ficha.
// v112 (17/09): campanha de cupom pros sumidos voltou a achar os clientes
//   (base grande estourava a consulta) e o historico antigo barra ano de 2 digitos.
// v113 (22/09): fuso de Brasilia no cartao do Relatorio financeiro, no bonus,
//   na ficha da cliente e no grafico de Analises (depois das 21h virava amanha).
// v114 (22/09): "o aviso chegou?" — situacao da mensagem dentro do
//   atendimento (celular e computador) e placar + lista na aba Avisos.
// v115 (23/09): aba Avisos mostra a CONVERSA (baloes + tiquinhos + resposta
//   da cliente) no lugar da lista de status.
// v117 (23/09): CSS que nao chega deixa de virar tela azul sem estilo —
//   o service worker avisa a aba, que recarrega uma vez.
// v118 (23/09): aba Avisos explica qual mensagem sai em cada caso (a duvida
//   da Wanessa) e duas perguntas novas nas duvidas frequentes.
// v119 (23/09): convite do tour passa a ser por NEGOCIO — dispensar num
//   cadastro escondia o tour de todos os outros no mesmo navegador.
const STATIC_CACHE_VERSION = 'agendapro-static-v119'

const PRECACHE_URLS = [
  '/icon-192.png',
  '/icon-512.png',
  '/agendapro-icon.svg',
  '/logo-agendapro.svg',
  '/logo-agendapro-dark.svg',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  // Pre-cacheia recursos criticos. skipWaiting() ativa imediatamente
  // (sem esperar todas as abas fecharem) — seguro porque nossa estrategia
  // e cache-first pra estaticos, fresh pra resto.
  event.waitUntil(
    caches
      .open(STATIC_CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  // Limpa caches de versoes antigas + assume controle das abas abertas
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('agendapro-') && k !== STATIC_CACHE_VERSION)
            .map((k) => caches.delete(k))
        )
      ),
      self.clients.claim(),
    ])
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // So intercepta GET — POST/PUT/PATCH/DELETE passa sempre direto
  if (request.method !== 'GET') return

  // So nosso origin — third-party (Supabase, MP, Google fonts) passa direto
  if (url.origin !== self.location.origin) return

  // Cache-first pra estaticos imutaveis
  const isStaticChunk = url.pathname.startsWith('/_next/static/')
  const isPrecached = PRECACHE_URLS.includes(url.pathname)
  const isStaticAsset =
    /\.(png|jpg|jpeg|svg|webp|ico|woff|woff2|ttf|eot)$/.test(url.pathname)

  if (isStaticChunk || isPrecached || isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request)
          .then((response) => {
            // So cacheia se a resposta foi OK e nao e opaca
            if (response.ok && response.type === 'basic') {
              const clone = response.clone()
              caches.open(STATIC_CACHE_VERSION).then((cache) => cache.put(request, clone))
            }
            return response
          })
          .catch(async () => {
            /* TENTA DE NOVO antes de desistir (01/09). Queda de 4G/5G e
               quase sempre instantanea, e a segunda tentativa pega. Sem
               isso, um piscar de rede num arquivo de CSS deixava a pagina
               PELADA ate alguem recarregar — e a cliente do salao nao
               recarrega, ela sai. */
            try {
              const segunda = await fetch(request)
              if (segunda && segunda.ok && segunda.type === 'basic') {
                const clone2 = segunda.clone()
                caches.open(STATIC_CACHE_VERSION).then((cache) => cache.put(request, clone2))
                return segunda
              }
            } catch (e) {
              /* segue pro fallback abaixo */
            }

            // Rede falhou buscando um estatico. SEM este catch, a promise
            // rejeitava e o recurso simplesmente nao chegava — foi assim que
            // o Olimpio abriu o app sem CSS nenhum (10/08). Nao existe fallback
            // possivel pra um chunk com hash novo, mas devolver uma resposta
            // 504 explicita e melhor que rejeitar: o browser trata como erro de
            // recurso e o proximo reload tenta de novo, em vez de ficar num
            // estado quebrado com o SW no meio do caminho.
            const ultimaChance = await caches.match(request, { ignoreSearch: true })
            if (ultimaChance) return ultimaChance

            /* AVISA A PAGINA (23/09/2026). O 504 mudo resolvia o lado do
               service worker e deixava a dona com o pior resultado possivel:
               app aberto, HTML novo, CSS faltando — tudo vira link azul sem
               estilo. Aconteceu com o Olimpio em 10/08 e de novo com o
               Eduardo no app da Marcela.
               Agora a aba e avisada e recarrega UMA vez: o reload busca o
               HTML e os assets de novo da rede, e o que faltou chega. */
            const critico = url.pathname.endsWith('.css') || isStaticChunk
            if (critico) {
              self.clients
                .matchAll({ type: 'window' })
                .then((abas) =>
                  abas.forEach((a) => a.postMessage({ tipo: 'recurso-faltando', url: url.pathname }))
                )
                .catch(() => {})
            }
            return new Response('', { status: 504, statusText: 'asset offline' })
          })
      })
    )
    return
  }

  // Pages HTML, API routes, /admin, /splash → passa direto pra rede
  // (sempre fresh — auth, dados dinamicos, server components)
})

// ============================================================
// WEB PUSH (24/07) — notificacao de agendamento novo pro dono.
// Portado do appdelyvery. O payload {titulo, corpo, url} vem do
// servidor (web-push assinado com VAPID), disparado pela rota
// /api/notify quando um cliente agenda pelo link publico.
// ============================================================

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = {}
  }
  const title = data.titulo || 'AgendaPRO'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.corpo || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [120, 60, 120],
      data: { url: data.url || '/admin' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/admin'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(url)
          return c.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
