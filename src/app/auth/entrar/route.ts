import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET  /auth/entrar?token_hash=...&type=magiclink&next=/admin  → página que entra
 * POST /auth/entrar (form com os mesmos campos)                 → troca o token
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
 * 25/10 · o GET NÃO gasta mais o token. Link mandado pelo WhatsApp caía na tela
 * de login: o robô da prévia do WhatsApp abre o link antes da pessoa e o token,
 * de uso único, já estava gasto quando ela tocava (mesma coisa com antivírus de
 * e-mail). Agora o GET devolve uma página que envia o formulário por JavaScript;
 * robô de prévia não roda JavaScript e não gasta o token. Sem JavaScript, fica
 * o botão "Entrar".
 *
 * Segurança: mesmo nível do magic link por e-mail — o token é de uso único,
 * expira, e só o dono do link entra. Nada aqui cria acesso novo.
 */
type Tipo = 'magiclink' | 'recovery' | 'email'

// só caminho do próprio site: "/admin", nunca "//outro-site" nem "https://..."
const destinoSeguro = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/admin')

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') ?? 'magiclink'
  const next = destinoSeguro(searchParams.get('next'))

  if (!tokenHash) {
    return NextResponse.redirect(`${origin}/admin/login?error=missing_token`)
  }

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Entrando…</title>
<style>body{margin:0;min-height:100svh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a}button{font:600 16px system-ui;padding:14px 28px;border:0;border-radius:999px;background:#0f172a;color:#fff}</style></head>
<body><form id="f" method="post" action="/auth/entrar"><input type="hidden" name="token_hash" value="${esc(tokenHash)}"><input type="hidden" name="type" value="${esc(type)}"><input type="hidden" name="next" value="${esc(next)}"><button type="submit">Entrar</button></form>
<script>document.getElementById('f').submit()</script></body></html>`
  return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
}

export async function POST(request: Request) {
  const { origin } = new URL(request.url)
  const form = await request.formData()
  const tokenHash = String(form.get('token_hash') ?? '')
  const type = String(form.get('type') ?? 'magiclink') as Tipo
  const next = destinoSeguro(String(form.get('next') ?? ''))

  if (!tokenHash) {
    return NextResponse.redirect(`${origin}/admin/login?error=missing_token`, 303)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

  if (error) {
    return NextResponse.redirect(`${origin}/admin/login?error=${encodeURIComponent(error.message)}`, 303)
  }

  return NextResponse.redirect(`${origin}${next}`, 303)
}
