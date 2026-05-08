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
const BASE = KEY.startsWith('$aact_hmlg_') ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3'

async function get(path) {
  const r = await fetch(`${BASE}${path}`, { headers: { access_token: KEY, accept: 'application/json' } })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}

console.log('\n=== PAYMENT pay_1h5nqut7t6cr2ppy ===')
const p = await get('/payments/pay_1h5nqut7t6cr2ppy')
console.log('status:', p.status)
console.log('payment.status:', p.body.status)
console.log('payment.value:', p.body.value)
console.log('payment.paymentDate:', p.body.paymentDate)
console.log('payment.clientPaymentDate:', p.body.clientPaymentDate)
console.log('payment.confirmedDate:', p.body.confirmedDate)
console.log('payment.billingType:', p.body.billingType)
console.log('payment.refunds:', p.body.refunds)

console.log('\n=== CUSTOMER cus_000175101038 ===')
const c = await get('/customers/cus_000175101038')
console.log('name:', c.body.name)
console.log('notificationDisabled:', c.body.notificationDisabled)
