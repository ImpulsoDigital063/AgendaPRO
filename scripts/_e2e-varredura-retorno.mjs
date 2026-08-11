/* Roda a VARREDURA DE VERDADE em produção e observa o aviso de retorno
   percorrer o caminho inteiro: regra ligada -> candidato encontrado -> porta
   de envio.

   SÓ NA CONTA ESPELHO, e por um motivo concreto: ela é cortesia permanente,
   e `podeFalarPelo` recusa falar por conta demo. Ou seja, o caminho roda
   inteiro e para na última porta, sem disparar nada pro telefone de ninguém.
   A conta real da clínica NÃO entra aqui — lá o envio aconteceria de fato, e
   o canal ainda é a instância de teste da W-API.

   uso: node scripts/_e2e-varredura-retorno.mjs */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); let v = l.slice(i + 1).trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); return [l.slice(0, i).trim(), v] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const PROD = 'https://www.agendapro.net.br'
const SEGREDO = env.CRON_SECRET
if (!SEGREDO) { console.error('CRON_SECRET não achado no .env.local'); process.exit(1) }

const agoraBR = new Date(Date.now() - 3 * 3600_000)
const hoje = agoraBR.toISOString().slice(0, 10)
const horaBR = agoraBR.getUTCHours()
const mais = (d, n) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10) }

const { data: b } = await db.from('businesses').select('id, slug').eq('slug', 'clinica-teste-fichas').single()
const { data: sub } = await db.from('subscriptions').select('permanent_courtesy').eq('business_id', b.id).maybeSingle()
if (sub?.permanent_courtesy !== true) {
  console.error('ABORTADO: a conta espelho deixou de ser cortesia — sem essa trava o teste enviaria de verdade.')
  process.exit(1)
}
console.log(`conta espelho confirmada como cortesia · hora BR ${String(horaBR).padStart(2, '0')}h`)

const { data: toxina } = await db.from('services')
  .select('id, name, retorno_dias').eq('business_id', b.id).ilike('name', '%toxina%').single()

// 1) liga a regra de retorno na hora atual, pra varredura aceitar agora
const { error: eRegra } = await db.from('message_rules').upsert(
  { business_id: b.id, tipo: 'retorno', enabled: true, hora_do_dia: `${String(horaBR).padStart(2, '0')}:00` },
  { onConflict: 'business_id,tipo' },
)
console.log(eRegra ? '  FALHA ao ligar regra: ' + eRegra.message : '  OK   regra "retorno" ligada às ' + String(horaBR).padStart(2, '0') + ':00')

// 2) paciente com toxina concluída exatamente no prazo
const { data: cli } = await db.from('customers')
  .insert({ business_id: b.id, name: 'PROVA VARREDURA', phone: `4598${String(Date.now()).slice(-7)}` })
  .select('id, phone').single()
const { data: ap } = await db.from('appointments').insert({
  business_id: b.id, customer_id: cli.id, client_name: 'PROVA VARREDURA', client_phone: cli.phone,
  service_id: toxina.id, service_name: toxina.name,
  appointment_date: mais(hoje, -Number(toxina.retorno_dias)), start_time: '10:00', end_time: '11:00',
  status: 'completed',
}).select('id').single()
console.log(`  OK   cenário: ${toxina.name} concluída em ${mais(hoje, -Number(toxina.retorno_dias))} (${toxina.retorno_dias} dias)`)

// 3) chama a varredura de produção
const r = await fetch(`${PROD}/api/mensagens/varrer`, { headers: { authorization: `Bearer ${SEGREDO}` } })
const j = await r.json().catch(() => ({}))
console.log('  varredura respondeu:', JSON.stringify(j))

// 4) o candidato tem que existir, ser processado e parar na trava certa
const ok = (t) => console.log('  OK   ' + t)
const nok = (t) => { console.log('  FALHA ' + t); process.exitCode = 1 }
j.candidatos >= 1 ? ok('a varredura encontrou o candidato') : nok('nenhum candidato encontrado')
j.enviados === 0 ? ok('nada foi enviado') : nok('ENVIOU DE VERDADE — a trava de conta demo não segurou')
j.motivos?.conta_demo >= 1
  ? ok('parou na trava certa: conta_demo')
  : nok('parou por outro motivo: ' + JSON.stringify(j.motivos))

/* A trava de conta demo devolve ANTES de gravar no message_log, de propósito.
   Então log vazio aqui é o comportamento esperado, não falha — o que prova o
   caminho é o `motivos` da resposta. */
const { data: log } = await db.from('message_log').select('status').eq('appointment_id', ap.id)
console.log(`  (message_log: ${log?.length ?? 0} linha — esperado 0, a trava devolve antes de gravar)`)

// 5) limpa tudo, inclusive o log (senão a chave única impede repetir o teste)
await db.from('message_log').delete().eq('appointment_id', ap.id)
await db.from('appointments').delete().eq('id', ap.id)
await db.from('customers').delete().eq('id', cli.id)
await db.from('message_rules').delete().eq('business_id', b.id).eq('tipo', 'retorno')
console.log('  OK   cenário, log e regra removidos')
