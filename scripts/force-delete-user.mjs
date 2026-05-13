// Uso: node scripts/force-delete-user.mjs <email>
// Apaga TUDO de um user na ordem certa de FK · sem deixar nada órfão.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
for (const l of env.split(/\r?\n/)) {
  if (!l || l.startsWith('#') || !l.includes('=')) continue
  const [k, ...r] = l.split('=')
  if (!process.env[k]) process.env[k] = r.join('=').replace(/^"(.*)"$/, '$1').trim()
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const email = process.argv[2]
if (!email) { console.error('uso: node force-delete-user.mjs <email>'); process.exit(1) }

let page = 1
let user = null
while (true) {
  const { data } = await sb.auth.admin.listUsers({ page, perPage: 200 })
  const found = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (found) { user = found; break }
  if (data.users.length < 200) break
  page++
}
if (!user) { console.log('user não encontrado:', email); process.exit(0) }

console.log(`🔥 Apagando ${email} · user_id ${user.id.slice(0, 8)}…`)

// Pega todos businesses do user
const { data: businesses } = await sb.from('businesses').select('id').eq('owner_id', user.id)
const businessIds = (businesses ?? []).map(b => b.id)

if (businessIds.length === 0) {
  console.log('Sem businesses · só apaga user')
  await sb.auth.admin.deleteUser(user.id)
  console.log('✅ Apagado')
  process.exit(0)
}

console.log(`   businesses: ${businessIds.length}`)

// Ordem reversa de FK · vai do mais profundo pro mais raso.
// Tabelas que podem existir no schema (todas filtradas por business_id):
const tables = [
  'appointment_services',  // filhos de appointments + services
  'points_transactions',   // filhos de customer + agendamentos
  'review_claims',
  'coupon_redemptions',
  'coupons',
  'rewards',
  'appointments',
  'services',
  'customers',
  'working_hours',
  'expenses',
  'professionals',
  'subscriptions',
]

for (const tbl of tables) {
  // appointment_services não tem business_id — filtra via service_id IN (services do business)
  if (tbl === 'appointment_services') {
    const { data: svcs } = await sb.from('services').select('id').in('business_id', businessIds)
    const svcIds = (svcs ?? []).map(s => s.id)
    if (svcIds.length === 0) continue
    const { error } = await sb.from(tbl).delete().in('service_id', svcIds)
    if (error) console.warn(`   ${tbl}: ${error.message}`)
    else console.log(`   ✓ ${tbl} limpo`)
    continue
  }
  // working_hours não tem business_id — filtra via professional_id
  if (tbl === 'working_hours') {
    const { data: profs } = await sb.from('professionals').select('id').in('business_id', businessIds)
    const profIds = (profs ?? []).map(p => p.id)
    if (profIds.length === 0) continue
    const { error } = await sb.from(tbl).delete().in('professional_id', profIds)
    if (error) console.warn(`   ${tbl}: ${error.message}`)
    else console.log(`   ✓ ${tbl} limpo`)
    continue
  }
  // points_transactions: customer_id
  if (tbl === 'points_transactions') {
    const { data: custs } = await sb.from('customers').select('id').in('business_id', businessIds)
    const custIds = (custs ?? []).map(c => c.id)
    if (custIds.length === 0) continue
    const { error } = await sb.from(tbl).delete().in('customer_id', custIds)
    if (error) console.warn(`   ${tbl}: ${error.message}`)
    else console.log(`   ✓ ${tbl} limpo`)
    continue
  }
  // coupon_redemptions: coupon_id
  if (tbl === 'coupon_redemptions') {
    const { data: coups } = await sb.from('coupons').select('id').in('business_id', businessIds)
    const coupIds = (coups ?? []).map(c => c.id)
    if (coupIds.length === 0) continue
    const { error } = await sb.from(tbl).delete().in('coupon_id', coupIds)
    if (error) console.warn(`   ${tbl}: ${error.message}`)
    else console.log(`   ✓ ${tbl} limpo`)
    continue
  }
  // padrão: business_id direto
  const { error } = await sb.from(tbl).delete().in('business_id', businessIds)
  if (error) console.warn(`   ${tbl}: ${error.message}`)
  else console.log(`   ✓ ${tbl} limpo`)
}

// Apaga businesses
const { error: bErr } = await sb.from('businesses').delete().in('id', businessIds)
if (bErr) { console.error(`❌ businesses: ${bErr.message}`); process.exit(1) }
console.log(`   ✓ businesses apagados`)

// Apaga user
const { error: uErr } = await sb.auth.admin.deleteUser(user.id)
if (uErr) { console.error(`❌ user: ${uErr.message}`); process.exit(1) }
console.log(`✅ User ${email} apagado com sucesso`)
