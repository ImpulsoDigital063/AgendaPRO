#!/usr/bin/env node
/**
 * Auditoria RLS · detecta tabelas do schema public expostas ao anon key.
 *
 * Read-only. Compara COUNT(exact) visto pelo service_role (admin, ignora RLS)
 * contra o COUNT visto pelo anon key (público). Não baixa nenhuma linha.
 *
 *  - anon vê == admin vê (e > 0)  -> EXPOSTA (RLS off ou policy permissiva)
 *  - anon vê 0, admin vê > 0      -> protegida
 *  - ambos 0                      -> indeterminado (tabela vazia) -> probe extra
 *  - anon recebe erro             -> protegida / sem grant
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, '.env.local'), 'utf-8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      let v = l.slice(i + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      return [l.slice(0, i).trim(), v]
    })
)

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SVC = env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(URL_, SVC, { auth: { persistSession: false } })
const anon = createClient(URL_, ANON, { auth: { persistSession: false } })

// 1) lista tabelas do schema public via OpenAPI do PostgREST
const spec = await fetch(`${URL_}/rest/v1/`, { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } }).then((r) => r.json())
const tables = Object.keys(spec.definitions || spec.paths || {})
  .map((k) => k.replace(/^\//, ''))
  .filter((k) => k && !k.startsWith('rpc/') && !k.includes('/'))
const uniq = [...new Set(tables)].sort()

const count = async (client, t) => {
  const { count, error } = await client.from(t).select('*', { count: 'exact', head: true })
  if (error) return { blocked: true, msg: error.message }
  return { count: count ?? 0 }
}

const exposed = []
const protectedT = []
const indet = []

for (const t of uniq) {
  const a = await count(anon, t)
  const d = await count(admin, t)
  if (a.blocked) { protectedT.push(`${t} (anon bloqueado: ${a.msg})`); continue }
  const adminN = d.blocked ? '?' : d.count
  if (!d.blocked && d.count === 0 && a.count === 0) { indet.push(`${t} (vazia — anon CONSEGUE consultar, sem dados)`); continue }
  if (a.count > 0 || (!d.blocked && a.count === d.count)) exposed.push(`${t}  anon=${a.count} / admin=${adminN}`)
  else protectedT.push(`${t}  anon=${a.count} / admin=${adminN}`)
}

console.log(`\n=== ${uniq.length} tabelas em public ===\n`)
console.log(`🔴 EXPOSTAS ao público (${exposed.length}):`)
exposed.forEach((t) => console.log('   ' + t))
console.log(`\n🟡 INDETERMINADAS — anon acessa mas tabela vazia (${indet.length}):`)
indet.forEach((t) => console.log('   ' + t))
console.log(`\n🟢 PROTEGIDAS (${protectedT.length}):`)
protectedT.forEach((t) => console.log('   ' + t))
