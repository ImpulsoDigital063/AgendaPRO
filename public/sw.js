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
const STATIC_CACHE_VERSION = 'agendapro-static-v2'

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
        return fetch(request).then((response) => {
          // So cacheia se a resposta foi OK e nao e opaca
          if (response.ok && response.type === 'basic') {
            const clone = response.clone()
            caches.open(STATIC_CACHE_VERSION).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Pages HTML, API routes, /admin, /splash → passa direto pra rede
  // (sempre fresh — auth, dados dinamicos, server components)
})
