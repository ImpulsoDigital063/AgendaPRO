import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { success } = rateLimit({ key: `chgpwd:${ip}`, limit: 5, windowSeconds: 900 })
  if (!success) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde 15 minutos.' }, { status: 429 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

  const { newPassword } = await req.json()

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, { status: 400 })
  }
  if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return NextResponse.json({ error: 'A senha deve conter pelo menos uma letra maiúscula e um número.' }, { status: 400 })
  }

  const adminClient = getAdminClient()

  // Atualiza a senha no Auth
  const { error: authError } = await adminClient.auth.admin.updateUserById(user.id, {
    password: newPassword,
  })

  if (authError) {
    console.error('Password update error:', authError)
    return NextResponse.json({ error: 'Erro ao atualizar senha.' }, { status: 500 })
  }

  // Marca que o profissional já trocou a senha
  await adminClient
    .from('professionals')
    .update({ password_changed: true })
    .eq('auth_user_id', user.id)

  return NextResponse.json({ ok: true })
}
