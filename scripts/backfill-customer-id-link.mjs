/* Backfill do customer_id nos agendamentos feitos pelo link publico.
   Achado da auditoria 05/08: a rota /api/booking/submit criava/recuperava o
   customer mas nunca gravava o vinculo no agendamento. 396 rows orfas.

   Casa por business_id + telefone, que e exatamente a chave que a propria
   rota usa pra achar o customer — mesma regra, mesmo resultado.
   So preenche onde esta NULL: nao toca em nada ja vinculado.
   Roda com --apply; sem isso e ensaio. */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf-8')
for (const l of env.split(/\r?\n/)) {
  if (!l || l.startsWith('#') || !l.includes('=')) continue
  const [k, ...r] = l.split('=')
  if (!process.env[k]) process.env[k] = r.join('=').replace(/^"(.*)"$/, '$1')
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const APPLY = process.argv.includes('--apply')

async function all(table, sel, f) {
  let out = [], from = 0
  for (;;) {
    let q = db.from(table).select(sel).range(from, from + 999)
    if (f) q = f(q)
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    out = out.concat(data || [])
    if ((data || []).length < 1000) break
    from += 1000
  }
  return out
}

const appts = await all('appointments', 'id, business_id, client_phone, customer_id')
const orfaos = appts.filter((a) => !a.customer_id && a.client_phone)
const customers = await all('customers', 'id, business_id, phone')

const chave = (b, p) => `${b}|${(p || '').trim()}`
const mapa = new Map()
for (const c of customers) {
  const k = chave(c.business_id, c.phone)
  if (!mapa.has(k)) mapa.set(k, c.id) // primeiro vence · duplicata por telefone e outro assunto
}

const paraCorrigir = []
let semMatch = 0
for (const a of orfaos) {
  const cid = mapa.get(chave(a.business_id, a.client_phone))
  if (cid) paraCorrigir.push({ id: a.id, customer_id: cid })
  else semMatch++
}

console.log(`agendamentos: ${appts.length}`)
console.log(`orfaos (sem customer_id, com telefone): ${orfaos.length}`)
console.log(`com customer correspondente: ${paraCorrigir.length}`)
console.log(`sem correspondente (ficam como estao): ${semMatch}`)

if (!APPLY) {
  console.log('\nENSAIO · rode com --apply pra gravar')
  process.exit(0)
}

// Antes de escrever, deixa o plano em disco: se der ruim, da pra desfazer
// linha a linha (todas eram NULL, entao voltar e setar NULL nesses ids).
const dump = `backfill-customer-id-${new Date().toISOString().slice(0, 10)}.json`
fs.writeFileSync(dump, JSON.stringify(paraCorrigir, null, 2))
console.log(`\nplano salvo em ${dump} (${paraCorrigir.length} rows) · desfazer = setar NULL nesses ids`)

let ok = 0, erro = 0
for (const r of paraCorrigir) {
  const { error } = await db
    .from('appointments')
    .update({ customer_id: r.customer_id })
    .eq('id', r.id)
    .is('customer_id', null) // corrida: se alguem vinculou nesse meio tempo, respeita
  if (error) { erro++; console.log('  falhou', r.id, error.message) } else ok++
}
console.log(`\ngravados: ${ok} · falhas: ${erro}`)

// λ.prova-na-fonte · conferencia lendo a base de novo, nao o retorno do update
const depois = await all('appointments', 'id, customer_id, client_phone')
const aindaOrfaos = depois.filter((a) => !a.customer_id && a.client_phone).length
console.log(`orfaos restantes na base: ${aindaOrfaos} (esperado: ${semMatch})`)
