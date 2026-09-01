/* Pega a cobranca de avisos aberta da Marcela e valida o BR Code do PIX.
   node scripts/_pix-diag.mjs */
import fs from 'node:fs'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  if (!l || l.startsWith('#') || !l.includes('=')) continue
  const i = l.indexOf('=')
  const k = l.slice(0, i).trim()
  if (!process.env[k]) process.env[k] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '')
}
const key = process.env.ASAAS_API_KEY
const base = 'https://api.asaas.com/v3'
const get = async (p) => {
  const r = await fetch(base + p, { headers: { access_token: key } })
  const t = await r.text()
  try { return { ok: r.ok, status: r.status, d: JSON.parse(t) } } catch { return { ok: r.ok, status: r.status, raw: t } }
}

const BUSINESS = 'cd3c7f5a-e657-4ddb-96c7-0a4ff45b63eb'
const lista = await get('/payments?limit=30')
const alvos = (lista.d?.data ?? []).filter(
  (p) => typeof p.externalReference === 'string' && p.externalReference.includes(BUSINESS),
)
console.log('cobrancas de avisos:', alvos.length)
for (const p of alvos) {
  console.log('\n─────────────────────────────────────────')
  console.log('id           ', p.id)
  console.log('status       ', p.status)
  console.log('valor        ', p.value)
  console.log('vencimento   ', p.dueDate)
  console.log('billingType  ', p.billingType)
  console.log('deleted      ', p.deleted)
  console.log('invoiceUrl   ', p.invoiceUrl)

  const qr = await get(`/payments/${p.id}/pixQrCode`)
  if (!qr.ok) {
    console.log('QR: ERRO', qr.status, JSON.stringify(qr.d ?? qr.raw).slice(0, 300))
    continue
  }
  const payload = qr.d?.payload ?? ''
  console.log('QR success   ', qr.d?.success)
  console.log('expira em    ', qr.d?.expirationDate)
  console.log('payload len  ', payload.length)
  console.log('payload      ', payload)

  // ── Validacao do BR Code (EMV) ──────────────────────────────
  const problemas = []
  if (!payload) problemas.push('payload VAZIO')
  if (payload && !payload.startsWith('000201')) problemas.push('nao comeca com 000201 (Payload Format Indicator)')
  if (payload && !/6304[0-9A-F]{4}$/i.test(payload)) problemas.push('nao termina com o campo CRC 6304xxxx')

  if (payload && /6304[0-9A-F]{4}$/i.test(payload)) {
    // CRC16-CCITT (poly 0x1021, init 0xFFFF) sobre tudo ate "6304"
    const semCrc = payload.slice(0, -4)
    let crc = 0xffff
    for (const ch of semCrc) {
      crc ^= ch.charCodeAt(0) << 8
      for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
    const calc = crc.toString(16).toUpperCase().padStart(4, '0')
    const veio = payload.slice(-4).toUpperCase()
    console.log('CRC no codigo', veio, '| CRC calculado', calc, veio === calc ? '→ OK' : '→ DIVERGE')
    if (veio !== calc) problemas.push('CRC nao confere — o codigo esta corrompido')
  }
  console.log(problemas.length ? 'PROBLEMAS: ' + problemas.join(' | ') : 'BR Code estruturalmente valido')
}
