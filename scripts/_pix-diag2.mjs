/* Estado COMPLETO da cobranca de avisos: pagamento, dono do pagamento e
   conta Asaas. node scripts/_pix-diag2.mjs */
import fs from 'node:fs'
for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  if (!l || l.startsWith('#') || !l.includes('=')) continue
  const i = l.indexOf('='); const k = l.slice(0, i).trim()
  if (!process.env[k]) process.env[k] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '')
}
const key = process.env.ASAAS_API_KEY
const B = 'https://api.asaas.com/v3'
const get = async (p) => {
  const r = await fetch(B + p, { headers: { access_token: key } })
  const t = await r.text()
  try { return { st: r.status, ok: r.ok, d: JSON.parse(t) } } catch { return { st: r.status, ok: r.ok, raw: t } }
}

const BUSINESS = 'cd3c7f5a-e657-4ddb-96c7-0a4ff45b63eb'

console.log('═══ PAGAMENTOS DE AVISOS ═══')
const lp = await get('/payments?limit=30')
const alvos = (lp.d?.data ?? []).filter(
  (p) => typeof p.externalReference === 'string' && p.externalReference.includes(BUSINESS),
)
for (const p of alvos) {
  console.log(`\nid ${p.id}`)
  console.log('  status      ', p.status, '| deleted:', p.deleted)
  console.log('  criado      ', p.dateCreated, '| vence:', p.dueDate)
  console.log('  customer    ', p.customer)
  console.log('  canBePaid?  ', p.canBePaidAfterDueDate, '| billingType:', p.billingType)

  const c = await get(`/customers/${p.customer}`)
  console.log('  DONO        ', c.ok ? `${c.d?.name} | deleted: ${c.d?.deleted} | cpf: ${c.d?.cpfCnpj}` : `ERRO ${c.st}`)

  const qr = await get(`/payments/${p.id}/pixQrCode`)
  console.log('  QR          ', qr.ok ? `success=${qr.d?.success} expira=${qr.d?.expirationDate}` : `ERRO ${qr.st} ${JSON.stringify(qr.d ?? qr.raw).slice(0,160)}`)
}

console.log('\n═══ CONTA / CHAVES PIX ═══')
const chaves = await get('/pix/addressKeys')
if (chaves.ok) {
  const l = chaves.d?.data ?? []
  console.log('chaves PIX cadastradas:', l.length)
  for (const k of l) console.log('  ', k.key, '| tipo:', k.type, '| status:', k.status)
} else {
  console.log('ERRO ao listar chaves:', chaves.st, JSON.stringify(chaves.d ?? chaves.raw).slice(0, 300))
}

const conta = await get('/myAccount/status')
console.log('\nstatus da conta:', conta.ok ? JSON.stringify(conta.d) : `ERRO ${conta.st} ${JSON.stringify(conta.d ?? conta.raw).slice(0,300)}`)
