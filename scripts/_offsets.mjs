import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
for (const l of fs.readFileSync('.env.local','utf8').split('\n')) {
  if(!l||l.startsWith('#')||!l.includes('='))continue
  const i=l.indexOf('='); const k=l.slice(0,i).trim()
  if(!process.env[k]) process.env[k]=l.slice(i+1).trim().replace(/^["']|["']$/g,'')
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data: bs } = await db.from('businesses').select('id,name')
const nome=new Map(bs.map(b=>[b.id,b.name]))
const { data: rs } = await db.from('message_rules').select('business_id,tipo,enabled,offset_minutos').eq('tipo','lembrete_dia')
console.log('LEMBRETE NO DIA — offset por negocio\n')
console.log('NEGOCIO'.padEnd(30),'ON?  OFFSET   =HORAS  OPCAO NA TELA NOVA?')
const OPCOES=[1,2,3,4,6,8,12]
let colidem=0, foraDaLista=0
for(const r of rs??[]){
  const h=Math.round(Math.abs(r.offset_minutos)/60)
  const ok=OPCOES.includes(h)
  if(!ok) foraDaLista++
  if(Math.abs(r.offset_minutos)===1440) colidem++
  console.log(String(nome.get(r.business_id)??'?').slice(0,29).padEnd(30), (r.enabled?'ON ':'off'), String(r.offset_minutos).padStart(7), String(h+'h').padStart(7), '  ', ok?'sim':'NAO -> select vazio')
}
console.log('\ncom offset de 1440 (= mesma hora da vespera):', colidem, 'de', rs.length)
console.log('com valor fora das opcoes do seletor:', foraDaLista, 'de', rs.length)
