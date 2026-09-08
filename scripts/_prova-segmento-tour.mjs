/* O que cada negocio REAL vai ler, agora por `category`. */
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(
  fs.readFileSync('.env.local','utf8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i=l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
const PRAZO={'Barbearia':'Corte e barba · 15 ou 20 dias','Nail designer':'Unha · 15 ou 20 dias','Manicure':'Unha · 15 ou 20 dias',
'Cílios e sobrancelhas':'Cílios · 15 ou 20 dias','Salão de beleza':'Raiz 20-30 · corte 40','Clínica estética':'Manutenção · 20 ou 30 dias',
'Fisioterapia':'Sessões seguidas · 15 dias quebra a sequência','Clínica / consultório':'Retorno em 30 dias',
'Psicólogo / Terapeuta':'Semanal/quinzenal · 15-20 já é falta','Personal trainer':'15 dias parado já é sinal',
'Estúdio de tatuagem':'Retoque · 30 ou 40 dias'}
const TERMO=c=>['Fisioterapia','Clínica / consultório','Psicólogo / Terapeuta'].includes(c)?'pacientes':(c==='Personal trainer'?'alunos':'clientes')
const {data:b}=await db.from('businesses').select('name,category,description').order('name')
console.log('negocio'.padEnd(30),'category'.padEnd(24),'termo'.padEnd(10),'prazo sugerido')
for(const x of b||[]){
  const c=(x.category||'').trim()
  if(!c) continue
  console.log(x.name.slice(0,29).padEnd(30), c.slice(0,23).padEnd(24), TERMO(c).padEnd(10), PRAZO[c]??'(genérico)')
}
