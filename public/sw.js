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
// v21 (25/08): troca do botão de faturar por "Marcar como atendido" no
// atendimento de convênio + selo do card dividido mostrando a empresa.
const STATIC_CACHE_VERSION = 'agendapro-static-v42'

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
            // Rede falhou buscando um estatico. SEM este catch, a promise
            // rejeitava e o recurso simplesmente nao chegava — foi assim que
            // o Olimpio abriu o app sem CSS nenhum (10/08). Nao existe fallback
            // possivel pra um chunk com hash novo, mas devolver uma resposta
            // 504 explicita e melhor que rejeitar: o browser trata como erro de
            // recurso e o proximo reload tenta de novo, em vez de ficar num
            // estado quebrado com o SW no meio do caminho.
            const ultimaChance = await caches.match(request, { ignoreSearch: true })
            if (ultimaChance) return ultimaChance
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
