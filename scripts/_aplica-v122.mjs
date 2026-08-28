// v122 · etapa 1 — liga a chave SÓ no DN Diogo Nogueira.
// Rode DEPOIS do ALTER TABLE (SQL editor) — PostgREST não executa DDL.
// A etapa 2 (criar o serviço "dia inteiro") só depois do código NO AR:
// serviço criado antes disso aparece pra cliente com a agenda toda "ocupada".
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
for (const l of env.split(/\r?\n/)) { if(!l||l.startsWith('#')||!l.includes('='))continue; const i=l.indexOf('='); const k=l.slice(0,i).trim(); if(!process.env[k])process.env[k]=l.slice(i+1).trim().replace(/^"(.*)"$/,'$1') }
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})

const DN = '24390a3c-04d1-46dc-a796-12e51a0d4e6d' // DN Diogo nogueira

const { error: probe } = await admin.from('businesses')
  .select('servico_longo_atravessa_intervalo').eq('id', DN).maybeSingle()
if (probe) {
  console.log('🔴 v122 AINDA NÃO APLICADA no banco:', probe.message)
  console.log('   Rode supabase-migration-v122-servico-longo-atravessa-intervalo.sql no SQL editor primeiro.')
  process.exit(1)
}
console.log('✅ coluna servico_longo_atravessa_intervalo existe')

const { error } = await admin.from('businesses')
  .update({ servico_longo_atravessa_intervalo: true }).eq('id', DN)
if (error) { console.log('ERRO NO UPDATE:', error.message); process.exit(1) }

// λ.prova-na-fonte — read-after-write
const { data: depois } = await admin.from('businesses')
  .select('name, slug, servico_longo_atravessa_intervalo').eq('id', DN).single()
console.log('DEPOIS:', JSON.stringify(depois))

// Ninguém mais pode ter ligado
const { count } = await admin.from('businesses')
  .select('id', { count: 'exact', head: true }).eq('servico_longo_atravessa_intervalo', true)
console.log('negócios com a chave ligada:', count, count === 1 ? '(só o DN — certo)' : '🔴 CONFERIR')
