// Verifica v84 (pacote com produto) no banco real · prova-na-fonte + cleanup total.
// Uso: node scripts/verify-package-product.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = {}
for (const line of readFileSync(join(__dirname, '..', '.env.local'), 'utf-8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const log = (ok, msg) => console.log(`${ok ? '✅' : '❌'} ${msg}`)
let createdPkg = null
const createdMovements = []

try {
  // 1. Acha um produto ativo (define o business do teste) + um serviço do mesmo business
  const { data: prod } = await sb.from('products')
    .select('id, name, quantity, business_id').eq('active', true).gt('quantity', 0).limit(1).maybeSingle()
  if (!prod) throw new Error('nenhum produto ativo com estoque > 0 pra testar')
  const { data: svc } = await sb.from('services')
    .select('id, name').eq('business_id', prod.business_id).eq('active', true).limit(1).maybeSingle()
  if (!svc) throw new Error('nenhum serviço ativo no business do produto')
  console.log(`\nBusiness ${prod.business_id} · produto "${prod.name}" (qtd ${prod.quantity}) · serviço "${svc.name}"\n`)
  const qtyBefore = Number(prod.quantity)

  // 2. Cria pacote de teste + itens (1 serviço + 1 produto qtd 2)
  const { data: pkg, error: pkgErr } = await sb.from('packages').insert({
    business_id: prod.business_id, name: 'ZZ_TEST_v84_combo', price: 50, validity_kind: 'none', active: true,
  }).select('id').single()
  if (pkgErr) throw new Error(`criar pacote: ${pkgErr.message}`)
  createdPkg = pkg.id

  const { error: itErr } = await sb.from('package_items').insert([
    { package_id: pkg.id, service_id: svc.id, product_id: null, quantity: 1, unit_price: null },
    { package_id: pkg.id, service_id: null, product_id: prod.id, quantity: 2, unit_price: null },
  ])
  log(!itErr, `package_items aceita serviço + produto (XOR ok)${itErr ? ' · ' + itErr.message : ''}`)
  if (itErr) throw new Error('insert items falhou')

  // 3. CHECK rejeita item com OS DOIS preenchidos
  const { error: badErr } = await sb.from('package_items').insert(
    { package_id: pkg.id, service_id: svc.id, product_id: prod.id, quantity: 1, unit_price: null })
  log(!!badErr, `CHECK rejeita item com serviço E produto juntos${badErr ? '' : ' · NÃO REJEITOU (constraint faltando!)'}`)

  // 4. CHECK rejeita item VAZIO (nenhum dos dois)
  const { error: emptyErr } = await sb.from('package_items').insert(
    { package_id: pkg.id, service_id: null, product_id: null, quantity: 1, unit_price: null })
  log(!!emptyErr, `CHECK rejeita item sem serviço nem produto`)

  // 5. Simula a entrega do produto na venda → stock_movement exit (igual sell/route.ts)
  const { data: mv, error: mvErr } = await sb.from('stock_movements').insert({
    business_id: prod.business_id, product_id: prod.id, type: 'exit', quantity: -2,
    reason: 'Pacote: ZZ_TEST_v84_combo',
  }).select('id').single()
  if (mvErr) throw new Error(`stock_movement: ${mvErr.message}`)
  createdMovements.push(mv.id)

  // 6. Read-after-write · estoque baixou exatamente 2 (trigger v63)
  const { data: prodAfter } = await sb.from('products').select('quantity').eq('id', prod.id).single()
  const qtyAfter = Number(prodAfter.quantity)
  log(qtyAfter === qtyBefore - 2, `estoque baixou de ${qtyBefore} → ${qtyAfter} (esperado ${qtyBefore - 2})`)

  console.log('\nTodos os checks rodaram. Limpando...\n')
} catch (e) {
  console.log(`\n❌ ERRO: ${e.message}\n`)
} finally {
  // Cleanup · compensa estoque (entry inverso) e apaga TUDO que o teste criou
  for (const id of createdMovements) {
    const { data: m } = await sb.from('stock_movements').select('business_id, product_id, quantity').eq('id', id).maybeSingle()
    if (m) {
      const { data: c } = await sb.from('stock_movements').insert({
        business_id: m.business_id, product_id: m.product_id, type: 'entry', quantity: -Number(m.quantity),
        reason: 'ZZ_TEST_v84 cleanup (compensação)',
      }).select('id').single()
      await sb.from('stock_movements').delete().eq('id', id)
      if (c) await sb.from('stock_movements').delete().eq('id', c.id)
    }
  }
  if (createdPkg) {
    await sb.from('package_items').delete().eq('package_id', createdPkg)
    await sb.from('packages').delete().eq('id', createdPkg)
  }
  // Confirma cleanup: pacote sumiu
  if (createdPkg) {
    const { data: gone } = await sb.from('packages').select('id').eq('id', createdPkg).maybeSingle()
    log(!gone, `cleanup · pacote de teste removido`)
  }
  console.log('')
}
