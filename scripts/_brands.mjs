import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
for (const l of fs.readFileSync('.env.local','utf8').split('\n')) {
  if(!l||l.startsWith('#')||!l.includes('='))continue
  const i=l.indexOf('='); const k=l.slice(0,i).trim()
  if(!process.env[k]) process.env[k]=l.slice(i+1).trim().replace(/^["']|["']$/g,'')
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await db.from('businesses').select('name,brand_primary,brand_secondary,brand_accent').order('name')
function lum(hex){ if(!hex||!/^#?[0-9a-f]{6}$/i.test(hex))return null
  const h=hex.replace('#',''); const [r,g,b]=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255)
  const f=c=>c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)
  return (0.2126*f(r)+0.7152*f(g)+0.0722*f(b)) }
console.log('NEGOCIO'.padEnd(30),'PRIMARY'.padEnd(10),'LUM   ESCURO?')
let escuros=0, semMarca=0
for(const b of data??[]){
  const L=lum(b.brand_primary)
  if(!b.brand_primary){semMarca++; continue}
  const esc = L!==null && L<0.12
  if(esc) escuros++
  console.log(String(b.name).slice(0,29).padEnd(30), String(b.brand_primary).padEnd(10), (L===null?'-':L.toFixed(3)).padStart(5), esc?'  SIM <- vira preto':'')
}
console.log('\nsem marca (usa azul padrao):',semMarca)
console.log('com accent MUITO escuro:',escuros)
