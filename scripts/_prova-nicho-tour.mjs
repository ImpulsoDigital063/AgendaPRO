/* Que frase cada negocio real vai ver no tour. */
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(
  fs.readFileSync('.env.local','utf8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i=l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
function cat(d){ if(!d) return 'generic'; d=d.toLowerCase()
  if(d.includes('barbearia')||d.includes('barber'))return 'barbearia'
  if(d.includes('salão')||d.includes('salao')||d.includes('cabelo')||d.includes('cabelei'))return 'salao'
  if(d.includes('estética')||d.includes('estetica')||d.includes('clínica'))return 'estetica'
  if(d.includes('nail'))return 'nail'
  if(d.includes('manicure')||d.includes('pedicure'))return 'manicure'
  if(d.includes('tatua')||d.includes('tattoo')||d.includes('tatto'))return 'tatuagem'
  if(d.includes('psicó')||d.includes('psico')||d.includes('terape'))return 'psicologo'
  if(d.includes('personal')||d.includes('treino')||d.includes('academia'))return 'personal'
  return 'generic' }
const F={barbearia:'Corte e barba costumam pedir 15 ou 20 dias.',nail:'Manutenção de unha costuma pedir 15 ou 20 dias.',
 manicure:'Manutenção de unha costuma pedir 15 ou 20 dias.',salao:'Retoque de raiz costuma pedir 20 ou 30 dias; corte, 40.',
 estetica:'Sessão de manutenção costuma pedir 20 ou 30 dias.',psicologo:'Em atendimento semanal ou quinzenal, 15 ou 20 dias já é falta.',
 personal:'Quem treina toda semana: 15 dias parado já é sinal.',tatuagem:'Retoque e sessão seguinte costumam levar 30 ou 40 dias.',
 generic:'Escolha o prazo que faz sentido pro seu tipo de atendimento.'}
const ALVOS=['Olímpio','Rosy','Wanessa','Viva','Gessica','MOOD','Diogo','CAF','Isis','Marcela']
const {data:b}=await db.from('businesses').select('name,description')
for(const a of ALVOS){
  const m=(b||[]).find(x=>(x.name||'').toLowerCase().includes(a.toLowerCase())); if(!m) continue
  const c=cat(m.description)
  console.log(`${m.name.slice(0,26).padEnd(27)} [${c.padEnd(9)}] ${F[c]}`)
}
