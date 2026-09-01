/* Prepara os dois ultimos exercicios do motor.
 *
 * 1. BOTAO CONFIRMAR — o agendamento do lembrete volta pra `pending`. Quando
 *    o Eduardo tocar em "Confirmar presenca" no celular, o webhook le o
 *    payload `confirmar:<id>` e tem que virar `confirmed` sozinho. Com ele ja
 *    confirmado nao daria pra ver diferenca nenhuma.
 *
 * 2. ANIVERSARIO — a regra esta desligada, e mesmo ligada so dispara na HORA
 *    configurada (`hora_do_dia`, padrao 09:00). Aqui liga, aponta pra hora
 *    atual e poe a data de hoje no cadastro do cliente de teste.
 *
 *    🔴 Aniversario e' MARKETING pra Meta: gasta 7 unidades, nao 1.
 *
 * node scripts/_teste-botao-e-aniversario.mjs
 */
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  if (!l || l.startsWith('#') || !l.includes('=')) continue
  const i = l.indexOf('=')
  const k = l.slice(0, i).trim()
  if (!process.env[k]) process.env[k] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '')
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NEG = 'cd3c7f5a-e657-4ddb-96c7-0a4ff45b63eb'

const agoraBR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
const p = (n) => String(n).padStart(2, '0')
const hojeBR = `${agoraBR.getFullYear()}-${p(agoraBR.getMonth() + 1)}-${p(agoraBR.getDate())}`
const horaAtual = `${p(agoraBR.getHours())}:00`

console.log('agora BR:', hojeBR, `${p(agoraBR.getHours())}:${p(agoraBR.getMinutes())}`)

// ── 1. BOTAO: devolve o agendamento pra pending ──────────────────
const { data: alvo } = await db
  .from('appointments')
  .select('id, client_name, appointment_date, start_time, status')
  .eq('business_id', NEG)
  .eq('client_name', 'Teste Dia 2')
  .maybeSingle()

if (!alvo) {
  console.log('\n[botao] nao achei o agendamento "Teste Dia 2"')
} else {
  await db.from('appointments').update({ status: 'pending' }).eq('id', alvo.id)
  const { data: dep } = await db
    .from('appointments')
    .select('status')
    .eq('id', alvo.id)
    .maybeSingle()
  console.log('\n[botao] agendamento', alvo.id)
  console.log('        ', alvo.appointment_date, alvo.start_time, '|', alvo.client_name)
  console.log('         status agora:', dep?.status, '(era', alvo.status + ')')
  console.log('         >>> toque em "Confirmar presenca" na mensagem das 16:35')
}

// ── 2. ANIVERSARIO: liga, aponta pra hora atual, poe a data ──────
const { error: eR } = await db
  .from('message_rules')
  .update({ enabled: true, hora_do_dia: horaAtual })
  .eq('business_id', NEG)
  .eq('tipo', 'aniversario')

const { data: regra } = await db
  .from('message_rules')
  .select('enabled, hora_do_dia')
  .eq('business_id', NEG)
  .eq('tipo', 'aniversario')
  .maybeSingle()
console.log('\n[aniversario] regra:', eR ? 'ERRO ' + eR.message : `${regra?.enabled ? 'LIGADA' : 'off'} às ${regra?.hora_do_dia}`)

/* Cliente de teste: o mesmo telefone que recebeu tudo ate aqui. */
const { data: cli } = await db
  .from('customers')
  .select('id, name, phone, birthday')
  .eq('business_id', NEG)
  .ilike('phone', '%92920080%')
  .limit(1)
  .maybeSingle()

if (!cli) {
  console.log('[aniversario] nao achei o cliente com o telefone de teste')
} else {
  /* Ano antigo de proposito: o varrer compara so mes e dia. */
  const aniversario = `1990-${p(agoraBR.getMonth() + 1)}-${p(agoraBR.getDate())}`
  await db.from('customers').update({ birthday: aniversario }).eq('id', cli.id)
  const { data: dep } = await db
    .from('customers')
    .select('name, phone, birthday')
    .eq('id', cli.id)
    .maybeSingle()
  console.log('[aniversario] cliente:', dep?.name, '|', dep?.phone, '| birthday:', dep?.birthday)
}

console.log('\n🔴 aniversario gasta 7 unidades, nao 1.')
console.log('Depois do teste, rodar _restaura-apos-teste.mjs pra desligar de novo.')
