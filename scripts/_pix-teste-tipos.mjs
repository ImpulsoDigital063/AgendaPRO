/* Isola o problema: cria DUAS cobrancas de teste (uma vencendo hoje, outra
   daqui a 3 dias), olha que tipo de QR cada uma gera, e tenta buscar a URL
   do cobv como um banco faria. Apaga as duas no fim.

   node scripts/_pix-teste-tipos.mjs */
import fs from 'node:fs'
for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  if (!l || l.startsWith('#') || !l.includes('=')) continue
  const i = l.indexOf('='); const k = l.slice(0, i).trim()
  if (!process.env[k]) process.env[k] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '')
}
const key = process.env.ASAAS_API_KEY
const B = 'https://api.asaas.com/v3'
const req = async (p, init = {}) => {
  const r = await fetch(B + p, {
    ...init,
    headers: { 'Content-Type': 'application/json', access_token: key, ...(init.headers ?? {}) },
  })
  const t = await r.text()
  try { return { ok: r.ok, st: r.status, d: t ? JSON.parse(t) : null } } catch { return { ok: r.ok, st: r.status, raw: t } }
}

const hoje = new Date().toISOString().slice(0, 10)
const d3 = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10)

// ── 1. Estado da cobranca atual (a que o banco recusou) ──────────
console.log('═══ COBRANCA ATUAL ═══')
const lp = await req('/payments?limit=20')
const atual = (lp.d?.data ?? []).filter(
  (p) => typeof p.externalReference === 'string' && p.externalReference.includes('cd3c7f5a'),
)
for (const p of atual) {
  console.log(p.id, '|', p.status, '| deleted:', p.deleted, '| criado', p.dateCreated, '| vence', p.dueDate)
  const c = await req(`/customers/${p.customer}`)
  console.log('   dono:', c.d?.name, '| cpf:', c.d?.cpfCnpj)
  const qr = await req(`/payments/${p.id}/pixQrCode`)
  const pl = qr.d?.payload ?? ''
  console.log('   tipo:', pl.includes('/cobv/') ? 'cobv' : pl.includes('/cob/') ? 'cob' : '?')
  console.log('   url :', (pl.match(/pix\.asaas\.com\/qr\/[a-z]+\/[0-9a-f-]+/i) ?? ['—'])[0])

  // Busca a URL do cobv como um PSP faria (sem JWS — so pra ver o retorno)
  const m = pl.match(/(pix\.asaas\.com\/qr\/[a-z]+\/[0-9a-f-]+)/i)
  if (m) {
    try {
      const r = await fetch('https://' + m[1], { headers: { Accept: 'application/json' } })
      const txt = await r.text()
      console.log('   GET cobv ->', r.status, txt.slice(0, 160).replace(/\s+/g, ' '))
    } catch (e) {
      console.log('   GET cobv -> falhou:', String(e).slice(0, 120))
    }
  }
}

// ── 2. Cria duas de teste no mesmo cliente ───────────────────────
const cliente = atual[0]?.customer
if (!cliente) {
  console.log('\nsem cobranca atual pra reaproveitar o cliente — pare por aqui.')
  process.exit(0)
}

console.log('\n═══ TESTE A: vencimento HOJE ═══')
const a = await req('/payments', {
  method: 'POST',
  body: JSON.stringify({
    customer: cliente, billingType: 'PIX', value: 1.0, dueDate: hoje,
    description: 'TESTE tipo de QR — apagar', externalReference: 'teste-tipo-qr-hoje',
  }),
})
console.log('criada:', a.ok ? a.d?.id : `ERRO ${a.st} ${JSON.stringify(a.d).slice(0,200)}`)
if (a.ok) {
  const q = await req(`/payments/${a.d.id}/pixQrCode`)
  const pl = q.d?.payload ?? ''
  console.log('tipo:', pl.includes('/cobv/') ? 'cobv' : pl.includes('/cob/') ? 'cob' : '?')
  console.log('payload:', pl)
}

console.log('\n═══ TESTE B: vencimento +3 dias ═══')
const b = await req('/payments', {
  method: 'POST',
  body: JSON.stringify({
    customer: cliente, billingType: 'PIX', value: 1.0, dueDate: d3,
    description: 'TESTE tipo de QR — apagar', externalReference: 'teste-tipo-qr-3d',
  }),
})
console.log('criada:', b.ok ? b.d?.id : `ERRO ${b.st} ${JSON.stringify(b.d).slice(0,200)}`)
if (b.ok) {
  const q = await req(`/payments/${b.d.id}/pixQrCode`)
  const pl = q.d?.payload ?? ''
  console.log('tipo:', pl.includes('/cobv/') ? 'cobv' : pl.includes('/cob/') ? 'cob' : '?')
  console.log('payload:', pl)
}

// ── 3. Limpa as duas de teste ────────────────────────────────────
console.log('\n═══ LIMPEZA ═══')
for (const x of [a, b]) {
  if (x.ok && x.d?.id) {
    const del = await req(`/payments/${x.d.id}`, { method: 'DELETE' })
    console.log(del.ok ? 'apagada ' + x.d.id : 'FALHOU apagar ' + x.d.id)
  }
}
