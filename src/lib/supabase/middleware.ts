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
  let supabaseResponse = NextResponse.next({ request })

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
          // 2. recria response pra carregar os cookies atualizados
          supabaseResponse = NextResponse.next({ request })
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
