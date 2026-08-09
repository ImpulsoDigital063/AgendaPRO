/**
 * Auditoria READ-ONLY de produtos duplicados (mesmo nome normalizado).
 *
 * Não escreve NADA. Para cada grupo duplicado mostra:
 *   - as linhas, com estoque / controle / preço / venda ativa
 *   - quantas referências cada linha tem (venda, comanda, combo, movimento)
 *   - a linha proposta como sobrevivente e por quê
 *
 * Uso: node --env-file=.env.local scripts/audit-produtos-duplicados.mjs --biz=<uuid>
 */
import { createClient } from '@supabase/supabase-js'

const bizArg = process.argv.find((a) => a.startsWith('--biz='))
const BIZ = bizArg ? bizArg.split('=')[1] : null
if (!BIZ) {
  console.error('falta --biz=<uuid>')
  process.exit(1)
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const norm = (s) =>
  s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/g, '')

const brl = (n) => `R$${Number(n ?? 0).toFixed(2).replace('.', ',')}`

const { data: products, error } = await db
  .from('products')
  .select('id, name, price, quantity, track_stock, active, sale_active, created_at')
  .eq('business_id', BIZ)
if (error) {
  console.error('ERR', error.message)
  process.exit(1)
}

// Referências: quem aponta pra cada product_id
const ids = products.map((p) => p.id)
const refs = {}
const bump = (id, k) => {
  refs[id] ??= { sale: 0, invoice: 0, combo: 0, movement: 0 }
  refs[id][k]++
}
const chunks = (arr, n = 100) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n))

for (const part of chunks(ids)) {
  const [si, ii, pi, sm] = await Promise.all([
    db.from('sale_items').select('product_id').in('product_id', part),
    db.from('invoice_items').select('product_id').in('product_id', part),
    db.from('package_items').select('product_id').in('product_id', part),
    db.from('stock_movements').select('product_id').in('product_id', part),
  ])
  for (const r of si.data ?? []) bump(r.product_id, 'sale')
  for (const r of ii.data ?? []) bump(r.product_id, 'invoice')
  for (const r of pi.data ?? []) bump(r.product_id, 'combo')
  for (const r of sm.data ?? []) bump(r.product_id, 'movement')
}

const totalRefs = (id) => {
  const r = refs[id]
  return r ? r.sale + r.invoice + r.combo + r.movement : 0
}

const groups = {}
for (const p of products) (groups[norm(p.name)] ??= []).push(p)
const dups = Object.entries(groups).filter(([, v]) => v.length > 1)

console.log(`negócio ${BIZ}`)
console.log(`produtos: ${products.length} · grupos duplicados: ${dups.length} · linhas envolvidas: ${dups.reduce((s, [, v]) => s + v.length, 0)}\n`)

let precisaDecisao = 0

for (const [key, linhas] of dups) {
  console.log(`### ${linhas[0].name}  (${linhas.length} linhas)`)

  // Sobrevivente: quem está amarrado a combo manda (apagar quebraria o combo);
  // depois quem tem mais referências; depois quem controla estoque.
  const score = (p) =>
    (refs[p.id]?.combo ?? 0) * 1000 + totalRefs(p.id) * 10 + (p.track_stock ? 2 : 0) + (Number(p.quantity) > 0 ? 1 : 0)
  const ordenadas = [...linhas].sort((a, b) => score(b) - score(a))
  const fica = ordenadas[0]

  for (const p of ordenadas) {
    const r = refs[p.id] ?? { sale: 0, invoice: 0, combo: 0, movement: 0 }
    const marca = p.id === fica.id ? 'FICA  ' : 'funde '
    console.log(
      `  ${marca} "${p.name}" | ${brl(p.price)} | est ${p.quantity} | controle ${p.track_stock ? 'ON' : 'off'} | venda ${p.sale_active ? 'on' : 'off'} | ` +
        `refs: combo ${r.combo}, venda ${r.sale}, comanda ${r.invoice}, movto ${r.movement}`,
    )
  }

  const somaEstoque = linhas.reduce((s, p) => s + Number(p.quantity ?? 0), 0)
  const precos = [...new Set(linhas.map((p) => Number(p.price ?? 0)))]
  if (precos.length > 1) {
    precisaDecisao++
    console.log(`  ⚠ preços divergentes: ${precos.map(brl).join(' × ')} — precisa a dona decidir`)
  }
  console.log(`  → proposta: manter "${fica.name}", estoque consolidado ${somaEstoque}, controle ON, desativar as outras (active=false, sem apagar)\n`)
}

console.log(`grupos que precisam de decisão de preço: ${precisaDecisao}`)

// Materiais usados em combo que não contam estoque = combo não baixa nada
const { data: comboItems } = await db
  .from('package_items')
  .select('product_id, quantity, packages!inner(name, kind, business_id)')
  .eq('packages.business_id', BIZ)
  .not('product_id', 'is', null)

console.log(`\n### materiais dentro de combo`)
for (const it of comboItems ?? []) {
  const p = products.find((x) => x.id === it.product_id)
  if (!p) continue
  const alerta = p.track_stock ? '' : '  ⚠ SEM controle de estoque — o combo não vai baixar nada'
  console.log(`  ${it.packages.name}: ${it.quantity}× "${p.name}" (est ${p.quantity})${alerta}`)
}
