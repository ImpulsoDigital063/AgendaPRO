import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
for (const l of fs.readFileSync('.env.local','utf8').split('\n')) {
  if(!l||l.startsWith('#')||!l.includes('='))continue
  const i=l.indexOf('='); const k=l.slice(0,i).trim()
  if(!process.env[k]) process.env[k]=l.slice(i+1).trim().replace(/^["']|["']$/g,'')
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data: b } = await db.from('businesses').select('*').ilike('name','%Marcela%').maybeSingle()
if(!b){console.log('nao achou');process.exit(0)}
const campos=['id','name','owner_id','phone','asaas_customer_id','avisos_pacote','avisos_unidades','avisos_desde','avisos_ate']
for(const c of campos) console.log(c.padEnd(20), JSON.stringify(b[c] ?? null))
const { data: sub } = await db.from('subscriptions').select('status,plan,refunded_at,grace_ends_at,current_period_end').eq('business_id',b.id).maybeSingle()
console.log('\nsubscription:', JSON.stringify(sub))
const { data: u } = await db.auth.admin.getUserById(b.owner_id)
console.log('owner email:', u?.user?.email)
const { data: regras } = await db.from('message_rules').select('tipo,enabled').eq('business_id',b.id)
console.log('regras:', JSON.stringify(regras))
