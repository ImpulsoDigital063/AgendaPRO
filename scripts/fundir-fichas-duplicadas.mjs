/* Funde fichas duplicadas do MESMO telefone dentro do mesmo negócio.

   Achado da auditoria 05/08: o casamento de cliente era `.eq('phone')` exato,
   e o telefone entra em formatos diferentes conforme a porta — o link grava
   "(63) 99246-8302", o fluxo de avaliação grava "63992468302". Mesma pessoa,
   duas fichas. 11 pares no Olímpio, todos [nome real com agendamentos] ×
   ["Cliente (avaliação)" só com a avaliação e os pontos dela].

   O buraco em si já está fechado (src/lib/phone-variants.ts). Isto aqui limpa
   o que ficou pra trás: 470 pontos de avaliação presos em fichas que a cliente
   nunca vê, porque quando ela agenda o sistema abre a OUTRA ficha.

   REGRA DE QUEM FICA: vence a ficha com mais histórico real (agendamentos,
   comandas, vendas, pacotes); empate desempata por nome de gente — uma ficha
   chamada "Cliente (avaliação)" nunca vence de uma com nome próprio. Some os
   pontos, move todas as referências e apaga a perdedora.

   Dado de cliente pagante: grava backup em JSON antes de qualquer escrita.
   Sem --apply é ensaio.  λ.backup-real
*/
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf-8')
for (const l of env.split(/\r?\n/)) {
  if (!l || l.startsWith('#') || !l.includes('=')) continue
  const [k, ...r] = l.split('=')
  if (!process.env[k]) process.env[k] = r.join('=').replace(/^"(.*)"$/, '$1')
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const APPLY = process.argv.includes('--apply')

// Tudo que aponta pra customers.id. Se entrar tabela nova com customer_id,
// ela precisa entrar aqui — senão a fusão deixa linha órfã apontando pro nada.
const REFERENCIAS = [
  'appointments',
  'points_transactions',
  'customer_credits',
  'invoices',
  'review_claims',
  'customer_packages',
  'sales',
]

async function all(table, sel) {
  let out = [], from = 0
  for (;;) {
    const { data, error } = await db.from(table).select(sel).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out = out.concat(data || [])
    if ((data || []).length < 1000) break
    from += 1000
  }
  return out
}

const customers = await all('customers', '*')
const negocios = await all('businesses', 'id, name')
const nomeNegocio = Object.fromEntries(negocios.map((b) => [b.id, b.name]))

/* Número canônico: sem DDI e com o 9 do celular garantido. Sem isso a segunda
   camada do problema passa batido — "(63) 9274-3602" e "(63) 99274-3602" são o
   MESMO Olavo, com 90 e 50 pontos em fichas separadas. Quem digita o número de
   cabeça esquece o 9 e o sistema abria ficha nova.
   Fixo (começa em 2-5) não ganha 9. */
function canonico(raw) {
  let d = (raw || '').replace(/\D/g, '')
  if ((d.length === 13 || d.length === 12) && d.startsWith('55')) d = d.slice(2)
  if (d.length === 10 && /^[6-9]/.test(d.slice(2))) d = d.slice(0, 2) + '9' + d.slice(2)
  return d
}

const grupos = {}
for (const c of customers) {
  const digitos = canonico(c.phone)
  if (digitos.length < 10) continue
  const k = `${c.business_id}|${digitos}`
  ;(grupos[k] = grupos[k] || []).push(c)
}
const pares = Object.entries(grupos).filter(([, v]) => v.length > 1)

// Conta referências de cada ficha, uma leitura por tabela.
const refs = {}
for (const t of REFERENCIAS) refs[t] = await all(t, 'id, customer_id')
const quantas = (t, id) => refs[t].filter((r) => r.customer_id === id).length
const pesoHistorico = (id) =>
  quantas('appointments', id) + quantas('invoices', id) + quantas('sales', id) + quantas('customer_packages', id)
const pareceNomeDeGente = (n) => !/^cliente\b|avalia|^sem nome|^teste/i.test((n || '').trim())

const plano = []
for (const [k, fichas] of pares) {
  const ordenadas = [...fichas].sort((a, b) => {
    const ph = pesoHistorico(b.id) - pesoHistorico(a.id)
    if (ph !== 0) return ph
    const nome = Number(pareceNomeDeGente(b.name)) - Number(pareceNomeDeGente(a.name))
    if (nome !== 0) return nome
    return new Date(a.created_at) - new Date(b.created_at) // mais antiga vence
  })
  const fica = ordenadas[0]
  const somem = ordenadas.slice(1)
  plano.push({ negocio: nomeNegocio[fica.business_id], telefone: k.split('|')[1], fica, somem })
}

console.log(`fichas: ${customers.length} · pares duplicados: ${plano.length}\n`)
let pontosMovidos = 0, refsMovidas = 0
for (const p of plano) {
  const extras = p.somem.reduce((s, c) => s + Number(c.total_points || 0), 0)
  pontosMovidos += extras
  const movas = p.somem.flatMap((c) => REFERENCIAS.map((t) => ({ t, n: quantas(t, c.id) }))).filter((x) => x.n > 0)
  refsMovidas += movas.reduce((s, x) => s + x.n, 0)
  console.log(`· ${p.negocio} · ${p.telefone}`)
  console.log(`   FICA   ${p.fica.name} [${p.fica.phone}] ${p.fica.total_points} pts`)
  for (const c of p.somem) {
    console.log(`   SOME   ${c.name} [${c.phone}] ${c.total_points} pts · move: ${
      REFERENCIAS.map((t) => `${t}=${quantas(t, c.id)}`).filter((s) => !s.endsWith('=0')).join(' ') || 'nada'
    }`)
  }
  console.log(`   → ficha final com ${Number(p.fica.total_points || 0) + extras} pts`)
}
console.log(`\nresumo: ${plano.length} fusões · ${pontosMovidos} pontos devolvidos · ${refsMovidas} referências movidas`)

if (!APPLY) {
  console.log('\nENSAIO · rode com --apply pra gravar')
  process.exit(0)
}

// Backup antes de escrever — dado de cliente pagante.
const carimbo = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const backup = { quando: carimbo, plano: plano.map((p) => ({ ...p, referencias: {} })) }
for (const p of backup.plano) {
  for (const c of p.somem) {
    for (const t of REFERENCIAS) {
      const linhas = refs[t].filter((r) => r.customer_id === c.id).map((r) => r.id)
      if (linhas.length) (p.referencias[t] = p.referencias[t] || []).push({ de: c.id, ids: linhas })
    }
  }
}
const arq = `backup-fusao-fichas-${carimbo}.json`
fs.writeFileSync(arq, JSON.stringify(backup, null, 2))
console.log(`\nbackup: ${arq}`)

let erros = 0
for (const p of plano) {
  for (const c of p.somem) {
    for (const t of REFERENCIAS) {
      const ids = refs[t].filter((r) => r.customer_id === c.id).map((r) => r.id)
      if (!ids.length) continue
      const { error } = await db.from(t).update({ customer_id: p.fica.id }).in('id', ids)
      if (error) { erros++; console.log(`  ERRO ${t} ${c.name}: ${error.message}`) }
    }
    // Quem foi indicado pela ficha que some passa a apontar pra que fica.
    await db.from('customers').update({ referred_by: p.fica.id }).eq('referred_by', c.id)
  }

  // Soma os pontos e preenche o que faltava na ficha vencedora (email,
  // aniversário) sem sobrescrever o que ela já tinha.
  const extras = p.somem.reduce((s, c) => s + Number(c.total_points || 0), 0)
  const patch = { total_points: Number(p.fica.total_points || 0) + extras }

  /* Se a ficha vencedora está com o celular SEM o 9 (formato antigo), grava o
     número canônico. Não é cosmético: o botão de WhatsApp monta o link com
     esse telefone, e número sem o 9 não entrega mensagem nenhuma hoje. A
     duplicata é a própria prova de que o número com 9 é o certo. */
  const canonFica = canonico(p.fica.phone)
  if (canonFica.length === 11 && (p.fica.phone || '').replace(/\D/g, '').length === 10) {
    patch.phone = `(${canonFica.slice(0, 2)}) ${canonFica.slice(2, 7)}-${canonFica.slice(7)}`
  }
  if (!p.fica.email) { const comEmail = p.somem.find((c) => c.email); if (comEmail) patch.email = comEmail.email }
  if (!p.fica.birthday) { const comAniv = p.somem.find((c) => c.birthday); if (comAniv) patch.birthday = comAniv.birthday }
  /* Apagar ANTES de aplicar o patch. A ficha que some é justamente a que tem o
     telefone canônico; escrever esse número na vencedora com a outra ainda
     viva bate no índice único (business_id, phone) e derruba o patch inteiro —
     inclusive a soma de pontos, que era o objetivo. Aconteceu na primeira
     rodada com Olavo e Mateus. */
  const { error: delErr } = await db.from('customers').delete().in('id', p.somem.map((c) => c.id))
  if (delErr) { erros++; console.log(`  ERRO apagar ${p.fica.name}: ${delErr.message}`) }

  const { error: upErr } = await db.from('customers').update(patch).eq('id', p.fica.id)
  if (upErr) { erros++; console.log(`  ERRO pontos ${p.fica.name}: ${upErr.message}`) }
}

// λ.prova-na-fonte · relê a base e confere que não sobrou par nem órfão.
const depois = await all('customers', 'id, business_id, phone, name, total_points')
const g2 = {}
for (const c of depois) {
  const d = canonico(c.phone)
  if (d.length < 10) continue
  ;(g2[`${c.business_id}|${d}`] = g2[`${c.business_id}|${d}`] || []).push(c)
}
const aindaDuplicados = Object.values(g2).filter((v) => v.length > 1).length
const vivos = new Set(depois.map((c) => c.id))
let orfas = 0
for (const t of REFERENCIAS) {
  const linhas = await all(t, 'id, customer_id')
  orfas += linhas.filter((r) => r.customer_id && !vivos.has(r.customer_id)).length
}
console.log(`\nerros: ${erros}`)
console.log(`pares restantes: ${aindaDuplicados} (esperado 0)`)
console.log(`linhas apontando pra ficha inexistente: ${orfas} (esperado 0)`)
for (const p of plano) {
  const f = depois.find((c) => c.id === p.fica.id)
  console.log(`  ${f ? f.name + ' → ' + f.total_points + ' pts' : 'SUMIU ' + p.fica.name}`)
}
