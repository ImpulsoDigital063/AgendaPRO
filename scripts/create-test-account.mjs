/**
 * Cria conta de teste limpa pra Eduardo testar o tutorial admin v1.
 *
 * Uso:
 *   node scripts/create-test-account.mjs [categoria]
 *
 * Categoria opcional · default "Barbearia". Pra ver copy nicho-aware:
 *   "Barbearia" · "Salão de beleza" · "Estúdio de tatuagem" ·
 *   "Clínica estética" · "Nail designer" · "Manicure" ·
 *   "Psicólogo / Terapeuta" · "Personal trainer"
 *
 * Output: email + senha + URL pra logar.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// Carrega .env.local manualmente (sem dotenv)
const envFile = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
for (const line of envFile.split(/\r?\n/)) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue
  const [k, ...rest] = line.split('=')
  if (!process.env[k]) process.env[k] = rest.join('=').replace(/^"(.*)"$/, '$1')
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não setados em .env.local')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const category = process.argv[2] || 'Barbearia'

// Identifica conta com timestamp curto · slug previsível
const stamp = Date.now().toString(36).slice(-6)
const slug = `tutorial-${stamp}`
const email = `tutorial-${stamp}@agendapro.test`
const password = 'tutorial123'
const businessName = `Negócio Tutorial ${stamp.toUpperCase()}`

console.log('🔧 Criando conta de teste...')
console.log(`   Slug: ${slug}`)
console.log(`   Email: ${email}`)
console.log(`   Categoria: ${category}`)

// 1. Auth user
const { data: userData, error: authError } = await sb.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
})
if (authError) {
  console.error('❌ Erro ao criar auth user:', authError.message)
  process.exit(1)
}
const ownerId = userData.user.id
console.log(`✅ Auth user criado · id=${ownerId.slice(0, 8)}…`)

// 2. Business · description = category (padrão do app)
const { data: business, error: bizError } = await sb
  .from('businesses')
  .insert({
    name: businessName,
    slug,
    description: category,
    phone: null,
    address: null,
    owner_id: ownerId,
    welcome_modal_seen: false,
    onboarding_horarios_revisado: false,
    qr_code_compartilhado: false,
    fidelidade_dica_lida: false,
  })
  .select('id')
  .single()
if (bizError) {
  console.error('❌ Erro ao criar business:', bizError.message)
  await sb.auth.admin.deleteUser(ownerId)
  process.exit(1)
}
console.log(`✅ Business criado · id=${business.id.slice(0, 8)}…`)

// 3. Subscription ativa · não bloqueia admin (status=active + pago_ate futuro)
const now = new Date()
const oneYearAhead = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
const { error: subError } = await sb.from('subscriptions').insert({
  business_id: business.id,
  plan: 'solo',
  status: 'active',
  price_cents: 6700,
  setup_cents: 0,
  setup_paid_at: now.toISOString(),
  current_period_start: now.toISOString(),
  current_period_end: oneYearAhead.toISOString(),
  pago_ate: oneYearAhead.toISOString(),
  plan_modalidade: 'mensal_pix',
  provider: 'asaas',
  founders_club: false,
})
if (subError) {
  console.error('❌ Erro ao criar subscription:', subError.message)
  await sb.from('businesses').delete().eq('id', business.id)
  await sb.auth.admin.deleteUser(ownerId)
  process.exit(1)
}
console.log('✅ Subscription active criada (válida até daqui 1 ano)')

// 4. Profissional default (owner) · espelha o que /api/cadastro faz.
//    Cadastro real cria owner-prof automático com photo_url=null.
//    Item "Personalize seu perfil" do checklist fica incompleto até
//    admin subir foto/editar perfil em /admin/eu.
const { error: profError } = await sb.from('professionals').insert({
  business_id: business.id,
  name: 'Tutorial Admin',
  email,
  auth_user_id: ownerId,
  role: 'owner',
  active: true,
})
if (profError) {
  console.warn('⚠️  Owner-prof NÃO criado:', profError.message)
  console.warn('   Conta de teste vai funcionar mas item perfil ficará órfão')
} else {
  console.log('✅ Owner-professional criado (sem foto — checklist 0/5 ao logar)')
}

console.log('')
console.log('═══════════════════════════════════════════════════')
console.log('🎉 CONTA DE TESTE PRONTA · TUTORIAL VAI DISPARAR')
console.log('═══════════════════════════════════════════════════')
console.log('')
console.log('  📧 Email:   ' + email)
console.log('  🔑 Senha:   ' + password)
console.log('  🌐 Login:   https://agendapro.net.br/admin/login')
console.log('  🏠 Negócio: ' + businessName)
console.log('  🏷️  Slug:    /' + slug)
console.log('  📋 Nicho:   ' + category)
console.log('')
console.log('Após login: modal de boas-vindas aparece em ~400ms ·')
console.log('checklist com 0/5 itens · vá em Configurações pra ver')
console.log('os Markers (horários/QR Code) e o Card Fidelidade.')
console.log('')
console.log('Pra deletar conta após teste:')
console.log(`  node scripts/delete-user-by-email.mjs ${email}`)
console.log('')
