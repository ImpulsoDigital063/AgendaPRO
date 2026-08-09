/* Prova, EM PRODUÇÃO e pelo caminho que a tela usa, que a ficha assina de
   verdade: entra como dono da conta espelho de teste, chama a mesma rota que o
   botão "Assinar e fechar" chama, e confere no banco o que ficou gravado.

   Roda na conta ESPELHO (clinica-teste-fichas), nunca na conta da clínica
   real: prova de mecanismo não suja prontuário de paciente.

   uso: node scripts/_e2e-assinar-pela-rota.mjs */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); let v = l.slice(i + 1).trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); return [l.slice(0, i).trim(), v] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const PROD = 'https://www.agendapro.net.br'
const SLUG = 'clinica-teste-fichas'

const ok = (t) => console.log('  OK   ' + t)
const nok = (t) => { console.log('  FALHA ' + t); process.exitCode = 1 }

const { data: b } = await db.from('businesses').select('id, owner_id').eq('slug', SLUG).single()
if (!b) { console.error('conta espelho não achada'); process.exit(1) }
const { data: u } = await db.auth.admin.getUserById(b.owner_id)

/* Sessão pelo mesmo caminho do painel: /auth/confirm troca o token e grava o
   cookie do lado do servidor. Link cru do Supabase devolve no fragmento, que
   só o navegador enxerga. */
const { data: link } = await db.auth.admin.generateLink({ type: 'magiclink', email: u.user.email })
const r1 = await fetch(`${PROD}/auth/confirm?token_hash=${link.properties.hashed_token}&type=magiclink&next=/admin`, { redirect: 'manual' })
const cookie = (r1.headers.getSetCookie?.() ?? []).map(c => c.split(';')[0]).join('; ')
if (!cookie.includes('sb-')) { console.error('não obteve cookie de sessão'); process.exit(1) }
ok('sessão de dono obtida em produção')

const { data: p } = await db.from('customers')
  .insert({ business_id: b.id, name: 'PROVA ASSINATURA', phone: '45999990000' })
  .select('id').single()

const valores = {
  nome_completo: 'Prova Assinatura',
  cpf: '111.444.777-35',
  ciente_riscos: true,
  autoriza_procedimento: true,
  autoriza_dados: true,
  recebeu_orientacoes: true,
  assinatura_paciente: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
}

const r2 = await fetch(`${PROD}/api/admin/customers/${p.id}/niche-ficha`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie },
  body: JSON.stringify({ nicheSlug: 'bioestimulador-colageno', values: valores, responseId: null, assinar: true }),
})
const j2 = await r2.json().catch(() => ({}))
if (!r2.ok) { console.error('POST falhou:', r2.status, JSON.stringify(j2)); process.exit(1) }
ok('rota aceitou a ficha assinada (protocolo novo: bioestimulador)')

/* prova-na-fonte: a resposta da rota não vale, vale a row */
const { data: row } = await db.from('client_form_responses')
  .select('id, niche_slug, assinado_em, assinatura_hash, assinante_nome, assinante_cpf, versao')
  .eq('id', j2.response.id).single()

row?.assinado_em ? ok('assinado_em gravado: ' + row.assinado_em.slice(0, 19)) : nok('assinado_em vazio')
row?.assinatura_hash ? ok('hash gravado: ' + row.assinatura_hash.slice(0, 16) + '…') : nok('hash vazio')
row?.assinante_nome ? ok('assinante: ' + row.assinante_nome) : nok('assinante vazio')

/* imutabilidade: o banco tem que recusar alteração mesmo com service role */
const { error: eUpd } = await db.from('client_form_responses')
  .update({ data: { adulterado: true } }).eq('id', row.id)
eUpd ? ok('banco recusou alteração da ficha assinada') : nok('ficha assinada FOI ALTERADA — trava não funcionou')

/* conferência de integridade pela rota */
/* A rota devolve um RESUMO do negócio ({total, integras, adulteradas}), não um
   veredito por ficha. Conferir por esse formato, não por um campo `integro`
   que nunca existiu. */
const r3 = await fetch(`${PROD}/api/admin/fichas/conferir?responseId=${row.id}`, { headers: { cookie } })
const j3 = await r3.json().catch(() => ({}))
const adulterada = (j3?.adulteradas ?? []).some((a) => (a?.id ?? a) === row.id)
j3?.integras >= 1 && !adulterada
  ? ok(`conferência de integridade: ${j3.integras} íntegra(s), ${(j3.adulteradas ?? []).length} adulterada(s)`)
  : nok('conferência: ' + JSON.stringify(j3))

// limpeza
await db.from('client_form_responses').delete().eq('id', row.id)
await db.from('customers').delete().eq('id', p.id)
ok('dados de teste removidos')
