/* Quanto a feature de avisos fatura, negocio por negocio, usando o MESMO
   calculo da tela (src/lib/mensagens/pacotes.ts) e o movimento real de 90
   dias lido do banco. Cenario: regua padrao ligada (confirmacao + vespera),
   que e o que a tela recomenda de entrada.

   node scripts/_projecao-pacotes.mts */
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { pacoteRecomendado, custoNoPacote } from '../src/lib/mensagens/pacotes.ts'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  if (!l || l.startsWith('#') || !l.includes('=')) continue
  const i = l.indexOf('=')
  const k = l.slice(0, i).trim()
  if (!process.env[k]) process.env[k] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '')
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const de = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10)
const { data: bs } = await db.from('businesses').select('id, name').order('name')
const { data: subs } = await db.from('subscriptions').select('business_id, status')
const smap = new Map((subs ?? []).map((s) => [s.business_id, s.status]))

const MSGS_POR_ATENDIMENTO = 2 // confirmacao + lembrete da vespera

const linhas: { nome: string; status: string; mes: number; unid: number; pacote: string; custo: number }[] = []
for (const b of bs ?? []) {
  const { count } = await db
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', b.id)
    .gte('appointment_date', de)
  const mes = Math.round((count ?? 0) / 3)
  const unid = mes * MSGS_POR_ATENDIMENTO
  const p = pacoteRecomendado(unid)
  linhas.push({
    nome: b.name ?? '?',
    status: smap.get(b.id) ?? 'SEM',
    mes,
    unid,
    pacote: p.nome,
    custo: custoNoPacote(p, unid),
  })
}

linhas.sort((a, b) => b.custo - a.custo || b.unid - a.unid)
const reais = (n: number) => 'R$ ' + n.toFixed(2).replace('.', ',')

console.log('Cenario: confirmacao + lembrete da vespera ligados. Movimento real, 90 dias.\n')
console.log('NEGOCIO'.padEnd(30), 'ASSINATURA'.padEnd(16), 'ATEND/MES'.padStart(9), 'MSGS'.padStart(6), 'PACOTE'.padEnd(12), 'MES')
for (const l of linhas) {
  console.log(
    l.nome.slice(0, 29).padEnd(30),
    l.status.padEnd(16),
    String(l.mes).padStart(9),
    String(l.unid).padStart(6),
    l.pacote.padEnd(12),
    reais(l.custo),
  )
}

const ativos = linhas.filter((l) => l.status === 'active')
const comMovimento = ativos.filter((l) => l.mes > 0)
console.log('\n── SE TODO MUNDO CONTRATASSE ──')
console.log('ativos com movimento:      ', comMovimento.length, 'negocios  →', reais(comMovimento.reduce((s, l) => s + l.custo, 0)) + '/mes')
console.log('ativos sem movimento:      ', ativos.length - comMovimento.length, 'negocios (cairiam no menor pacote)')
console.log('todos os ativos:           ', ativos.length, 'negocios  →', reais(ativos.reduce((s, l) => s + l.custo, 0)) + '/mes')
