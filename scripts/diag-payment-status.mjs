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
const RESEND_KEY = env.RESEND_API_KEY
const BASE = 'https://api.asaas.com/v3'

async function asaas(path) {
  const r = await fetch(`${BASE}${path}`, { headers: { access_token: KEY, accept: 'application/json' } })
  return await r.json().catch(() => ({}))
}

const paymentId = 'pay_eoh1viad86vvbllf'
console.log(`=== Asaas payment ${paymentId} ===`)
const p = await asaas(`/payments/${paymentId}`)
console.log('status:', p.status)
console.log('paymentDate:', p.paymentDate)
console.log('confirmedDate:', p.confirmedDate)
console.log('value:', p.value)

console.log(`\n=== Resend logs ultimos 10 emails ===`)
const r = await fetch('https://api.resend.com/emails?limit=10', {
  headers: { Authorization: `Bearer ${RESEND_KEY}` }
})
const emails = await r.json().catch(() => ({}))
if (emails.data) {
  for (const e of emails.data.slice(0, 10)) {
    console.log(`[${e.created_at}] to=${e.to[0]} subject="${e.subject}" status=${e.last_event}`)
  }
} else {
  console.log('Resend API:', JSON.stringify(emails, null, 2))
}
