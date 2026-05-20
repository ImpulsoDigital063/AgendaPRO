/**
 * Check de integridade da demo Império:
 *  - auth user com email demo-imperio@agendapro.net.br ainda existe?
 *  - existem auth users "trash_*@trash.demo" (rastro de cleanup)?
 *  - business slug imperio-barbershop ainda apontando pro mesmo owner?
 *  - quantos appointments TESTE criados hoje?
 *
 * Read-only. Não altera nada.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf8')
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

async function main() {
  const DEMO_EMAIL = 'demo-imperio@agendapro.net.br'
  console.log('━━━ CHECK demo Império ━━━')

  // Auth users matching demo + trash
  let demoUser: { id: string; email: string | undefined; last_sign_in_at: string | null | undefined; updated_at: string | undefined } | null = null
  const trashUsers: { id: string; email: string | undefined; updated_at: string | undefined }[] = []
  let page = 1
  while (page < 20) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (!data?.users || data.users.length === 0) break
    for (const u of data.users) {
      if (u.email === DEMO_EMAIL) demoUser = { id: u.id, email: u.email, last_sign_in_at: u.last_sign_in_at, updated_at: u.updated_at }
      if (u.email?.startsWith('trash_') && u.email.endsWith('@trash.demo')) {
        trashUsers.push({ id: u.id, email: u.email, updated_at: u.updated_at })
      }
    }
    if (data.users.length < 1000) break
    page++
  }

  console.log('\n[1] Auth user com email demo-imperio@:')
  if (demoUser) {
    console.log(`    ✓ ENCONTRADO · id=${demoUser.id}`)
    console.log(`      last_sign_in_at: ${demoUser.last_sign_in_at}`)
    console.log(`      updated_at: ${demoUser.updated_at}`)
  } else {
    console.log(`    ✗ AUSENTE — sessão de quem estava logado caiu`)
  }

  console.log(`\n[2] Auth users trash_*@trash.demo (rastros de cleanup):`)
  if (trashUsers.length === 0) {
    console.log('    ✓ nenhum')
  } else {
    for (const t of trashUsers.slice(-5)) {
      console.log(`    · ${t.email} · updated_at=${t.updated_at}`)
    }
    if (trashUsers.length > 5) console.log(`    (... ${trashUsers.length - 5} outros)`)
  }

  // Business
  const { data: biz } = await supabase
    .from('businesses').select('id, name, owner_id, created_at')
    .eq('slug', 'imperio-barbershop').maybeSingle()
  console.log('\n[3] Business imperio-barbershop:')
  if (biz) {
    console.log(`    ✓ id=${biz.id}`)
    console.log(`      owner_id=${biz.owner_id}`)
    console.log(`      created_at=${biz.created_at}`)
    if (demoUser && demoUser.id !== biz.owner_id) {
      console.log(`    ⚠ owner_id NÃO bate com demo user id — sessão antiga ficou órfã`)
    } else if (demoUser) {
      console.log(`    ✓ owner_id BATE com demo user`)
    }
  } else {
    console.log('    ✗ business sumiu')
  }

  // TESTE count
  const { count: testeCount } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', biz?.id || '')
    .like('client_name', 'TESTE %')
  console.log(`\n[4] Appointments TESTE * existentes: ${testeCount ?? 0}`)

  console.log('\n━━━ FIM ━━━')
}

main().catch((e) => { console.error(e); process.exit(1) })
