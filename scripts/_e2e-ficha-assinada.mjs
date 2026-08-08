/* Prova o ciclo da ficha assinada na Serenity, em produção:
   assina → tenta alterar por dentro e por fora → confere integridade.
   Limpa tudo no fim. */
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import fs from 'fs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); let v = l.slice(i + 1).trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); return [l.slice(0, i).trim(), v] })
)
const URL_SB = env.NEXT_PUBLIC_SUPABASE_URL
const REF = URL_SB.replace('https://', '').split('.')[0]
const db = createClient(URL_SB, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(URL_SB, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const PROD = 'https://www.agendapro.net.br'

const { data: b } = await db.from('businesses').select('id, owner_id').eq('slug', 'serenityclinicaintegrada').single()

// paciente de teste
const { data: p } = await db.from('customers')
  .insert({ business_id: b.id, name: 'PACIENTE TESTE PROVA', phone: '45999998888' })
  .select('id').single()

// ficha assinada, com o mesmo carimbo que a rota grava
const conteudo = { nome_completo: 'Paciente Teste Prova', cpf: '111.444.777-35', queixa: 'teste de integridade' }
const canonico = (v) => Array.isArray(v) ? v.map(canonico)
  : v && typeof v === 'object'
    ? Object.keys(v).sort().reduce((a, k) => { a[k] = canonico(v[k]); return a }, {})
    : v
const agora = new Date().toISOString()
const base = JSON.stringify({
  conteudo: canonico(conteudo), negocio: b.id, paciente: p.id,
  assinante: 'Paciente Teste Prova', cpf: '11144477735', em: agora,
})
const hash = createHash('sha256').update(base).digest('hex')

const { data: f } = await db.from('client_form_responses').insert({
  business_id: b.id, customer_id: p.id, niche_slug: 'teste', data: conteudo,
  assinado_em: agora, assinatura_hash: hash, assinatura_ip: '187.0.0.1',
  assinatura_dispositivo: 'iPhone teste', assinante_nome: 'Paciente Teste Prova',
  assinante_cpf: '11144477735',
}).select('id').single()
console.log('1. ficha assinada · hash', hash.slice(0, 16) + '…')

// tentativa de adulteração direta
const t1 = await db.from('client_form_responses').update({ data: { ...conteudo, queixa: 'ADULTERADO' } }).eq('id', f.id)
console.log('2. adulterar direto:', t1.error ? 'BLOQUEADO pelo banco' : 'PASSOU (falha grave)')

// login da dona pra conferir pela rota
const { data: u } = await db.auth.admin.getUserById(b.owner_id)
const { data: lk } = await db.auth.admin.generateLink({ type: 'magiclink', email: u.user.email })
const { data: sess } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: lk.properties.hashed_token })
const s = sess.session
const pay = 'base64-' + Buffer.from(JSON.stringify({
  access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at,
  expires_in: s.expires_in, token_type: s.token_type, user: s.user,
})).toString('base64')
const parts = pay.match(/.{1,3180}/g)
const cookie = parts.length === 1 ? `sb-${REF}-auth-token=${pay}` : parts.map((x, i) => `sb-${REF}-auth-token.${i}=${x}`).join('; ')

const c1 = await fetch(`${PROD}/api/admin/fichas/conferir?id=${f.id}`, { headers: { cookie } }).then(r => r.json())
console.log('3. conferencia:', JSON.stringify(c1.fichas?.[0] && {
  integra: c1.fichas[0].integra, assinante: c1.fichas[0].assinante, hash: c1.fichas[0].hash_curto,
}))

/* Simula escrita por fora: desassina, altera, reassina o registro antigo
   sem recalcular o hash. E o cenario que a conferencia existe pra pegar. */
await db.from('client_form_responses').update({ assinado_em: null }).eq('id', f.id)
await db.from('client_form_responses').update({ data: { ...conteudo, queixa: 'ADULTERADO POR FORA' } }).eq('id', f.id)
await db.from('client_form_responses').update({ assinado_em: agora }).eq('id', f.id)
const c2 = await fetch(`${PROD}/api/admin/fichas/conferir?id=${f.id}`, { headers: { cookie } }).then(r => r.json())
console.log('4. apos adulteracao por fora:', JSON.stringify(c2.fichas?.[0] && {
  integra: c2.fichas[0].integra, motivo: c2.fichas[0].motivo,
}))

await db.from('customers').delete().eq('id', p.id)
console.log('5. limpo')
