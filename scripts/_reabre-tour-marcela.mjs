/* Zera o tour da Marcela pra reabrir na proxima visita (uso: revisao). */
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(
  fs.readFileSync('.env.local','utf8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i=l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
const M='cd3c7f5a-e657-4ddb-96c7-0a4ff45b63eb'
await db.from('businesses').update({ tour_sumidos_em:null, tour_sumidos_2_em:null }).eq('id',M)
const {data}=await db.from('businesses').select('name,tour_sumidos_em,tour_sumidos_2_em').eq('id',M).single()
console.log('PROVA:', JSON.stringify(data), '· null = tour vai abrir')
