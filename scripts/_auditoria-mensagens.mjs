/* AUDITORIA: o motor de mensagens funciona em TODOS os negócios?
   Mede, negócio por negócio, o que faria a mensagem não sair ou sair torta.
   Só leitura — não manda nada, não escreve nada. */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); let v = l.slice(i + 1).trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); return [l.slice(0, i).trim(), v] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const hoje = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10)
const d30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

const { data: negocios } = await db.from('businesses').select('id, name, phone, slug')
const { data: assinaturas } = await db.from('subscriptions')
  .select('business_id, status, plan, plan_modalidade, permanent_courtesy, grace_ends_at')
const { data: appts } = await db.from('appointments')
  .select('business_id, client_phone, client_email, client_name, service_name, appointment_date, status, customer_id')
  .gte('appointment_date', d30)
const { data: customers } = await db.from('customers').select('business_id, phone, birthday')

const telOk = (t) => {
  const d = String(t ?? '').replace(/\D/g, '')
  const semDDI = d.startsWith('55') ? d.slice(2) : d
  return semDDI.length === 10 || semDDI.length === 11
}
const ddd = (t) => {
  const d = String(t ?? '').replace(/\D/g, '')
  const semDDI = d.startsWith('55') ? d.slice(2) : d
  return semDDI.slice(0, 2)
}
const temNove = (t) => {
  const d = String(t ?? '').replace(/\D/g, '')
  const semDDI = d.startsWith('55') ? d.slice(2) : d
  return semDDI.length === 11 && semDDI[2] === '9'
}

console.log('═══ AUDITORIA DO MOTOR DE MENSAGENS ═══')
console.log(`base: ${negocios.length} negócios · ${appts.length} agendamentos nos últimos 30 dias\n`)

const linhas = []
for (const n of negocios) {
  const a = assinaturas.find(s => s.business_id === n.id) ?? {}
  const meus = appts.filter(x => x.business_id === n.id)
  const clientes = customers.filter(c => c.business_id === n.id)
  const comTel = meus.filter(x => telOk(x.client_phone))
  const semTel = meus.length - comTel.length
  const semTelComEmail = meus.filter(x => !telOk(x.client_phone) && x.client_email).length
  const aniversarios = clientes.filter(c => c.birthday).length

  const bloqueado = a.status === 'cancelled' ||
    (a.status === 'past_due' && a.grace_ends_at && new Date(a.grace_ends_at) < Date.now())

  linhas.push({
    nome: n.name,
    plano: a.permanent_courtesy ? 'demo' : (a.plan ?? '-'),
    situacao: bloqueado ? 'BLOQUEADO' : (a.status ?? '-'),
    telNegocio: telOk(n.phone) ? 'ok' : (n.phone ? 'INVÁLIDO' : 'FALTA'),
    appts30d: meus.length,
    semTelefone: semTel,
    salvaveisPorEmail: semTelComEmail,
    clientes: clientes.length,
    comAniversario: aniversarios,
  })
}

linhas.sort((a, b) => b.appts30d - a.appts30d)

console.log('NEGÓCIO'.padEnd(32), 'PLANO'.padEnd(7), 'SITUAÇÃO'.padEnd(11), 'TEL'.padEnd(9), 'AGEND', 'S/TEL', 'ANIV')
for (const l of linhas) {
  console.log(
    l.nome.slice(0, 31).padEnd(32),
    String(l.plano).padEnd(7),
    String(l.situacao).padEnd(11),
    l.telNegocio.padEnd(9),
    String(l.appts30d).padStart(5),
    String(l.semTelefone).padStart(5),
    String(l.comAniversario).padStart(4),
  )
}

// ── PROBLEMAS QUE IMPEDEM OU SUJAM O ENVIO ──────────────────────
console.log('\n═══ O QUE QUEBRA ═══')

const semTelNegocio = linhas.filter(l => l.telNegocio !== 'ok' && l.appts30d > 0)
console.log(`\n1. NEGÓCIO SEM TELEFONE VÁLIDO (a cliente não sabe pra onde ligar): ${semTelNegocio.length}`)
for (const l of semTelNegocio) console.log(`   · ${l.nome} — ${l.telNegocio} · ${l.appts30d} agendamentos/30d`)

const totalSemTel = linhas.reduce((s, l) => s + l.semTelefone, 0)
const totalAppts = linhas.reduce((s, l) => s + l.appts30d, 0)
console.log(`\n2. AGENDAMENTO SEM TELEFONE DA CLIENTE: ${totalSemTel} de ${totalAppts} (${Math.round(totalSemTel / (totalAppts || 1) * 100)}%)`)
for (const l of linhas.filter(x => x.semTelefone > 0)) {
  console.log(`   · ${l.nome}: ${l.semTelefone} sem telefone · ${l.salvaveisPorEmail} têm email (caem no fallback)`)
}

const ativosBloqueados = linhas.filter(l => l.situacao === 'BLOQUEADO' && l.appts30d > 0)
console.log(`\n3. NEGÓCIO BLOQUEADO QUE AINDA TEM AGENDAMENTO: ${ativosBloqueados.length}`)
for (const l of ativosBloqueados) console.log(`   · ${l.nome} — ${l.appts30d} agendamentos/30d`)

// ── NONO DÍGITO ─────────────────────────────────────────────────
const porDDD = {}
for (const a of appts) {
  if (!telOk(a.client_phone)) continue
  const d = ddd(a.client_phone)
  porDDD[d] = porDDD[d] ?? { total: 0, com9: 0 }
  porDDD[d].total++
  if (temNove(a.client_phone)) porDDD[d].com9++
}
console.log('\n4. NONO DÍGITO POR DDD (o número da instância registrou SEM o 9):')
for (const [d, v] of Object.entries(porDDD).sort((a, b) => b[1].total - a[1].total)) {
  console.log(`   DDD ${d}: ${v.total} telefones · ${v.com9} com o 9 (${Math.round(v.com9 / v.total * 100)}%)`)
}

// ── CLIENTE EM MAIS DE UM NEGÓCIO ───────────────────────────────
const fonePorNegocio = {}
for (const a of appts) {
  if (!telOk(a.client_phone)) continue
  const f = String(a.client_phone).replace(/\D/g, '').slice(-8)
  fonePorNegocio[f] = fonePorNegocio[f] ?? new Set()
  fonePorNegocio[f].add(a.business_id)
}
const emVarios = Object.entries(fonePorNegocio).filter(([, s]) => s.size > 1)
console.log(`\n5. MESMA CLIENTE EM MAIS DE UM SALÃO: ${emVarios.length} telefone(s)`)
console.log('   (recebem de salões diferentes pelo MESMO número remetente)')

// ── VOLUME ──────────────────────────────────────────────────────
console.log('\n═══ VOLUME SE LIGAR TUDO ═══')
const porDia = totalAppts / 30
console.log(`agendamentos/dia na base: ${porDia.toFixed(1)}`)
console.log(`confirmação + véspera + dia = ${(porDia * 3).toFixed(0)} mensagens/dia`)
const aniversariantesDia = customers.filter(c => c.birthday).length / 365
console.log(`aniversários/dia: ${aniversariantesDia.toFixed(1)}`)
console.log(`PICO por varredura (lote de 20): ${Math.ceil(porDia * 3 / 24)} por hora em média — folga grande`)

console.log('\n═══ POR PLANO ═══')
for (const plano of ['solo', 'equipe', 'demo']) {
  const g = linhas.filter(l => l.plano === plano)
  const ap = g.reduce((s, l) => s + l.appts30d, 0)
  console.log(`${plano.padEnd(7)} ${String(g.length).padStart(2)} negócios · ${String(ap).padStart(4)} agendamentos/30d · ${g.filter(l => l.telNegocio !== 'ok').length} sem telefone`)
}
