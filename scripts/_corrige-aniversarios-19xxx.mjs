/* Conserta datas de nascimento gravadas com ano de 5 digitos.
 *
 * Achado em 01/09 preparando o teste de aniversario: 25 de 367 clientes com
 * `birthday` no formato `19100-04-12`. E' o bug classico do `getYear()`, que
 * devolve anos desde 1900 — pra quem nasceu em 2000 ele retorna 100, e alguem
 * concatenou "19" + 100.
 *
 *   19100 -> 2000    19103 -> 2003
 *   19101 -> 2001    19104 -> 2004
 *   19102 -> 2002
 *
 * Sao clientes nascidos entre 2000 e 2004. Duas consequencias, e as duas
 * silenciosas: o aniversario nunca sairia pra eles (o varrer compara mes e dia
 * por POSICAO de caractere, e com ano de 5 digitos le "2-" como mes), e a
 * idade aparece errada em qualquer tela que use a data.
 *
 * `getYear()` nao existe mais no codigo — a origem ja morreu, sobrou o dado.
 *
 * node scripts/_corrige-aniversarios-19xxx.mjs          (so mostra)
 * node scripts/_corrige-aniversarios-19xxx.mjs --aplica (grava)
 */
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  if (!l || l.startsWith('#') || !l.includes('=')) continue
  const i = l.indexOf('=')
  const k = l.slice(0, i).trim()
  if (!process.env[k]) process.env[k] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '')
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const APLICA = process.argv.includes('--aplica')

const { data } = await db
  .from('customers')
  .select('id, name, birthday, business_id')
  .not('birthday', 'is', null)

/* So mexe no que casa com o padrao EXATO do bug. Data quebrada de outro
   jeito fica de fora — chutar aqui seria inventar o aniversario de alguem. */
const alvo = (data ?? []).filter((c) => /^191\d{2}-\d{2}-\d{2}$/.test(String(c.birthday)))

console.log('clientes com data de nascimento:', (data ?? []).length)
console.log('no padrao do bug (191XX):', alvo.length)

const corrigir = alvo.map((c) => {
  const s = String(c.birthday)
  const anoBug = Number(s.slice(0, 5)) // 19100..19104
  const ano = 1900 + (anoBug - 19000) // 19100 -> 2000
  return { ...c, novo: `${ano}${s.slice(5)}` }
})

console.log('\nde -> para:')
for (const c of corrigir.slice(0, 8)) console.log('  ', c.name.padEnd(22), c.birthday, '->', c.novo)
if (corrigir.length > 8) console.log('   … e mais', corrigir.length - 8)

if (!APLICA) {
  console.log('\n(simulacao — rode com --aplica pra gravar)')
  process.exit(0)
}

/* Backup antes de tocar. Data de nascimento nao da pra reconstruir. */
const arquivo = `backup-aniversarios-${new Date().toISOString().slice(0, 10)}.json`
fs.writeFileSync(
  arquivo,
  JSON.stringify(alvo.map(({ id, name, birthday, business_id }) => ({ id, name, birthday, business_id })), null, 1),
)
console.log('\nbackup:', arquivo)

let ok = 0
let falhou = 0
for (const c of corrigir) {
  const { error } = await db.from('customers').update({ birthday: c.novo }).eq('id', c.id)
  if (error) {
    console.log('  ERRO', c.name, error.message)
    falhou++
    continue
  }
  ok++
}
console.log(`\ngravados: ${ok} | falhas: ${falhou}`)

/* λ.prova-na-fonte: rele e conta quantos ainda estao quebrados. */
const { data: depois } = await db
  .from('customers')
  .select('id, birthday')
  .not('birthday', 'is', null)
const restam = (depois ?? []).filter((c) => /^191\d{2}-/.test(String(c.birthday)))
console.log('ainda quebrados depois:', restam.length)
