/**
 * GET /api/google-agenda/conectar — botão "Conectar Google Agenda" do painel.
 * Manda a dona pra tela de permissão do Google. O redirect volta pra
 * /callback no MESMO domínio (prévia ou produção: os dois cadastrados no Google).
 */
import { NextRequest, NextResponse } from 'next/server'
import { assinarState, urlDeConsentimento } from '@/lib/google-agenda'
import { donaDoNegocioLiberado } from '@/lib/google-agenda-acesso'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const origem = new URL(req.url).origin
  const acesso = await donaDoNegocioLiberado()
  if (!acesso) return NextResponse.redirect(`${origem}/admin/configuracoes?tab=negocio&google=sem-acesso`)
  const state = assinarState(acesso.businessId, acesso.userId)
  return NextResponse.redirect(urlDeConsentimento(`${origem}/api/google-agenda/callback`, state))
}
