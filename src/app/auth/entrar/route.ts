import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /auth/entrar?token_hash=...&type=magiclink&next=/admin
 *
 * Entrada por token, resolvida NO SERVIDOR (28/08).
 *
 * Por que existe: o /auth/callback só sabe trocar `?code=` por sessão, que é o
 * formato do fluxo PKCE. Link gerado pela Admin API (generateLink) volta no
 * FRAGMENTO da URL (#access_token=...), e fragmento não chega ao servidor —
 * então o callback via a URL sem código e mandava todo mundo pro login. O
 * sintoma era esse: link de suporte "não fazia nada".
 *
 * Aqui a troca é feita com verifyOtp + token_hash, que é justamente o formato
 * que o generateLink devolve em properties.hashed_token. A sessão vira cookie
 * do lado do servidor e o destino abre logado.
 *
 * Segurança: mesmo nível do magic link por e-mail — o token é de uso único,
 * expira, e só o dono do link entra. Nada aqui cria acesso novo.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = (searchParams.get('type') ?? 'magiclink') as 'magiclink' | 'recovery' | 'email'
  const next = searchParams.get('next') ?? '/admin'

  if (!tokenHash) {
    return NextResponse.redirect(`${origin}/admin/login?error=missing_token`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

  if (error) {
    return NextResponse.redirect(`${origin}/admin/login?error=${encodeURIComponent(error.message)}`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
