// Tentar refund manual do payment da Erlane pra entender por que cancel-asaas
// silenciou. Reproduz o mesmo body que a API enviaria.
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
const BASE = KEY.startsWith('$aact_hmlg_')
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3'

const PAYMENT_ID = process.argv[2] || 'pay_1h5nqut7t6cr2ppy'

console.log(`POST ${BASE}/payments/${PAYMENT_ID}/refund`)

const res = await fetch(`${BASE}/payments/${PAYMENT_ID}/refund`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    access_token: KEY,
  },
  body: JSON.stringify({
    description: 'Cancelamento dentro do prazo de 7 dias (CDC art. 49)',
  }),
})

const body = await res.json().catch(() => ({}))
console.log(`HTTP ${res.status}`)
console.log(JSON.stringify(body, null, 2))
