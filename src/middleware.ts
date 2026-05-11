import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Middleware Next.js — refresh do token Supabase a cada request.
 *
 * Sem isso, usuário deslogava sozinho depois de ~1h (token expirava
 * sem renovação). Bug reportado durante demo Barbearia Olímpio
 * 11/05/2026 — sistema deslogava de uns em uns.
 *
 * Matcher exclui assets estáticos pra não rodar em CSS/JS/imagens
 * (não tem cookies, não precisa refresh).
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Roda em TODAS rotas exceto:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon, manifest, splash, icons
     * - extensões de imagem
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
