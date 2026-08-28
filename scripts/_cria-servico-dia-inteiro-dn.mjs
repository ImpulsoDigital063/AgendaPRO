// v122 · etapa 2 — cria "Instalação - dia inteiro" no DN.
// SÓ rodar com o código da v122 JÁ NO AR em produção.
// 510min = 08:30→17:00, a janela contínua do expediente dele.
// Preço em branco de propósito: o valor varia por metragem e ele lança na comanda.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
for (const l of env.split(/\r?\n/)) { if(!l||l.startsWith('#')||!l.includes('='))continue; const i=l.indexOf('='); const k=l.slice(0,i).trim(); if(!process.env[k])process.env[k]=l.slice(i+1).trim().replace(/^"(.*)"$/,'$1') }
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})

const DN = '24390a3c-04d1-46dc-a796-12e51a0d4e6d'
const NOME = 'Instalação - dia inteiro'

const { data: ja } = await admin.from('services')
  .select('id,name,duration_minutes,active').eq('business_id', DN).eq('name', NOME)
if (ja?.length) { console.log('já existe, nada a fazer:', JSON.stringify(ja)); process.exit(0) }

const { data, error } = await admin.from('services').insert({
  business_id: DN,
  name: NOME,
  description: 'Quando a instalação toma o dia todo. Fecha a agenda das 08:30 às 17:00.',
  price: null,
  duration_minutes: 510,
  points: 0,
  active: true,
}).select().single()
if (error) { console.log('ERRO:', error.message); process.exit(1) }

// λ.prova-na-fonte — lê a row depois de escrever
const { data: conf } = await admin.from('services')
  .select('id,name,price,duration_minutes,active').eq('id', data.id).single()
console.log('CRIADO:', JSON.stringify(conf))

const { data: todos } = await admin.from('services')
  .select('name,duration_minutes,price,active').eq('business_id', DN).order('duration_minutes')
console.log('\nCATÁLOGO DO DN AGORA:')
for (const s of todos) console.log(`  ${s.active?'ATIVO  ':'inativo'} ${String(s.name).padEnd(32)} ${s.duration_minutes}min  preco=${s.price}`)
