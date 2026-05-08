import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envContent = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
}

const KEY = env.ASAAS_API_KEY
if (!KEY) { console.error('SEM ASAAS_API_KEY'); process.exit(1) }

const BASE = KEY.startsWith('$aact_hmlg_') ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3'
console.log('BASE:', BASE)

const CUSTOMER = 'cus_000175083139'
const SUBSCRIPTION = 'sub_xb4ms75uh0g997dr'

async function get(path) {
  const r = await fetch(`${BASE}${path}`, { headers: { access_token: KEY, accept: 'application/json' } })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}

console.log('\n=== CUSTOMER ===')
const c = await get(`/customers/${CUSTOMER}`)
console.log('status:', c.status)
console.log('name:', c.body.name)
console.log('cpfCnpj:', c.body.cpfCnpj)
console.log('email:', c.body.email)
console.log('externalReference:', c.body.externalReference)

console.log('\n=== SUBSCRIPTION ===')
const s = await get(`/subscriptions/${SUBSCRIPTION}`)
console.log('status:', s.status)
console.log('billingType:', s.body.billingType)
console.log('value:', s.body.value)
console.log('status sub:', s.body.status)
console.log('creditCard:', JSON.stringify(s.body.creditCard, null, 2))

console.log('\n=== PAYMENTS DA SUBSCRIPTION ===')
const p = await get(`/subscriptions/${SUBSCRIPTION}/payments`)
console.log('status:', p.status)
console.log('totalCount:', p.body.totalCount)
for (const pay of p.body.data ?? []) {
  console.log('---')
  console.log('id:', pay.id)
  console.log('status:', pay.status)
  console.log('value:', pay.value)
  console.log('billingType:', pay.billingType)
  console.log('invoiceUrl:', pay.invoiceUrl)
  console.log('confirmedDate:', pay.confirmedDate)
  console.log('lastBankSlipViewedDate:', pay.lastBankSlipViewedDate)
  console.log('creditCard:', JSON.stringify(pay.creditCard, null, 2))
  console.log('refusalReason:', pay.refusalReason)
  console.log('description:', pay.description)
  // Tenta puxar histórico de tentativas
  console.log('--- HISTÓRICO ---')
  const h = await get(`/payments/${pay.id}/creditCard/tokenize`)
  console.log('  tokenize status:', h.status, JSON.stringify(h.body))
}
