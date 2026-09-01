/* Configura a identidade do numero oficial no WhatsApp: foto de perfil (a
 * logo do AgendaPRO) e o restante do perfil comercial.
 *
 * Ate 01/09 a cliente do salao recebia a mensagem de "+55 63 99284-6765 ·
 * Conta comercial" — numero cru, sem nome e sem foto. Numero desconhecido
 * pedindo pra ela confirmar horario e' o pior cenario de confianca possivel.
 *
 * A foto sobe pela API de upload retomavel (3 passos). O NOME DE EXIBICAO
 * nao sobe por aqui: passa por analise da Meta e vive noutro endpoint.
 *
 * node scripts/_meta-perfil-whatsapp.mjs
 */
import fs from 'node:fs'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  if (!l || l.startsWith('#') || !l.includes('=')) continue
  const i = l.indexOf('=')
  const k = l.slice(0, i).trim()
  if (!process.env[k]) process.env[k] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '')
}

const TOKEN = process.env.WHATSAPP_TOKEN
const PHONE = process.env.WHATSAPP_PHONE_NUMBER_ID
const APP = '1076081335073678'
const G = 'https://graph.facebook.com/v21.0'
const ARQUIVO = 'public/icon-512.png'

const mostrar = async (r) => {
  const t = await r.text()
  try {
    return { ok: r.ok, st: r.status, d: JSON.parse(t) }
  } catch {
    return { ok: r.ok, st: r.status, raw: t.slice(0, 400) }
  }
}

// ── 1. Sessao de upload ──────────────────────────────────────────
const bin = fs.readFileSync(ARQUIVO)
console.log('arquivo:', ARQUIVO, '|', bin.length, 'bytes')

const s1 = await mostrar(
  await fetch(
    `${G}/${APP}/uploads?file_name=agendapro.png&file_length=${bin.length}` +
      `&file_type=image/png&access_token=${encodeURIComponent(TOKEN)}`,
    { method: 'POST' },
  ),
)
console.log('\n1) sessao de upload:', JSON.stringify(s1.d ?? s1.raw))
if (!s1.ok || !s1.d?.id) process.exit(1)

// ── 2. Envia os bytes ────────────────────────────────────────────
const s2 = await mostrar(
  await fetch(`${G}/${s1.d.id}`, {
    method: 'POST',
    headers: {
      /* `OAuth`, nao `Bearer` — e' o unico endpoint da Graph que exige
         este esquema. Com Bearer devolve 400 sem explicar. */
      Authorization: `OAuth ${TOKEN}`,
      file_offset: '0',
      'Content-Type': 'application/octet-stream',
    },
    body: bin,
  }),
)
console.log('2) upload:', JSON.stringify(s2.d ?? s2.raw))
if (!s2.ok || !s2.d?.h) process.exit(1)

// ── 3. Aplica no perfil ──────────────────────────────────────────
const s3 = await mostrar(
  await fetch(`${G}/${PHONE}/whatsapp_business_profile`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      profile_picture_handle: s2.d.h,
      about: 'Avisos do seu horario',
      websites: ['https://www.agendapro.net.br'],
      vertical: 'PROF_SERVICES',
    }),
  }),
)
console.log('3) perfil:', JSON.stringify(s3.d ?? s3.raw))

// ── 4. Prova na fonte ────────────────────────────────────────────
const dep = await mostrar(
  await fetch(
    `${G}/${PHONE}/whatsapp_business_profile?fields=about,description,profile_picture_url,websites,vertical`,
    { headers: { Authorization: `Bearer ${TOKEN}` } },
  ),
)
console.log('\n═══ PERFIL DEPOIS ═══')
console.log(JSON.stringify(dep.d, null, 1))
