/* Compara o PIX que FOI PAGO com o que os bancos estao recusando.
   node scripts/_pix-compara.mjs */
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
  try { return { ok: r.ok, st: r.status, d: JSON.parse(t) } } catch { return { ok: r.ok, st: r.status, raw: t } }
}

const lp = await get('/payments?limit=40&billingType=PIX')
const todos = lp.d?.data ?? []

const pagos = todos.filter((p) => p.status === 'RECEIVED' || p.status === 'CONFIRMED').slice(0, 3)
const abertos = todos.filter((p) => p.status === 'PENDING').slice(0, 3)

async function descreve(p, rotulo) {
  console.log(`\n═══ ${rotulo} ═══`)
  console.log('id           ', p.id)
  console.log('status       ', p.status)
  console.log('valor        ', p.value)
  console.log('criado       ', p.dateCreated)
  console.log('vencimento   ', p.dueDate)
  const mesmoDia = p.dateCreated === p.dueDate
  console.log('venc == criado?', mesmoDia ? 'SIM (PIX imediato)' : 'NAO (PIX com vencimento)')
  const qr = await get(`/payments/${p.id}/pixQrCode`)
  if (!qr.ok) { console.log('QR ERRO', qr.st); return }
  const pl = qr.d?.payload ?? ''
  const tipo = pl.includes('/qr/cobv/') ? 'cobv  (PIX COM VENCIMENTO)' : pl.includes('/qr/cob/') ? 'cob   (PIX IMEDIATO)' : 'desconhecido'
  console.log('tipo do QR   ', tipo)
  console.log('payload      ', pl.slice(0, 90) + '…')
}

for (const p of pagos) await descreve(p, 'PAGO COM SUCESSO')
for (const p of abertos) await descreve(p, 'ABERTO / RECUSADO PELOS BANCOS')
