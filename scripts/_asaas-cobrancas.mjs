/* Lista as ultimas cobrancas no Asaas usando o MESMO cliente do sistema.
   node scripts/_asaas-cobrancas.mjs */
import fs from 'node:fs'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  if (!l || l.startsWith('#') || !l.includes('=')) continue
  const i = l.indexOf('=')
  const k = l.slice(0, i).trim()
  if (!process.env[k]) process.env[k] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '')
}

const key = process.env.ASAAS_API_KEY
const base = key?.startsWith('$aact_hmlg_') || process.env.ASAAS_ENV === 'sandbox'
  ? 'https://api-sandbox.asaas.com/v3'
  : 'https://api.asaas.com/v3'

console.log('base:', base, '| key:', key ? key.slice(0, 14) + '…' : 'AUSENTE', '\n')

const res = await fetch(`${base}/payments?limit=12`, {
  headers: { 'Content-Type': 'application/json', access_token: key },
})
const txt = await res.text()
console.log('HTTP', res.status)
let d
try {
  d = JSON.parse(txt)
} catch {
  console.log('resposta nao-JSON (primeiros 400 chars):\n', txt.slice(0, 400))
  process.exit(1)
}
if (d.errors) {
  console.log('ERRO Asaas:', JSON.stringify(d.errors))
  process.exit(1)
}
for (const p of d.data ?? []) {
  console.log(
    String(p.dateCreated).padEnd(12),
    String(p.status).padEnd(11),
    ('R$ ' + p.value).padEnd(10),
    String(p.externalReference ?? '—').slice(0, 62),
  )
}
console.log('\ntotal listado:', (d.data ?? []).length)
