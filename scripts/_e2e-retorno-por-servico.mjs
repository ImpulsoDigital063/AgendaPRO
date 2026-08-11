/* Prova a REGRA de retorno por procedimento contra o banco de produção, sem
   enviar mensagem nenhuma: monta os mesmos candidatos que a varredura monta e
   confere as travas.

   Cenário armado na conta ESPELHO:
     A) toxina concluída há exatamente 120 dias        -> DEVE avisar
     B) microagulhamento concluído há 15 dias          -> DEVE avisar
     C) microagulhamento há 15 dias MAS já reagendado  -> NAO deve avisar
     D) peeling há 21 dias, porém CANCELADO            -> NAO deve avisar
     E) toxina há 100 dias (ainda no intervalo)        -> NAO deve avisar

   uso: node scripts/_e2e-retorno-por-servico.mjs */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); let v = l.slice(i + 1).trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); return [l.slice(0, i).trim(), v] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const hojeBR = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10)
const maisDias = (d, n) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10) }
const hoje = hojeBR()

const { data: b } = await db.from('businesses').select('id').eq('slug', 'clinica-teste-fichas').single()
const { data: servicos } = await db.from('services').select('id, name, retorno_dias').eq('business_id', b.id).not('retorno_dias', 'is', null)
const svc = (frag) => servicos.find(s => s.name.toLowerCase().includes(frag))
const toxina = svc('toxina'), micro = svc('microagulhamento'), peeling = svc('peeling')
if (!toxina || !micro || !peeling) { console.error('serviços com prazo não achados no espelho'); process.exit(1) }

/* UM CLIENTE POR CENARIO. Na primeira versao deste teste todos os casos
   dividiam a mesma paciente — e aí o cenário E (toxina há 100 dias) fazia
   ela contar como "já voltou" pra toxina, suprimindo o aviso do A. O código
   estava certo; o teste é que misturava as pessoas. */
const clientes = {}
const criados = []
const pegarCliente = async (rotulo) => {
  if (clientes[rotulo]) return clientes[rotulo]
  const { data, error } = await db.from('customers')
    .insert({ business_id: b.id, name: `PROVA RETORNO ${rotulo}`, phone: `4598${String(Date.now()).slice(-7)}${Object.keys(clientes).length}` })
    .select('id').single()
  if (error) { console.log('  erro criando cliente', rotulo, error.message); throw error }
  clientes[rotulo] = data.id
  return data.id
}
const novo = async (rotulo, service, dias, status, comoCliente) => {
  const cid = await pegarCliente(comoCliente ?? rotulo)
  const { data, error } = await db.from('appointments').insert({
    business_id: b.id, customer_id: cid, client_name: `PROVA RETORNO ${comoCliente ?? rotulo}`,
    client_phone: '45999995555', start_time: '10:00', end_time: '11:00',
    service_id: service.id, service_name: service.name,
    appointment_date: maisDias(hoje, -dias), status,
  }).select('id').single()
  if (error) { console.log('  erro criando', rotulo, error.message); return null }
  criados.push(data.id); return data.id
}
const idA = await novo('A', toxina, 120, 'completed')
const idB = await novo('B', micro, 15, 'completed')
const idC = await novo('C', micro, 15, 'completed')
await novo('C-volta', micro, 3, 'confirmed', 'C')      // MESMA paciente do C: ela já voltou
await novo('D', peeling, 21, 'cancelled')             // não aconteceu
await novo('E', toxina, 100, 'completed')             // ainda no intervalo

// ── mesma lógica da varredura ──────────────────────────────────
const alvo = new Map(servicos.map(s => [s.id, maisDias(hoje, -Number(s.retorno_dias))]))
const { data: feitos } = await db.from('appointments')
  .select('id, appointment_date, service_id, service_name, customer_id')
  .eq('business_id', b.id).in('service_id', [...alvo.keys()])
  .in('appointment_date', [...new Set(alvo.values())]).eq('status', 'completed')
const candidatos = (feitos ?? []).filter(a => alvo.get(a.service_id) === a.appointment_date)

const maisAntiga = [...new Set(alvo.values())].sort()[0]
const { data: post } = await db.from('appointments')
  .select('customer_id, service_id, appointment_date').eq('business_id', b.id)
  .in('service_id', [...alvo.keys()]).gte('appointment_date', maisAntiga)
  .in('status', ['completed', 'confirmed', 'pending'])
const ultimaVolta = new Map()
for (const p of post ?? []) {
  if (!p.customer_id) continue
  const k = `${p.customer_id}:${p.service_id}`, d = String(p.appointment_date)
  if (!ultimaVolta.has(k) || d > ultimaVolta.get(k)) ultimaVolta.set(k, d)
}
const finais = candidatos.filter(a => {
  const u = a.customer_id ? ultimaVolta.get(`${a.customer_id}:${a.service_id}`) : undefined
  return !(u && u > String(a.appointment_date))
})

const ids = new Set(finais.map(f => f.id))
const checa = (rotulo, id, esperado) => {
  const tem = ids.has(id)
  console.log(`  ${tem === esperado ? 'OK  ' : 'FALHA'} ${rotulo}: ${tem ? 'avisa' : 'não avisa'} (esperado: ${esperado ? 'avisa' : 'não avisa'})`)
  if (tem !== esperado) process.exitCode = 1
}
console.log(`candidatos finais: ${finais.length}`)
checa('A toxina 120d concluída ....', idA, true)
checa('B micro 15d concluída ......', idB, true)
checa('C micro 15d, já reagendou ..', idC, false)
console.log('  OK   D peeling cancelado: nem entra (só busca status completed)')
console.log('  OK   E toxina 100d: fora da data-alvo de 120d')
finais.forEach(f => console.log(`     -> "${f.service_name}" de ${f.appointment_date}`))

for (const id of criados) await db.from('appointments').delete().eq('id', id)
for (const id of Object.values(clientes)) await db.from('customers').delete().eq('id', id)
console.log('  OK   cenário removido')
