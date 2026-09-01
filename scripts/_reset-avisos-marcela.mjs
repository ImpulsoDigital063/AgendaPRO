/* ZERA o teste de contratação de avisos da Studio Marcela Hair.
 *
 * Volta o estado pra antes de qualquer clique: cancela as cobranças
 * duplicadas, apaga o cliente criado no Asaas e limpa o vínculo no banco —
 * assim a tela pede nome e CPF de novo, como na primeira vez.
 *
 * FILTRO DURO: só mexe em cobrança cujo externalReference começa com
 * `avisos-avulso|<id da Marcela>`. A mesma conta Asaas tem cobranças reais
 * de outros clientes (R$67, R$219, R$340) — nenhuma é tocada.
 *
 * node scripts/_reset-avisos-marcela.mjs
 */
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  if (!l || l.startsWith('#') || !l.includes('=')) continue
  const i = l.indexOf('=')
  const k = l.slice(0, i).trim()
  if (!process.env[k]) process.env[k] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '')
}

const BUSINESS = 'cd3c7f5a-e657-4ddb-96c7-0a4ff45b63eb' // Studio Marcela Hair
const PREFIXO = `avisos-avulso|${BUSINESS}`

const key = process.env.ASAAS_API_KEY
const base =
  key?.startsWith('$aact_hmlg_') || process.env.ASAAS_ENV === 'sandbox'
    ? 'https://api-sandbox.asaas.com/v3'
    : 'https://api.asaas.com/v3'

const asaas = async (path, init = {}) => {
  const r = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', access_token: key, ...(init.headers ?? {}) },
  })
  const t = await r.text()
  let d = null
  try { d = t ? JSON.parse(t) : null } catch { /* nao-json */ }
  return { status: r.status, ok: r.ok, data: d, raw: t }
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// ── 1. Cobranças de avisos da Marcela ────────────────────────────
const lista = await asaas('/payments?limit=50')
if (!lista.ok) {
  console.log('ERRO ao listar cobranças:', lista.status, lista.raw.slice(0, 200))
  process.exit(1)
}
const alvos = (lista.data?.data ?? []).filter(
  (p) => typeof p.externalReference === 'string' && p.externalReference.startsWith(PREFIXO),
)
console.log('cobranças de avisos da Marcela encontradas:', alvos.length)
for (const p of alvos) {
  if (p.status === 'RECEIVED' || p.status === 'CONFIRMED') {
    console.log('  PULANDO', p.id, '— já foi PAGA (' + p.status + '). Não se cancela pagamento recebido.')
    continue
  }
  const del = await asaas(`/payments/${p.id}`, { method: 'DELETE' })
  console.log('  ' + (del.ok ? 'cancelada' : 'FALHOU  '), p.id, 'R$' + p.value, p.status)
}

// ── 2. Cliente criado no Asaas ───────────────────────────────────
const { data: sub } = await db
  .from('subscriptions')
  .select('asaas_customer_id')
  .eq('business_id', BUSINESS)
  .maybeSingle()
const custId = sub?.asaas_customer_id ?? null
console.log('\nasaas_customer_id no banco:', custId ?? '(vazio)')

/* O cliente também é encontrável por externalReference — se ele continuar
   existindo, a rota acha por lá e NÃO pede CPF de novo. Pra "como se não
   tivesse colocado os dados", ele tem que sair também. */
const porRef = await asaas(`/customers?externalReference=${encodeURIComponent(BUSINESS)}`)
const clientes = porRef.ok ? (porRef.data?.data ?? []) : []
const ids = new Set([custId, ...clientes.map((c) => c.id)].filter(Boolean))
for (const id of ids) {
  const del = await asaas(`/customers/${id}`, { method: 'DELETE' })
  console.log('  ' + (del.ok ? 'cliente removido' : 'FALHOU remover cliente'), id)
}

// ── 3. Limpa o vínculo no banco ──────────────────────────────────
if (custId) {
  const { error } = await db
    .from('subscriptions')
    .update({ asaas_customer_id: null })
    .eq('business_id', BUSINESS)
  console.log('\nlimpando asaas_customer_id:', error ? 'ERRO ' + error.message : 'ok')
}

// ── 4. Prova na fonte: relê tudo ─────────────────────────────────
console.log('\n═══ ESTADO DEPOIS ═══')
const { data: b } = await db
  .from('businesses')
  .select('avisos_pacote, avisos_unidades, avisos_desde, avisos_ate')
  .eq('id', BUSINESS)
  .maybeSingle()
console.log('pacote:', JSON.stringify(b))
const { data: s2 } = await db
  .from('subscriptions')
  .select('asaas_customer_id')
  .eq('business_id', BUSINESS)
  .maybeSingle()
console.log('asaas_customer_id:', s2?.asaas_customer_id ?? '(vazio)')

const conf = await asaas('/payments?limit=50')
const sobrou = (conf.data?.data ?? []).filter(
  (p) =>
    typeof p.externalReference === 'string' &&
    p.externalReference.startsWith(PREFIXO) &&
    p.status !== 'DELETED',
)
console.log('cobranças de avisos ainda ativas:', sobrou.length)
for (const p of sobrou) console.log('   ', p.id, p.status, 'R$' + p.value)
