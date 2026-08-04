import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * updateSession — renova o access token do Supabase a cada request
 * e propaga os cookies atualizados pro browser.
 *
 * REQUERIDO pelo @supabase/ssr. Sem isso:
 *  - Token de acesso (vida ~1h) não é renovado em background
 *  - Usuário cai pra tela de login depois de ~1h de uso
 *  - PWA instalado parece "deslogar sozinho" porque o tempo entre uso
 *    e retorno extrapola a janela do token
 *
 * Padrão oficial Supabase Next.js App Router (não inventar variações).
 */
export async function updateSession(request: NextRequest) {
  // Propaga a pathname atual pro request downstream (Server Components não têm
  // acesso à URL de outra forma). O gate do admin usa isso pra, quando o trial
  // vence, redirecionar pra a aba de Plano SEM causar loop (exceção pra própria
  // tela de config). Cravado 22/07.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })

  /* VISITANTE NÃO TEM O QUE RENOVAR (04/08/2026)
     ─────────────────────────────────────────────────────────────────
     O matcher pega quase tudo, então até aqui o getUser() lá embaixo
     rodava em TODA visita à página pública de agendamento, às landing
     pages e às páginas de resposta — nenhuma delas tem sessão. Era uma
     ida ao Auth do Supabase, mais CPU de função, por visita de cliente
     final. Ficou mais caro hoje: acabamos de abrir 42 URLs pro Google,
     que vai rastejar todas elas.

     Mesmo conserto do ComandaPRO (dd1b81d, 29/07), onde o estouro foi
     medido: 1.193.071 invocações de 1M e 7h51 de CPU de 4h.

     Quem TEM cookie segue o caminho completo — o refresh de token
     continua intacto. Sem ele o dono desloga sozinho em ~1h, que foi o
     bug reportado na demo do Olímpio em 11/05.

     A resposta devolvida aqui já carrega o x-pathname setado acima; o
     gate do admin depende dele, por isso a saída é DEPOIS do
     NextResponse.next, não antes. */
  const temSessao = request.cookies.getAll().some((c) => c.name.startsWith('sb-'))
  if (!temSessao) return supabaseResponse

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 1. propaga pro request (pra rotas downstream lerem o cookie novo)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // 2. recria response pra carregar os cookies atualizados (mantendo x-pathname)
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
          // 3. seta cookies no response (vai pro browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: getUser() force a verificação do JWT e disparando refresh
  // se o access token expirou. Apenas chamar é suficiente — não usamos o
  // return aqui, mas o efeito colateral (refresh + set cookies) é o que
  // mantém a sessão viva.
  await supabase.auth.getUser()

  return supabaseResponse
}
