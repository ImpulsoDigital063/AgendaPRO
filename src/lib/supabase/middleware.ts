import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Renova o token quando faltar menos que isso pra vencer. O access token do
 *  Supabase vive ~1h, então com 10 min de folga a renovação acontece ~1x por
 *  hora de uso em vez de a cada clique. Folga generosa de propósito: o custo
 *  de renovar cedo demais é uma chamada; o de renovar tarde demais é o dono
 *  deslogado no meio do atendimento. */
const MARGEM_RENOVACAO_SEGUNDOS = 600

/**
 * Quanto falta (em segundos) pro access token vencer, lendo o cookie de sessão
 * SEM chamar o servidor de Auth.
 *
 * Por que dá pra confiar nisso aqui: não estamos autenticando ninguém, só
 * decidindo SE vale a pena renovar. Quem autoriza de verdade continua sendo o
 * `getUser()` do lado da página/rota, que valida a assinatura no servidor. Um
 * cookie adulterado com `exp` no futuro não libera nada — só faz o middleware
 * pular uma renovação, e a página derruba o acesso do mesmo jeito.
 *
 * Devolve null quando não consegue ler com certeza (formato novo do cookie,
 * chunk faltando, base64 quebrado). null = renova, que é o comportamento
 * antigo. Nunca deixa de renovar por dúvida.
 */
function segundosAteVencer(request: NextRequest): number | null {
  try {
    // O cookie de sessão pode vir partido em pedaços (.0, .1) quando é grande.
    const pedacos = request.cookies
      .getAll()
      .filter((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))
      .sort((a, b) => a.name.localeCompare(b.name))
    if (pedacos.length === 0) return null

    let bruto = pedacos.map((c) => c.value).join('')
    if (bruto.startsWith('base64-')) bruto = atob(bruto.slice('base64-'.length))

    const sessao = JSON.parse(bruto) as { access_token?: string }
    const jwt = sessao?.access_token
    if (!jwt) return null

    const payload = jwt.split('.')[1]
    if (!payload) return null

    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const { exp } = JSON.parse(json) as { exp?: number }
    if (typeof exp !== 'number') return null

    return exp - Math.floor(Date.now() / 1000)
  } catch {
    return null
  }
}

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

  /* TOKEN AINDA NOVO NÃO PRECISA SER RENOVADO (04/08/2026)
     ─────────────────────────────────────────────────────────────────
     Descoberto lendo `vercel inspect`: o middleware NÃO roda junto do
     banco — roda na borda (gru1, fra1, iad1…). O `getUser()` abaixo é,
     portanto, uma chamada de São Paulo até o Auth do Supabase em
     Oregon: ~220ms medidos daqui, em TODA requisição de quem está
     logado, antes de a página sequer começar a ser montada.

     O Olímpio marca pagamento dezenas de vezes por dia e reclamou de
     lentidão nesse gesto — às vezes deixa pra depois e esquece, o que
     vira receita fora do relatório dele.

     Como o token vive ~1h, renovar a cada clique é desperdício. Agora
     só renova quando falta menos de 10 min. Efeito: a travessia sai de
     "toda requisição" pra ~1x por hora de uso.

     Continua renovando quando não dá pra ter certeza (cookie ilegível,
     formato novo) — a dúvida sempre pende pro lado de manter a sessão
     viva. Sem isso o dono desloga em ~1h, bug real da demo de 11/05. */
  const restam = segundosAteVencer(request)
  if (restam !== null && restam > MARGEM_RENOVACAO_SEGUNDOS) {
    return supabaseResponse
  }

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
