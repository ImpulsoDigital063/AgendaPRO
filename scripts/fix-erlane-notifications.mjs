// Disable Asaas notifications no customer ja existente da Erlane.
// Necessario porque o customer foi criado antes do fix em createCustomer
// (notificationDisabled trocado de false pra true em 08/05/2026).
//
// Customer ID: cus_000175083139 (Erlane Vieira dos Santos, business
// "Salão da Erlane", primeira venda real Asaas R$67 PIX em 07/05/2026).

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
if (!KEY) {
  console.error('SEM ASAAS_API_KEY no .env.local')
  process.exit(1)
}

const BASE = KEY.startsWith('$aact_hmlg_')
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3'

const CUSTOMER_ID = process.argv[2] || 'cus_000175083139'

console.log(`Atualizando customer ${CUSTOMER_ID} → notificationDisabled: true`)

const res = await fetch(`${BASE}/customers/${CUSTOMER_ID}`, {
  method: 'POST',  // Asaas usa POST com body parcial pra update
  headers: {
    'Content-Type': 'application/json',
    access_token: KEY,
  },
  body: JSON.stringify({ notificationDisabled: true }),
})

const body = await res.json().catch(() => ({}))

if (!res.ok) {
  console.error(`HTTP ${res.status}:`, JSON.stringify(body, null, 2))
  process.exit(1)
}

console.log('✅ Customer atualizado.')
console.log('  name:', body.name)
console.log('  email:', body.email)
console.log('  notificationDisabled:', body.notificationDisabled)
