import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
for (const l of fs.readFileSync('.env.local','utf8').split('\n')) {
  if(!l||l.startsWith('#')||!l.includes('='))continue
  const i=l.indexOf('='); const k=l.slice(0,i).trim()
  if(!process.env[k]) process.env[k]=l.slice(i+1).trim().replace(/^["']|["']$/g,'')
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await db.from('businesses').select('name, phone').order('name')
const rs=(data??[]).map(b=>({n:b.name??'',len:(b.name??'').length,tel:b.phone??''}))
rs.sort((a,b)=>b.len-a.len)
console.log('LEN  NOME')
for(const r of rs) console.log(String(r.len).padStart(3), r.n, r.tel?'':'  <-- SEM TELEFONE')
console.log('\nmais longo:', rs[0].len, 'caracteres')
console.log('acima de 28 (cabecalho trunca):', rs.filter(r=>r.len>28).length)
