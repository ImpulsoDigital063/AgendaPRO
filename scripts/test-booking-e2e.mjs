import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, '.env.local'), 'utf-8')
    .split('\n').filter((l) => l.trim() && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); let v = l.slice(i + 1).trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); return [l.slice(0, i).trim(), v] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const BASE = process.env.AUDIT_BASE || 'http://localhost:3002'

const businessId = '5feaa3dd-5cb1-41d8-9880-c2ca7fd3d3e9'
const professionalId = '4011d0f8-67cd-4d1f-ae7d-383cb91a6c10'
const service = { id: '5263a675-ff9e-46e6-bd5e-406da6d3dda8', name: 'Corte Simples', price: 30, duration_minutes: 30, points: 30 }
const TEST_PHONE = '63999000001' // fake — abortamos se já existir
const TEST_NAME = 'TESTE RLS Verbo'

// data futura num dia útil (seg-sáb)
const d = new Date(); d.setDate(d.getDate() + 100)
while (d.getDay() === 0) d.setDate(d.getDate() + 1)
const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const startTime = '17:00'
const endTime = '17:30'

const j = (r) => r.json()
let ok = true
const log = (s) => console.log(s)

// 0. guard: telefone fake não pode existir em prod
const { data: pre } = await db.from('customers').select('id').eq('phone', TEST_PHONE).maybeSingle()
const { data: preC } = await db.from('clients').select('id').eq('phone', TEST_PHONE).maybeSingle()
if (pre || preC) { console.error('ABORT: telefone de teste já existe em prod, não vou mexer.'); process.exit(1) }

// 1. availability
const avail = await fetch(`${BASE}/api/booking/availability?business=${businessId}&professional=${professionalId}&date=${date}`).then(j)
log(`1) availability → ${avail.appointments?.length ?? '?'} appts, ${avail.blocks?.length ?? '?'} blocks ${Array.isArray(avail.appointments) ? 'OK' : 'FALHOU'}`)
if (!Array.isArray(avail.appointments)) ok = false

// 2. lookup (deve ser null)
const look = await fetch(`${BASE}/api/booking/lookup-client?phone=${TEST_PHONE}`).then(j)
log(`2) lookup-client (fake) → client=${JSON.stringify(look.client)} ${look.client === null ? 'OK' : 'INESPERADO'}`)

// 3. submit
const sub = await fetch(`${BASE}/api/booking/submit`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ businessId, professionalId, clientId: null, clientName: TEST_NAME, clientPhone: TEST_PHONE, clientEmail: null, clientBirthday: '', services: [service], date, startTime, endTime, referralCode: null, hasPrice: true, totalPrice: 30 }),
}).then(j)
log(`3) submit → ${JSON.stringify(sub)}`)
if (!sub.ok || !sub.appointmentId) { ok = false; console.error('   submit FALHOU') }

// 4. PROVA NA FONTE: ler a row gravada
if (sub.appointmentId) {
  const { data: appt } = await db.from('appointments').select('id, client_name, client_phone, professional_id, appointment_date, start_time, end_time, status, total_price').eq('id', sub.appointmentId).maybeSingle()
  log(`4) read-after-write appointment → ${JSON.stringify(appt)}`)
  const { data: aps } = await db.from('appointment_services').select('service_name, price').eq('appointment_id', sub.appointmentId)
  log(`   appointment_services → ${JSON.stringify(aps)}`)
  const { data: cust } = await db.from('customers').select('id, name, phone, total_points').eq('phone', TEST_PHONE).maybeSingle()
  const { data: cli } = await db.from('clients').select('id, name, phone').eq('phone', TEST_PHONE).maybeSingle()
  log(`   customer criado → ${JSON.stringify(cust)}`)
  log(`   client criado → ${JSON.stringify(cli)}`)
  const gravou = appt && appt.client_phone === TEST_PHONE && aps?.length === 1 && cust && cli
  log(`   PROVA: ${gravou ? 'GRAVOU TUDO ✓' : 'INCOMPLETO ✗'}`)
  if (!gravou) ok = false

  // 5. lookup agora deve achar o client de teste
  const look2 = await fetch(`${BASE}/api/booking/lookup-client?phone=${TEST_PHONE}`).then(j)
  log(`5) lookup-client (após criar) → ${look2.client ? `achou ${look2.client.name} OK` : 'não achou ✗'}`)
  if (!look2.client) ok = false

  // 6. CLEANUP — apaga tudo que o teste criou
  await db.from('appointment_services').delete().eq('appointment_id', sub.appointmentId)
  await db.from('appointments').delete().eq('id', sub.appointmentId)
  if (cust) await db.from('customers').delete().eq('id', cust.id)
  if (cli) await db.from('clients').delete().eq('id', cli.id)
  // confirma limpeza
  const { data: chk } = await db.from('appointments').select('id').eq('id', sub.appointmentId).maybeSingle()
  const { data: chkC } = await db.from('customers').select('id').eq('phone', TEST_PHONE).maybeSingle()
  log(`6) cleanup → appointment ${chk ? 'AINDA EXISTE ✗' : 'apagado'} · customer ${chkC ? 'AINDA EXISTE ✗' : 'apagado'}`)
  if (chk || chkC) ok = false
}

console.log(`\n=== ${ok ? 'E2E OK ✓' : 'E2E FALHOU ✗'} ===`)
process.exit(ok ? 0 : 1)
