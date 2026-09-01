/* Monta o cenario pra provar os DOIS lembretes hoje, sem esperar dias.
 *
 * O `varrer` dispara quando  alvo <= agora < alvo + 2h,  onde
 * alvo = instante do agendamento + offset. Entao a gente escolhe horarios
 * que caiam na janela AGORA:
 *
 *   lembrete da vespera (-24h) -> agendamento AMANHA, ~1h atras no relogio
 *   lembrete do dia     (-3h)  -> agendamento HOJE, daqui a ~4h
 *
 * Cada um cai na janela de um lembrete so, entao da pra ver os dois
 * separados e saber qual e' qual.
 *
 * node scripts/_teste-lembretes.mjs
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
const NEG = 'cd3c7f5a-e657-4ddb-96c7-0a4ff45b63eb' // Studio Marcela Hair
const FONE = '(63) 99292-0080' // mesmo numero que recebeu a confirmacao

const agoraBR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
const dia = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

console.log('agora (BR):', dia(agoraBR), hhmm(agoraBR))

// ── 1. lembrete do dia precisa de offset valido ─────────────────
const { error: e1 } = await db
  .from('message_rules')
  .update({ offset_minutos: -180 })
  .eq('business_id', NEG)
  .eq('tipo', 'lembrete_dia')
console.log('\nlembrete_dia -> 3h antes:', e1 ? 'ERRO ' + e1.message : 'ok')

const { data: conf } = await db
  .from('message_rules')
  .select('tipo, enabled, offset_minutos')
  .eq('business_id', NEG)
  .order('tipo')
for (const r of conf ?? [])
  console.log('  ', r.tipo.padEnd(18), r.enabled ? 'LIGADO' : 'off   ', String(r.offset_minutos).padStart(6))

// ── 2. servico e profissional reais ─────────────────────────────
const { data: svc } = await db
  .from('services')
  .select('id, name, duration_minutes')
  .eq('business_id', NEG)
  .limit(1)
  .maybeSingle()
const { data: pro } = await db
  .from('professionals')
  .select('id, name')
  .eq('business_id', NEG)
  .limit(1)
  .maybeSingle()
console.log('\nservico:', svc?.name, '| profissional:', pro?.name)

// ── 3. os dois agendamentos ─────────────────────────────────────
/* VESPERA: alvo = quando - 24h. Pra cair na janela, `quando` tem que ser
   amanha num horario que ja passou hoje — 1h atras da conta. */
const vespera = new Date(agoraBR.getTime() - 60 * 60 * 1000)
const amanha = new Date(agoraBR.getTime() + 24 * 60 * 60 * 1000)

/* DIA: alvo = quando - 3h. Daqui a 4h coloca o alvo 1h atras. */
const maisTarde = new Date(agoraBR.getTime() + 4 * 60 * 60 * 1000)

const novos = [
  {
    rotulo: 'VESPERA (chega hoje, atendimento amanha)',
    appointment_date: dia(amanha),
    start_time: `${hhmm(vespera)}:00`,
    client_name: 'Teste Vespera',
  },
  {
    rotulo: 'LEMBRETE DO DIA (chega hoje, atendimento hoje)',
    appointment_date: dia(agoraBR),
    start_time: `${hhmm(maisTarde)}:00`,
    client_name: 'Teste Dia',
  },
]

for (const n of novos) {
  const fim = new Date(
    new Date(`${n.appointment_date}T${n.start_time}`).getTime() +
      (svc?.duration_minutes ?? 60) * 60000,
  )
  const { data, error } = await db
    .from('appointments')
    .insert({
      business_id: NEG,
      professional_id: pro?.id ?? null,
      client_name: n.client_name,
      client_phone: FONE,
      appointment_date: n.appointment_date,
      start_time: n.start_time,
      end_time: `${String(fim.getHours()).padStart(2, '0')}:${String(fim.getMinutes()).padStart(2, '0')}:00`,
      service_id: svc?.id ?? null,
      service_name: svc?.name ?? 'Atendimento',
      status: 'confirmed',
      total_price: 0,
    })
    .select('id, appointment_date, start_time')
    .single()
  console.log(
    `\n${n.rotulo}`,
    error ? '\n  ERRO ' + error.message : `\n  ${data.appointment_date} ${data.start_time} · id ${data.id}`,
  )
}
console.log('\nPronto. Agora e so rodar o varrer.')
