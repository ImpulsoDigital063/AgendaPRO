/**
 * Migration Smoke Test — roda DEPOIS de aplicar uma migration nova em prod,
 * ANTES de fazer git push. Pega bugs de RLS/policy/trigger que só aparecem
 * em runtime (ex: infinite recursion detectada na v47 → v48 fix).
 *
 * Rodar:
 *   node --env-file=.env.local scripts/migration-smoke-test.mjs
 *
 * EXIT CODE: 0 se tudo ok · 1 se algum teste falhar (não pushar).
 *
 * Como adicionar novo teste:
 *   - Identifica fluxo crítico afetado pela migration
 *   - Acrescenta um bloco { name, run } em TESTS
 *   - .run() retorna { ok: bool, info?: string, error?: string }
 *
 * Histórico de bugs que isso pegaria se tivesse rodado:
 *   - v47 (17/05/2026): policy "recepcao ve profissionais" com subquery na
 *     mesma tabela → infinite recursion no login do profissional.
 *     Smoke test: signIn como prof + SELECT em professionals → erro = bug.
 */

import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !ANON || !SERVICE) {
  console.error('Faltam envs: NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY · SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })

/**
 * Helper: pega um profissional ativo aleatório de qualquer business e tenta
 * fazer SELECT em professionals via JWT dele. Reproduz o fluxo do login.
 */
async function testProfessionalSelfRead() {
  const { data: prof, error: e1 } = await admin
    .from('professionals')
    .select('id, business_id, name, auth_user_id, email')
    .not('auth_user_id', 'is', null)
    .eq('active', true)
    .limit(1)
    .single()

  if (e1 || !prof) {
    return { ok: false, error: `setup: ${e1?.message ?? 'sem profissional pra testar'}` }
  }

  // Não temos a senha do prof real — usa Admin API pra gerar token impersonando.
  const { data: linkData, error: e2 } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: prof.email,
  })
  if (e2 || !linkData) {
    return { ok: false, error: `generateLink: ${e2?.message}` }
  }

  // Extrai o hashed_token e troca por sessão via verifyOtp
  const tokenHash = linkData.properties?.hashed_token
  if (!tokenHash) {
    return { ok: false, error: 'sem hashed_token no link' }
  }

  const anonClient = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data: verify, error: e3 } = await anonClient.auth.verifyOtp({
    type: 'magiclink',
    token_hash: tokenHash,
  })
  if (e3 || !verify.session) {
    return { ok: false, error: `verifyOtp: ${e3?.message}` }
  }

  // Agora tem sessão. Faz a query que o /profissional/login faz.
  const { data: self, error: e4 } = await anonClient
    .from('professionals')
    .select('id, role, password_changed, business_id')
    .eq('auth_user_id', verify.user.id)
    .single()

  if (e4) {
    return { ok: false, error: `SELECT professionals: ${e4.message}` }
  }

  if (!self || self.id !== prof.id) {
    return { ok: false, error: `query retornou prof errado ou null` }
  }

  return { ok: true, info: `prof=${prof.name} (${prof.email}) leu próprio registro OK` }
}

/**
 * Helper: SELECT em customers via anon key. Customers tem RLS aberta pra
 * legacy do booking público — se quebrou, vamos saber.
 */
async function testCustomersAnonRead() {
  const anonClient = createClient(URL, ANON, { auth: { persistSession: false } })
  const { error } = await anonClient.from('customers').select('id').limit(1)
  if (error) return { ok: false, error: error.message }
  return { ok: true, info: 'SELECT customers (anon) OK' }
}

/**
 * Helper: SELECT em appointments via anon key. Booking público lê isso pra
 * mostrar horários ocupados.
 */
async function testAppointmentsAnonRead() {
  const anonClient = createClient(URL, ANON, { auth: { persistSession: false } })
  const { error } = await anonClient.from('appointments').select('id').limit(1)
  if (error) return { ok: false, error: error.message }
  return { ok: true, info: 'SELECT appointments (anon) OK' }
}

const TESTS = [
  { name: 'profissional consegue ler próprio registro (RLS)', run: testProfessionalSelfRead },
  { name: 'customers SELECT anon (booking público)', run: testCustomersAnonRead },
  { name: 'appointments SELECT anon (booking público)', run: testAppointmentsAnonRead },
]

console.log(`\nRodando ${TESTS.length} smoke test${TESTS.length > 1 ? 's' : ''}...\n`)

let failed = 0
for (const t of TESTS) {
  const r = await t.run()
  if (r.ok) {
    console.log(`  OK  · ${t.name}${r.info ? ` · ${r.info}` : ''}`)
  } else {
    failed++
    console.log(`  FAIL · ${t.name}`)
    console.log(`         erro: ${r.error}`)
  }
}

console.log()
if (failed > 0) {
  console.log(`${failed} teste(s) falharam. NÃO faça git push até resolver.`)
  process.exit(1)
}

console.log('Todos os smoke tests passaram. Safe pra git push.')
process.exit(0)
