import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { consumoDoMes, podeEnviar } from '../src/lib/mensagens/franquia.ts'
for (const l of fs.readFileSync('.env.local','utf8').split('\n')) {
  if(!l||l.startsWith('#')||!l.includes('='))continue
  const i=l.indexOf('='); const k=l.slice(0,i).trim()
  if(!process.env[k]) process.env[k]=l.slice(i+1).trim().replace(/^["']|["']$/g,'')
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ID='cd3c7f5a-e657-4ddb-96c7-0a4ff45b63eb'
const c = await consumoDoMes(db, ID)
console.log('consumoDoMes:', JSON.stringify(c, null, 1))
console.log('\npodeEnviar  :', JSON.stringify(await podeEnviar(db, ID)))
