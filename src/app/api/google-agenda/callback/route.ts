/**
 * GET /api/google-agenda/callback — o Google devolve a dona aqui com o código.
 * Troca por refresh token, guarda cifrado e já manda os agendamentos de hoje
 * em diante pra agenda dela.
 */
import { NextRequest, NextResponse } from 'next/server'
import { cifrar, conferirState, revogar, sincronizarFuturos, trocarCodigo } from '@/lib/google-agenda'
import { donaDoNegocioLiberado } from '@/lib/google-agenda-acesso'
import { todayBR } from '@/lib/date-br'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const volta = (status: string) =>
    NextResponse.redirect(`${url.origin}/admin/configuracoes?tab=negocio&google=${status}`)

  // ela clicou "Cancelar" na tela do Google
  if (url.searchParams.get('error')) return volta('cancelado')

  const acesso = await donaDoNegocioLiberado()
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!acesso || !code || !state) return volta('sem-acesso')
  if (conferirState(state, acesso.userId) !== acesso.businessId) return volta('sem-acesso')

  let tokens
  try {
    tokens = await trocarCodigo(code, `${url.origin}/api/google-agenda/callback`)
  } catch (e) {
    console.error('google-agenda callback · troca do código:', e)
    return volta('erro')
  }
  // desmarcou a caixinha da agenda na tela do Google: sem ela não tem o que fazer
  if (!tokens.temAgenda) {
    if (tokens.refreshToken) await revogar(tokens.refreshToken)
    return volta('sem-permissao')
  }
  if (!tokens.refreshToken) return volta('erro')

  const { db, businessId, userId } = acesso
  const { error } = await db.from('google_agenda_conexoes').upsert({
    business_id: businessId,
    google_email: tokens.email,
    refresh_token_cifrado: cifrar(tokens.refreshToken),
    calendar_id: 'primary',
    conectado_por: userId,
    conectado_em: new Date().toISOString(),
    erro: null,
    erro_em: null,
  })
  if (error) {
    console.error('google-agenda callback · gravar conexão:', error)
    return volta('erro')
  }

  const r = await sincronizarFuturos(db, businessId, todayBR())
  console.log('google-agenda callback · envio inicial', businessId, r)
  return volta('ok')
}
