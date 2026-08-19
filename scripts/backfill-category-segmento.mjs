/**
 * Backfill de `businesses.category` (19/08/2026).
 *
 * Até agora o painel decidia o nicho lendo `description` — campo que o dono
 * edita à vontade. Quem reescreveu a descrição caía no exemplo de salão.
 * Aqui preenchemos a coluna própria a partir do que JÁ é inequívoco:
 * descrição que é literalmente uma categoria, ou texto que nomeia o serviço.
 *
 * Quem não casar fica NULL de propósito — sem nicho, o painel usa exemplos
 * neutros (Atendimento, Avaliação, Sessão), que não constrangem ninguém.
 * O dono escolhe o segmento em Configurações → Negócio quando quiser.
 *
 * Rodar sem --gravar mostra o plano. Nada é escrito sem a flag.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf-8').split('\n').filter((l) => l.trim() && !l.startsWith('#') && l.includes('=')).map((l) => { const i = l.indexOf('='); let v = l.slice(i + 1).trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); return [l.slice(0, i).trim(), v] }))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const GRAVAR = process.argv.includes('--gravar')

// Casos ditados pelo Eduardo (fatos do negócio, não palpite do texto)
const POR_NOME = {
  'CAF - Centro Avançado de Fisioterapia': 'Fisioterapia',
}

// Descrição que É a categoria (o cadastro antigo gravava assim)
const EXATO = {
  'Barbearia': 'Barbearia',
  'Salão de beleza': 'Salão de beleza',
  'Clínica estética': 'Clínica estética',
  'Nail designer': 'Nail designer',
  'Nails designer': 'Nail designer',
  'Manicure': 'Manicure',
}

// Descrição livre que nomeia o próprio serviço — casa por palavra-chave
const POR_PALAVRA = [
  { re: /c[íi]lios|sobrancelha/i, cat: 'Cílios e sobrancelhas' },
  { re: /unhas?|nail/i, cat: 'Nail designer' },
  { re: /sal[ãa]o de beleza/i, cat: 'Salão de beleza' },
]

const { data: bizs } = await db.from('businesses').select('id,name,description,category').order('name')
const plano = []
for (const b of bizs) {
  if (b.category) { plano.push({ nome: b.name, de: b.category, para: b.category, motivo: 'já tinha segmento — não mexo' }); continue }
  const desc = (b.description ?? '').trim()
  let cat = POR_NOME[b.name] ?? EXATO[desc] ?? null
  let motivo = POR_NOME[b.name] ? 'ditado pelo Eduardo' : EXATO[desc] ? `descrição é a categoria ("${desc}")` : null
  if (!cat && desc) {
    const hit = POR_PALAVRA.find((p) => p.re.test(desc))
    if (hit) { cat = hit.cat; motivo = `descrição diz "${desc.slice(0, 40)}"` }
  }
  plano.push({ id: b.id, nome: b.name, de: null, para: cat, motivo: motivo ?? 'sem pista clara → fica neutro' })
}

for (const p of plano) console.log(`${p.para ? '✔' : '·'} ${p.nome.padEnd(42)} ${String(p.para ?? '(neutro)').padEnd(24)} ${p.motivo}`)
const vaiGravar = plano.filter((p) => p.id && p.para)
console.log(`\n${vaiGravar.length} negócios recebem segmento · ${plano.filter((p) => p.id && !p.para).length} ficam neutros · ${plano.filter((p) => !p.id).length} já tinham`)

if (!GRAVAR) { console.log('\n(simulação — rode com --gravar pra aplicar)'); process.exit(0) }

for (const p of vaiGravar) {
  const { error } = await db.from('businesses').update({ category: p.para }).eq('id', p.id)
  if (error) console.log('ERRO', p.nome, error.message)
}

// Prova na fonte: relê tudo
const { data: depois } = await db.from('businesses').select('name,category').order('name')
const comSeg = depois.filter((b) => b.category)
console.log(`\nDEPOIS (lido do banco): ${comSeg.length}/${depois.length} com segmento`)
for (const b of depois.filter((x) => !x.category)) console.log('   neutro:', b.name)
