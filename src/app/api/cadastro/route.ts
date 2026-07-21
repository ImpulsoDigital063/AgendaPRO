import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'
import { PRICING } from '@/config/pricing'
import { sendAlert } from '@/lib/alert'

// Usa service role para criar usuário no auth + inserir dados
function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Verifica o token do Cloudflare Turnstile (CAPTCHA grátis).
 * Rollout seguro: se TURNSTILE_SECRET_KEY não estiver setada, pula a
 * verificação (retorna true) — assim o cadastro funciona antes das chaves
 * existirem. Com a key setada, exige token válido.
 */
async function verifyTurnstile(token: string | null, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true // CAPTCHA desativado até a key existir
  if (!token) return false
  try {
    const form = new URLSearchParams()
    form.append('secret', secret)
    form.append('response', token)
    if (ip && ip !== 'unknown') form.append('remoteip', ip)
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    })
    const d = await r.json()
    return !!d?.success
  } catch (e) {
    console.error('[cadastro] Turnstile verify error:', e)
    return false
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { success } = rateLimit({ key: `cadastro:${ip}`, limit: 5, windowSeconds: 3600 })
  if (!success) {
    return NextResponse.json({ error: 'Muitas tentativas. Tente novamente em 1 hora.' }, { status: 429 })
  }

  const {
    businessName, category, phone, address, slug, email, password, professionalName, plan,
    // v67 · mapeamento de canal e dor (insight pós-Studio Mood/Izanara via ChatGPT)
    acquisitionChannel, primaryNeed,
    // v79 · dono atende clientes ou só administra (default true · cobre 70% dos cadastros)
    ownerAtende,
    // CAPTCHA anti-bot (Turnstile)
    captchaToken,
  } = await req.json()
  const ownerAtendeBool = ownerAtende !== false

  if (!businessName || !slug || !email || !password) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
  }

  const chosenPlan: 'solo' | 'equipe' = plan === 'equipe' ? 'equipe' : 'solo'
  const priceCents = PRICING[chosenPlan].mensalidadeCentavos
  // Sem setup pra ninguém · descontinuado em 06/05/2026 (preço fixo Solo R$67 / Equipe R$97)
  const setupCents = 0

  // Validação de input
  if (typeof businessName !== 'string' || businessName.trim().length < 2 || businessName.trim().length > 100) {
    return NextResponse.json({ error: 'Nome do negócio inválido.' }, { status: 400 })
  }
  if (typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug) || slug.length < 3 || slug.length > 50) {
    return NextResponse.json({ error: 'Endereço (slug) inválido. Use apenas letras minúsculas, números e hífen.' }, { status: 400 })
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Senha deve ter pelo menos 8 caracteres.' }, { status: 400 })
  }

  const supabase = getAdminClient()

  // Rate-limit PERSISTENTE (Postgres · funciona entre instâncias serverless,
  // ao contrário do in-memory acima que reseta a cada cold start). 5/h por IP.
  // Se a tabela não existir ainda (migration v86 não aplicada), não bloqueia
  // cadastro legítimo — cai no rate-limit em memória que já rodou.
  try {
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString()
    const { count, error: rlErr } = await supabase
      .from('signup_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .gt('created_at', oneHourAgo)
    if (!rlErr) {
      if ((count ?? 0) >= 5) {
        return NextResponse.json({ error: 'Muitas tentativas de cadastro. Tente novamente em 1 hora.' }, { status: 429 })
      }
      await supabase.from('signup_attempts').insert({ ip })
    }
  } catch (e) {
    console.warn('[cadastro] rate-limit Postgres indisponível, usando fallback em memória:', e)
  }

  // CAPTCHA anti-bot — bloqueia robô antes de criar qualquer coisa
  const captchaOk = await verifyTurnstile(typeof captchaToken === 'string' ? captchaToken : null, ip)
  if (!captchaOk) {
    return NextResponse.json({ error: 'Verificação anti-robô falhou. Recarregue a página e tente de novo.' }, { status: 400 })
  }

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
    console.error('Auth error:', authError)
    return NextResponse.json({ error: 'Erro ao criar usuário.' }, { status: 500 })
  }

  const ownerId = userData.user.id

  // 3. Cria o negócio (sem trial_ends_at — lógica agora é 100% via subscriptions)
  // v67 valida acquisition_channel e primary_need contra os enums do banco
  const VALID_CHANNELS = ['indicacao', 'google', 'instagram', 'tiktok', 'chatgpt_ia', 'salao99_migrante', 'whatsapp_organico', 'outro']
  const VALID_NEEDS = ['agenda', 'loja_vendas', 'ambos', 'indeciso']
  const channel = typeof acquisitionChannel === 'string' && VALID_CHANNELS.includes(acquisitionChannel) ? acquisitionChannel : null
  const need = typeof primaryNeed === 'string' && VALID_NEEDS.includes(primaryNeed) ? primaryNeed : null

  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .insert({
      name: businessName,
      slug,
      description: category || null,  // reutiliza campo description para a categoria
      phone: phone || null,
      address: address || null,
      owner_id: ownerId,
      acquisition_channel: channel,
      primary_need: need,
    })
    .select('id')
    .single()

  if (bizError || !business) {
    // Rollback: deleta o usuário criado
    await supabase.auth.admin.deleteUser(ownerId)
    console.error('Business creation error:', bizError)
    return NextResponse.json({ error: 'Erro ao criar negócio.' }, { status: 500 })
  }

  // 4. Cria assinatura em TRIAL de 7 DIAS (cravado 13/07/2026).
  //
  // Antes nascia 'pending_payment' → o lead se cadastrava e caía direto no
  // paywall. Não existia teste grátis. Agora a conta nasce ativa por 7 dias,
  // sem pedir cartão nem PIX — é o que a prospecção promete.
  //
  // NÃO precisa de cron novo: o billing-check já trata exatamente esse formato
  // (status=active · permanent_courtesy=false · plan_modalidade=null · sem
  // asaas_subscription_id/mp_subscription_id). Ele avisa D-1 e, quando pago_ate
  // vence, vira pending_payment e o gate manda pro paywall.
  const trialFim = new Date(Date.now() + PRICING.trial.dias * 24 * 60 * 60 * 1000).toISOString()

  const { error: subError } = await supabase
    .from('subscriptions')
    .insert({
      business_id: business.id,
      plan: chosenPlan,
      status: 'active',
      price_cents: priceCents,
      setup_cents: setupCents,
      // 'cortesia' é o único valor de provider que o banco aceita pra conta sem
      // gateway (o CHECK subscriptions_provider_check só permite mercado_pago,
      // asaas e cortesia — 'trial' explode com violação de constraint).
      // É o mesmo provider que a Viva Cacheada já usa no trial dela.
      provider: 'cortesia',
      plan_modalidade: null,        // sem ciclo de cobrança — é o que marca "trial"
      permanent_courtesy: false,    // vence de verdade (true = demo, nunca bloqueia)
      pago_ate: trialFim,
      current_period_start: new Date().toISOString(),
      current_period_end: trialFim,
    })

  if (subError) {
    console.error('Erro ao criar subscription:', subError)
    // Rollback completo: sem subscription, o usuário ficaria em estado corrompido
    await supabase.from('businesses').delete().eq('id', business.id)
    await supabase.auth.admin.deleteUser(ownerId)
    return NextResponse.json({ error: 'Erro ao criar conta. Tente novamente.' }, { status: 500 })
  }

  // 5. Cria o profissional default — JÁ LINKADO AO DONO
  //
  // role='owner' + auth_user_id = ownerId fazem o ProfissionaisTab
  // reconhecer esse profissional como o admin/dono. Resultado:
  //   - card mostra badge verde "Tem acesso ao painel" (em vez do botão
  //     "Dar acesso" que criava login fantasma duplicado)
  //   - dono ja consegue receber agendamentos no proprio nome desde o
  //     cadastro, sem precisar configurar nada
  //
  // Premissa pensada pra uso em massa: 100 cadastros = 100 perfis
  // corretos sem suporte ("por que aparece o nome da minha barbearia
  // como profissional?"), sem login duplicado.
  const emailNorm = email.trim().toLowerCase()
  // v79 · setar cargos + atribuições conforme escolha "Você atende?"
  //   ownerAtende=true:  is_owner + is_professional · aparece na agenda
  //   ownerAtende=false: is_owner + is_manager · não atende · só administra (ex: Luana Palace)
  const { error: profError } = await supabase
    .from('professionals')
    .insert({
      business_id: business.id,
      name: professionalName || businessName,
      email: emailNorm,
      auth_user_id: ownerId,
      role: 'owner',
      active: true,
      is_owner: true,
      is_manager: !ownerAtendeBool,
      is_professional: ownerAtendeBool,
      is_attendant: false,
      is_receptionist: false,
      does_appointments: ownerAtendeBool,
      sells_products: true,
      sells_packages: true,
      employment_type: ownerAtendeBool ? 'commissioned' : 'employed',
    })

  if (profError) {
    // Negócio criado, mas sem profissional — não é fatal, admin pode adicionar depois
    console.error('Erro ao criar profissional padrão:', profError)
  }

  // Alerta operacional (Telegram) — Eduardo quer saber quando entra cadastro
  // novo (antes só descobria por auditoria manual). Fire-and-forget: não
  // bloqueia a resposta nem quebra o cadastro se o Telegram falhar.
  const CANAL_LABEL: Record<string, string> = {
    indicacao: 'Indicação', google: 'Google', instagram: 'Instagram', tiktok: 'TikTok',
    chatgpt_ia: 'ChatGPT/IA', salao99_migrante: 'Migrante Salão99', whatsapp_organico: 'WhatsApp', outro: 'Outro',
  }
  const NEED_LABEL: Record<string, string> = {
    agenda: 'Agenda', loja_vendas: 'Loja/Vendas', ambos: 'Ambos', indeciso: 'Indeciso',
  }
  void sendAlert(
    `🆕 <b>Novo cadastro no AgendaPRO</b>\n` +
    `<b>${businessName}</b> · ${chosenPlan === 'equipe' ? 'Equipe' : 'Solo'}\n` +
    (phone ? `📱 ${phone}\n` : '') +
    `✉️ ${email}\n` +
    (channel ? `Origem: ${CANAL_LABEL[channel] ?? channel}` : '') +
    (need ? `${channel ? ' · ' : ''}Precisa: ${NEED_LABEL[need] ?? need}` : '') +
    `\nTrial de ${PRICING.trial.dias} dias começou.`
  ).catch(() => {})

  return NextResponse.json({ ok: true, slug, plan: chosenPlan })
}
