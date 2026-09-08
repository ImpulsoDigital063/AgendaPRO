/* Quantos sumidos deixavam de casar por causa da grafia do telefone. */
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(
  fs.readFileSync('.env.local','utf8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i=l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
// canonico simplificado, so pra medir: digitos sem DDI, com 9 garantido
function canon(raw){ let d=String(raw||'').replace(/\D/g,''); if(d.startsWith('55')&&d.length>11)d=d.slice(2)
  if(d.length===10) d=d.slice(0,2)+'9'+d.slice(2); return d }
const hoje=new Date().toISOString().slice(0,10)
const dd=(de,ate)=>Math.round((Date.parse(ate+'T00:00:00Z')-Date.parse(de+'T00:00:00Z'))/86400000)
const {data:bizs}=await db.from('businesses').select('id,name')
console.log('negocio'.padEnd(28),'sumidos'.padStart(8),'casava'.padStart(7),'passa a casar'.padStart(14))
for(const nome of ['Olímpio','Rosy','Wanessa','Viva','Gessica','MOOD','Diogo']){
  const b=(bizs||[]).find(x=>(x.name||'').toLowerCase().includes(nome.toLowerCase())); if(!b) continue
  const linhas=[]
  for(let p=0;;p+=1000){
    const {data}=await db.from('appointments').select('client_id,appointment_date')
      .eq('business_id',b.id).not('client_id','is',null).range(p,p+999)
    if(!data?.length)break; linhas.push(...data); if(data.length<1000)break
  }
  const u=new Map()
  for(const a of linhas){const c=u.get(a.client_id); if(!c||a.appointment_date>c)u.set(a.client_id,a.appointment_date)}
  const ids=[...u.entries()].filter(([,x])=>dd(x,hoje)>=15).map(([i])=>i)
  if(!ids.length) continue
  const {data:cs}=await db.from('clients').select('id,phone').in('id',ids)
  const {data:cu}=await db.from('customers').select('phone').eq('business_id',b.id)
  const cruas=new Set((cu||[]).map(c=>c.phone))
  const canons=new Set((cu||[]).map(c=>canon(c.phone)))
  const antes=(cs||[]).filter(c=>cruas.has(c.phone)).length
  const depois=(cs||[]).filter(c=>canons.has(canon(c.phone))).length
  console.log(b.name.slice(0,27).padEnd(28),String(ids.length).padStart(8),String(antes).padStart(7),String(depois-antes).padStart(14))
}
