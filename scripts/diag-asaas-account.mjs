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

const endpoints = [
  '/myAccount',
  '/myAccount/status',
  '/myAccount/billingInfo',
  '/myAccount/paymentMethods',
  '/finance/balance',
  '/pix/addressKeys',
]

for (const ep of endpoints) {
  const r = await get(ep)
  console.log(`\n=== ${ep} ===`)
  console.log('status:', r.status)
  console.log(JSON.stringify(r.body, null, 2).slice(0, 1500))
}
