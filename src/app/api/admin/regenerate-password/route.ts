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
  // 1. Quem chama tem que ser dono de um negócio
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!business) return NextResponse.json({ error: 'Negócio não encontrado.' }, { status: 403 })

  // 2. Body
  const { professionalId } = await req.json()
  if (!professionalId) {
    return NextResponse.json({ error: 'professionalId é obrigatório.' }, { status: 400 })
  }

  // 3. Profissional tem que pertencer a este negócio e já ter acesso
  const adminClient = getAdminClient()
  const { data: prof } = await adminClient
    .from('professionals')
    .select('id, name, email, auth_user_id, role')
    .eq('id', professionalId)
    .eq('business_id', business.id)
    .single()

  if (!prof) {
    return NextResponse.json({ error: 'Profissional não encontrado neste negócio.' }, { status: 404 })
  }
  if (!prof.auth_user_id) {
    return NextResponse.json({ error: 'Esse profissional ainda não tem acesso. Use "Dar acesso".' }, { status: 409 })
  }
  if (prof.role === 'owner') {
    return NextResponse.json({ error: 'Não é possível resetar a senha do próprio dono por aqui.' }, { status: 403 })
  }

  // 4. Gera nova senha temporária
  const { randomBytes } = await import('crypto')
  const tempPassword = `AgPro-${randomBytes(8).toString('base64url')}`

  // 5. Atualiza no Supabase Auth
  const { error: authError } = await adminClient.auth.admin.updateUserById(prof.auth_user_id, {
    password: tempPassword,
  })

  if (authError) {
    console.error('Regenerate password auth error:', authError)
    return NextResponse.json({ error: 'Erro ao resetar senha.' }, { status: 500 })
  }

  // 6. Força troca no próximo login
  await adminClient
    .from('professionals')
    .update({ password_changed: false })
    .eq('id', professionalId)

  // 7. Tenta enviar email — se falhar, dono pode usar WhatsApp manual
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://agendapro.net.br').replace(/\/$/, '')
  const loginUrl = `${appUrl}/profissional/login`

  let emailSent = false
  if (process.env.RESEND_API_KEY && prof.email) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'AgendaPRO <onboarding@resend.dev>',
        to: prof.email,
        subject: `Sua nova senha do AgendaPRO`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;color:#0F172A">
            <p>Olá, <strong>${prof.name}</strong>!</p>
            <p>Sua senha do painel do profissional foi resetada pelo dono do estabelecimento.</p>
            <p><strong>Email:</strong> ${prof.email}<br/>
            <strong>Nova senha temporária:</strong> ${tempPassword}</p>
            <p style="margin:24px 0">
              <a href="${loginUrl}" style="display:inline-block;background:#3B82F6;color:#fff;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:10px">
                Acessar painel
              </a>
            </p>
            <p style="color:#64748B;font-size:13px">
              Ou copie e cole no navegador: <a href="${loginUrl}" style="color:#3B82F6">${loginUrl}</a>
            </p>
            <p style="color:#64748B;font-size:13px">Você vai precisar trocar a senha no próximo login.</p>
            <p style="color:#94A3B8;font-size:12px;margin-top:28px">— AgendaPRO</p>
          </div>
        `,
      })
      emailSent = !result.error
      if (result.error) console.error('Resend send error:', result.error)
    } catch (err) {
      console.error('Resend exception:', err)
    }
  }

  return NextResponse.json({
    ok: true,
    email: prof.email,
    tempPassword,
    professionalName: prof.name,
    loginUrl,
    emailSent,
  })
}
