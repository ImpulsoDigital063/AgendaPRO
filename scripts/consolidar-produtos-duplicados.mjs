/**
 * Consolida produtos duplicados (mesmo nome normalizado).
 *
 * DRY-RUN por padrão: imprime o plano e NÃO escreve nada.
 * Só escreve com --apply.
 *
 * O que faz por grupo:
 *   1. Escolhe a linha sobrevivente (a que está amarrada a combo manda;
 *      depois quem tem mais referências; depois quem já controla estoque)
 *   2. Move o estoque das perdedoras pra sobrevivente via stock_movements
 *      ('adjust'), preservando o extrato — nunca UPDATE direto na quantidade
 *   3. Liga track_stock na sobrevivente
 *   4. Desativa as perdedoras (active=false) — NUNCA apaga, porque venda,
 *      comanda e combo antigos apontam pra elas
 *
 * Grupos com preço divergente são PULADOS (precisam de decisão da dona),
 * a não ser que venham em --resolver=<nomeNormalizado>:<id_que_fica>
 *
 * Uso:
 *   node --env-file=.env.local scripts/consolidar-produtos-duplicados.mjs --biz=<uuid>
 *   node --env-file=.env.local scripts/consolidar-produtos-duplicados.mjs --biz=<uuid> --apply
 */
import { createClient } from '@supabase/supabase-js'

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? null
const BIZ = arg('biz')
const APPLY = process.argv.includes('--apply')
const RESOLVIDOS = Object.fromEntries(
  process.argv.filter((a) => a.startsWith('--resolver=')).map((a) => a.replace('--resolver=', '').split(':')),
)
if (!BIZ) {
  console.error('falta --biz=<uuid>')
  process.exit(1)
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const norm = (s) => s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/g, '')
const brl = (n) => `R$${Number(n ?? 0).toFixed(2).replace('.', ',')}`

const { data: products, error } = await db
  .from('products')
  .select('id, name, price, quantity, track_stock, active, sale_active, variant, variant_group_id')
  .eq('business_id', BIZ)
  .eq('active', true)
if (error) {
  console.error('ERR', error.message)
  process.exit(1)
}

const chunks = (a, n = 100) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))
const refs = {}
const bump = (id, k) => { refs[id] ??= { sale: 0, invoice: 0, combo: 0, movement: 0 }; refs[id][k]++ }
for (const part of chunks(products.map((p) => p.id))) {
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
const totalRefs = (id) => { const r = refs[id]; return r ? r.sale + r.invoice + r.combo + r.movement : 0 }

const groups = {}
for (const p of products) (groups[norm(p.name)] ??= []).push(p)

console.log(APPLY ? '### APLICANDO (escreve no banco)\n' : '### DRY-RUN (nenhuma escrita)\n')

let fundidos = 0, pulados = 0, movidos = 0

for (const [key, linhas] of Object.entries(groups).filter(([, v]) => v.length > 1)) {
  // VARIANTE NÃO É DUPLICATA. Na v88 as cores/tamanhos do mesmo produto-base
  // compartilham `name` DE PROPÓSITO — o rótulo mora em `variant`. Agrupar por
  // nome varre as cores pra debaixo do tapete: já desativei 14 cores reais de
  // um cliente assim (Studio Mood, 08/08) antes de perceber.
  const temVariante = linhas.some((p) => p.variant_group_id || (p.variant ?? '').trim())
  if (temVariante) {
    const cores = linhas.map((p) => p.variant || '(sem rótulo)').join(' · ')
    console.log(`PULADO  ${linhas[0].name} — são VARIANTES, não duplicatas: ${cores}`)
    pulados++
    continue
  }

  const precos = [...new Set(linhas.map((p) => Number(p.price ?? 0)))]
  const escolhidoManual = RESOLVIDOS[key]

  if (precos.length > 1 && !escolhidoManual) {
    console.log(`PULADO  ${linhas[0].name} — preços divergentes (${precos.map(brl).join(' × ')}), precisa decisão`)
    pulados++
    continue
  }

  const score = (p) =>
    (refs[p.id]?.combo ?? 0) * 1000 + totalRefs(p.id) * 10 + (p.track_stock ? 2 : 0) + (Number(p.quantity) > 0 ? 1 : 0)
  const fica = escolhidoManual
    ? linhas.find((p) => p.id === escolhidoManual)
    : [...linhas].sort((a, b) => score(b) - score(a))[0]
  if (!fica) { console.log(`PULADO  ${linhas[0].name} — id de --resolver não bate`); pulados++; continue }

  const perdedoras = linhas.filter((p) => p.id !== fica.id)
  const aMover = perdedoras.reduce((s, p) => s + Number(p.quantity ?? 0), 0)

  console.log(`FUNDE   "${fica.name}" ${brl(fica.price)} · fica com ${Number(fica.quantity) + aMover} un · desativa ${perdedoras.length} linha(s)`)

  if (APPLY) {
    for (const p of perdedoras) {
      const q = Number(p.quantity ?? 0)
      if (q !== 0) {
        // extrato: sai da perdedora, entra na sobrevivente
        await db.from('stock_movements').insert([
          { business_id: BIZ, product_id: p.id, type: 'adjust', quantity: -q, reason: 'Consolidação de produto duplicado' },
          { business_id: BIZ, product_id: fica.id, type: 'adjust', quantity: q, reason: `Consolidação · veio de "${p.name}"` },
        ])
        movidos += q
      }
      await db.from('products').update({ active: false, sale_active: false }).eq('id', p.id)
    }
    // Só liga o controle se JÁ existe saldo. Ligar com estoque 0 faz as rotas de
    // comanda barrarem com insufficient_stock — o produto que antes lançava
    // normal passaria a recusar, travando o balcão até alguém contar o estoque.
    const saldoFinal = Number(fica.quantity ?? 0) + aMover
    if (saldoFinal > 0) {
      await db.from('products').update({ track_stock: true }).eq('id', fica.id)
    } else {
      console.log(`        (controle NÃO ligado — saldo 0; ligar agora travaria o lançamento na comanda)`)
    }
  }
  fundidos++
}

console.log(`\ngrupos fundidos: ${fundidos} · pulados (decisão pendente): ${pulados}${APPLY ? ` · unidades movidas: ${movidos}` : ''}`)
if (!APPLY) console.log('\nnada foi escrito. rode de novo com --apply pra valer.')
