import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
for (const l of fs.readFileSync('.env.local','utf8').split('\n')) {
  if(!l||l.startsWith('#')||!l.includes('='))continue
  const i=l.indexOf('='); const k=l.slice(0,i).trim()
  if(!process.env[k]) process.env[k]=l.slice(i+1).trim().replace(/^["']|["']$/g,'')
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const de=new Date(Date.now()-90*864e5).toISOString().slice(0,10)
const { data: bs } = await db.from('businesses').select('id,name').order('name')
const linhas=[]
for (const b of bs) {
  const { count } = await db.from('appointments').select('id',{count:'exact',head:true})
    .eq('business_id', b.id).gte('appointment_date', de)
  linhas.push({ nome:b.name, a90:count??0, mes:Math.round((count??0)/3) })
}
linhas.sort((x,y)=>y.a90-x.a90)
console.log('desde', de, '\n')
console.log('NEGOCIO'.padEnd(30),'90d'.padStart(5),'MES'.padStart(5))
for(const l of linhas) console.log(String(l.nome).slice(0,29).padEnd(30), String(l.a90).padStart(5), String(l.mes).padStart(5))
const zero=linhas.filter(l=>l.mes===0).length
console.log('\nnegocios com estimativa ZERO (mes arredonda p/ 0):', zero, 'de', linhas.length)
