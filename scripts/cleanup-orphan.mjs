// Limpa conta meio-criada da tentativa anterior (auth + business sem subscription)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
for (const l of env.split(/\r?\n/)) { if (!l||l.startsWith('#')||!l.includes('='))continue; const [k,...r]=l.split('='); if(!process.env[k])process.env[k]=r.join('=').replace(/^"(.*)"$/,'$1') }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const email = process.argv[2]
if (!email) { console.error('uso: node cleanup-orphan.mjs <email>'); process.exit(1) }

// Busca user
const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 200 })
const user = users.find(u => u.email === email)
if (!user) { console.log('user não encontrado:', email); process.exit(0) }

// Deleta business órfão
const { data: biz } = await sb.from('businesses').select('id').eq('owner_id', user.id)
if (biz?.length) {
  for (const b of biz) {
    await sb.from('subscriptions').delete().eq('business_id', b.id)
    await sb.from('businesses').delete().eq('id', b.id)
    console.log('biz deletado:', b.id)
  }
}
await sb.auth.admin.deleteUser(user.id)
console.log('user deletado:', email)
