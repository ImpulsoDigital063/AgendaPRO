/* Leitura pura: quem esta pronto pra receber a prova de entrega.
   node scripts/_estado-canal-31-08.mjs */
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  if (!l || l.startsWith('#') || !l.includes('=')) continue
  const i = l.indexOf('='); const k = l.slice(0, i).trim()
  if (!process.env[k]) process.env[k] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '')
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { data: bs } = await db.from('businesses')
  .select('id, name, phone, avisos_pacote, avisos_unidades, avisos_desde, avisos_ate')
  .order('name')
const { data: subs } = await db.from('subscriptions').select('business_id, status, refunded_at, grace_ends_at')
const smap = new Map((subs ?? []).map(s => [s.business_id, s]))

console.log('NEGOCIO'.padEnd(26), 'ASSINATURA'.padEnd(12), 'PACOTE'.padEnd(11), 'UNID')
for (const b of bs ?? []) {
  const s = smap.get(b.id)
  console.log(
    (b.name ?? '?').slice(0,25).padEnd(26),
    String(s?.status ?? 'SEM').padEnd(12),
    String(b.avisos_pacote ?? '—').padEnd(11),
    String(b.avisos_unidades ?? 0),
  )
}
const { count } = await db.from('message_log').select('*', { count: 'exact', head: true })
console.log('\nmessage_log: ' + count + ' linhas')
const { data: ult } = await db.from('message_log')
  .select('tipo, status, provider_id, created_at, entregue_em, lido_em, erro')
  .order('created_at', { ascending: false }).limit(5)
console.log('ultimas 5:'); for (const m of ult ?? []) console.log(' ', JSON.stringify(m))
