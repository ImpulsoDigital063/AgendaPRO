// Uso: node scripts/delete-user-by-email.mjs <email>
// Apaga o auth.user + cascade (businesses, subscriptions, etc via FK)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')

// Load .env.local manualmente (sem dependência)
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltando NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local')
  process.exit(1)
}

const email = process.argv[2]
if (!email) {
  console.error('Uso: node scripts/delete-user-by-email.mjs <email>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

console.log(`\n🔍 Procurando usuário: ${email}\n`)

// Busca user via admin.listUsers (paginado)
async function findUserByEmail(email) {
  let page = 1
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const found = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (found) return found
    if (data.users.length < 200) return null
    page++
  }
}

const user = await findUserByEmail(email)

if (!user) {
  console.log(`❌ Nenhum usuário encontrado com email: ${email}`)
  process.exit(0)
}

console.log(`✅ Encontrado:`)
console.log(`   user_id: ${user.id}`)
console.log(`   created_at: ${user.created_at}`)
console.log(`   confirmed: ${user.email_confirmed_at ? 'sim' : 'não'}`)

// Lista o que vai cascadear
const { data: businesses } = await supabase
  .from('businesses')
  .select('id, name, slug')
  .eq('owner_id', user.id)

console.log(`\n📦 Businesses vinculados: ${businesses?.length ?? 0}`)
if (businesses?.length) {
  for (const b of businesses) {
    console.log(`   - ${b.name} (slug: ${b.slug}, id: ${b.id})`)
  }
}

const { data: subs } = await supabase
  .from('subscriptions')
  .select('id, status, plan, plan_modalidade')
  .in('business_id', (businesses ?? []).map(b => b.id))

console.log(`\n💳 Subscriptions vinculadas: ${subs?.length ?? 0}`)
if (subs?.length) {
  for (const s of subs) {
    console.log(`   - ${s.plan} ${s.plan_modalidade ?? ''} (status: ${s.status})`)
  }
}

console.log(`\n⚠️  Apagando em 3 segundos... (Ctrl+C pra abortar)\n`)
await new Promise(r => setTimeout(r, 3000))

// 1. Apaga subscriptions explicitamente (caso FK não tenha cascade)
if (businesses?.length) {
  for (const b of businesses) {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('business_id', b.id)
    if (error) console.error(`   subscription delete error: ${error.message}`)
  }
}

// 2. Apaga businesses
const { error: bErr } = await supabase
  .from('businesses')
  .delete()
  .eq('owner_id', user.id)
if (bErr) console.error(`   business delete error: ${bErr.message}`)
else console.log(`✅ Businesses apagados`)

// 3. Apaga auth.user (cascade pra outras FK)
const { error: uErr } = await supabase.auth.admin.deleteUser(user.id)
if (uErr) {
  console.error(`❌ Erro ao apagar user: ${uErr.message}`)
  process.exit(1)
}

console.log(`\n✅ User ${email} apagado com sucesso. Ela já pode cadastrar de novo.`)
