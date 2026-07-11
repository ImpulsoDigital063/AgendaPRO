import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/admin-data'

/**
 * POST /api/sistema/entrar  { businessId }
 *
 * "Entrar como cliente" — gera um magic link do DONO do negócio e devolve a
 * URL pra o operador (Eduardo) abrir e cair logado no /admin daquele negócio.
 * Suporte: ver o que o cliente vê, resolver, sair.
 *
 * Gate: só o email do operador (mesmo do /sistema). Leitura via service-role.
 * URL no domínio www (evita o buraco de cookie apex→www). Toda entrada é
 * logada — é acesso ao dado privado de um cliente.
 */

export const dynamic = 'force-dynamic'

const ALLOWED_EMAILS = ['edubchaves5@gmail.com']

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.email || !ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
    // mesmo 404 do painel: pra quem não é o operador, a rota não existe
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({} as { businessId?: string }))
  const businessId = body.businessId
  if (!businessId) {
    return NextResponse.json({ error: 'businessId obrigatório' }, { status: 400 })
  }

  const admin = serviceClient()
  const { data: biz } = await admin
    .from('businesses')
    .select('id, name, owner_id')
    .eq('id', businessId)
    .maybeSingle()

  if (!biz?.owner_id) {
    return NextResponse.json({ error: 'negócio ou dono não encontrado' }, { status: 404 })
  }

  const { data: owner } = await admin.auth.admin.getUserById(biz.owner_id)
  const email = owner?.user?.email
  if (!email) {
    return NextResponse.json({ error: 'dono sem email de acesso' }, { status: 404 })
  }

  const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  const token = link?.properties?.hashed_token
  if (error || !token) {
    return NextResponse.json({ error: error?.message ?? 'falha ao gerar acesso' }, { status: 500 })
  }

  const url =
    `https://www.agendapro.net.br/auth/confirm?token_hash=${token}` +
    `&type=magiclink&next=${encodeURIComponent('/admin/inicio')}`

  // auditoria — acesso ao dado privado de um cliente fica registrado
  console.log(
    `[SISTEMA/entrar] ${user.email} entrou como "${biz.name}" (${biz.id}) · dono ${email} · ${new Date().toISOString()}`
  )

  return NextResponse.json({ url, business: biz.name, ownerEmail: email })
}
