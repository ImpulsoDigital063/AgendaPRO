import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  // 1. Verifica se quem está chamando é dono de um negócio
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!business) return NextResponse.json({ error: 'Negócio não encontrado.' }, { status: 403 })

  // 2. Lê os dados do request
  const { professionalId, email } = await req.json()

  if (!professionalId || !email) {
    return NextResponse.json({ error: 'professionalId e email são obrigatórios.' }, { status: 400 })
  }

  const emailNorm = email.trim().toLowerCase()

  // 3. Verifica se o profissional pertence a este negócio
  const adminClient = getAdminClient()

  const { data: prof } = await adminClient
    .from('professionals')
    .select('id, name, auth_user_id')
    .eq('id', professionalId)
    .eq('business_id', business.id)
    .single()

  if (!prof) {
    return NextResponse.json({ error: 'Profissional não encontrado neste negócio.' }, { status: 404 })
  }

  if (prof.auth_user_id) {
    return NextResponse.json({ error: 'Este profissional já tem acesso ao sistema.' }, { status: 409 })
  }

  // 4. Gera senha temporária segura (crypto random)
  const { randomBytes } = await import('crypto')
  const tempPassword = `AgPro-${randomBytes(8).toString('base64url')}`

  // 5. Cria user no Supabase Auth
  const { data: userData, error: authError } = await adminClient.auth.admin.createUser({
    email: emailNorm,
    password: tempPassword,
    email_confirm: true,
  })

  if (authError || !userData.user) {
    if (authError?.message?.includes('already registered')) {
      return NextResponse.json({ error: 'Esse email já está cadastrado no sistema.' }, { status: 409 })
    }
    console.error('Invite professional auth error:', authError)
    return NextResponse.json({ error: 'Erro ao criar acesso.' }, { status: 500 })
  }

  // 6. Linka o auth user com o profissional
  const { error: updateError } = await adminClient
    .from('professionals')
    .update({
      email: emailNorm,
      auth_user_id: userData.user.id,
      role: 'professional',
    })
    .eq('id', professionalId)

  if (updateError) {
    // Rollback: deleta o user criado
    await adminClient.auth.admin.deleteUser(userData.user.id)
    return NextResponse.json({ error: 'Erro ao vincular acesso.' }, { status: 500 })
  }

  // 7. Envia email com credenciais para o profissional
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: 'AgendaPRO <onboarding@resend.dev>',
    to: emailNorm,
    subject: `Seu acesso ao AgendaPRO`,
    html: `
      <p>Olá, <strong>${prof.name}</strong>!</p>
      <p>Seu acesso ao painel do profissional foi criado.</p>
      <p><strong>Email:</strong> ${emailNorm}</p>
      <p><strong>Senha temporária:</strong> ${tempPassword}</p>
      <p>Acesse e troque sua senha no primeiro login.</p>
      <p>— AgendaPRO</p>
    `,
  }).catch(() => {})

  // Não retorna a senha na resposta — ela vai por email
  return NextResponse.json({
    ok: true,
    email: emailNorm,
    message: `Acesso criado para ${prof.name}. As credenciais foram enviadas por email.`,
  })
}
