import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
for (const l of fs.readFileSync('.env.local','utf8').split('\n')) {
  if(!l||l.startsWith('#')||!l.includes('='))continue
  const i=l.indexOf('='); const k=l.slice(0,i).trim()
  if(!process.env[k]) process.env[k]=l.slice(i+1).trim().replace(/^["']|["']$/g,'')
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await db.from('subscriptions').select('*').eq('business_id','cd3c7f5a-e657-4ddb-96c7-0a4ff45b63eb').maybeSingle()
console.log('pago_ate:', data?.pago_ate, '| dias:', data?.pago_ate ? ((new Date(data.pago_ate)-Date.now())/864e5).toFixed(0) : 'null->30')
