import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Usa service role para criar usuário no auth + inserir dados
function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const { businessName, category, phone, address, slug, email, password, professionalName } =
    await req.json()

  if (!businessName || !slug || !email || !password) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
  }

  const supabase = getAdminClient()

  // 1. Verifica se o slug já está em uso
  const { data: existing } = await supabase
    .from('businesses')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Esse endereço (slug) já está em uso. Escolha outro.' }, { status: 409 })
  }

  // 2. Cria o usuário no Supabase Auth
  const { data: userData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // confirma direto, sem precisar de email de verificação
  })

  if (authError || !userData.user) {
    if (authError?.message?.includes('already registered')) {
      return NextResponse.json({ error: 'Esse email já está cadastrado.' }, { status: 409 })
    }
    return NextResponse.json({ error: authError?.message || 'Erro ao criar usuário.' }, { status: 500 })
  }

  const ownerId = userData.user.id

  // 3. Cria o negócio
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .insert({
      name: businessName,
      slug,
      description: category || null,  // reutiliza campo description para a categoria
      phone: phone || null,
      address: address || null,
      owner_id: ownerId,
      trial_ends_at: trialEndsAt,
    })
    .select('id')
    .single()

  if (bizError || !business) {
    // Rollback: deleta o usuário criado
    await supabase.auth.admin.deleteUser(ownerId)
    return NextResponse.json({ error: bizError?.message || 'Erro ao criar negócio.' }, { status: 500 })
  }

  // 4. Cria o profissional padrão
  const { error: profError } = await supabase
    .from('professionals')
    .insert({
      business_id: business.id,
      name: professionalName || businessName,
      active: true,
    })

  if (profError) {
    // Negócio criado, mas sem profissional — não é fatal, admin pode adicionar depois
    console.error('Erro ao criar profissional padrão:', profError)
  }

  return NextResponse.json({ ok: true, slug })
}
