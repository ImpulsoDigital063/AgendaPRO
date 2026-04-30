import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * POST /api/profissional/update-photo
 * Body: { photoUrl: string }
 *
 * Valida que o usuário logado é um profissional (tem registro em
 * `professionals` com auth_user_id = auth.uid()) e atualiza APENAS o
 * campo photo_url na própria linha. Usa service_role internamente.
 *
 * Por que API + service_role em vez de RLS update direto:
 * RLS de UPDATE na tabela `professionals` é linha-a-linha. Se eu
 * permitisse o profissional fazer update na própria linha, ele
 * conseguiria mexer em qualquer coluna (commission_percentage,
 * employment_type, business_id, role) — escalada de privilégio.
 * Aqui o backend faz o update enxuto, só mexe em photo_url.
 *
 * Validações:
 *   - Usuário autenticado
 *   - Tem registro como profissional (auth_user_id = current user)
 *   - photoUrl é HTTPS e aponta pro bucket professional-photos do
 *     próprio Supabase do projeto (anti-XSS via URL externa)
 */
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  // 1. Auth via cookies do Next
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // 2. Body
  let body: { photoUrl?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  const { photoUrl } = body

  if (typeof photoUrl !== 'string' || photoUrl.length < 10 || photoUrl.length > 500) {
    return NextResponse.json({ error: 'photoUrl inválido' }, { status: 400 })
  }
  if (!/^https:\/\//.test(photoUrl)) {
    return NextResponse.json({ error: 'photoUrl precisa ser HTTPS' }, { status: 400 })
  }

  // Anti-injection: garantir que aponta pro nosso bucket Supabase
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  const expectedPrefix = `${supabaseUrl}/storage/v1/object/public/professional-photos/`
  if (!photoUrl.startsWith(expectedPrefix)) {
    return NextResponse.json(
      { error: 'photoUrl precisa apontar pro bucket professional-photos' },
      { status: 400 }
    )
  }

  // 3. Confirma que o user logado é um profissional do sistema
  const admin = getServiceClient()
  const { data: prof, error: profErr } = await admin
    .from('professionals')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (profErr || !prof) {
    return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
  }

  // 4. Update enxuto — só photo_url, mais nada
  const { error: updateErr } = await admin
    .from('professionals')
    .update({ photo_url: photoUrl })
    .eq('id', prof.id)

  if (updateErr) {
    console.error('[update-photo] update error:', updateErr)
    return NextResponse.json({ error: 'Erro ao salvar foto' }, { status: 500 })
  }

  // Invalida cache do RSC nas rotas que listam profissionais. Quando
  // o admin (em outra rota/aba) navegar pra /admin/configuracoes
  // depois disso, o server vai refazer o select e trazer photo_url
  // atualizada. Sem isto, ele recebia versao antiga e a foto aparecia
  // quebrada no card.
  revalidatePath('/admin/configuracoes')
  revalidatePath('/profissional/conta')

  return NextResponse.json({ ok: true, photoUrl })
}
