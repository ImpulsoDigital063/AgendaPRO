/**
 * Cadastrar equipe Palace Nail Spa Macaé em lote.
 * 5 profissionais + 1 recepcionista.
 *
 * Rodar:
 *   node --env-file=.env.local scripts/cadastrar-palace-equipe.mjs
 *
 * Emails vêm do colaborador.csv (Salão 99).
 * Senhas geradas random (mostradas no fim).
 */

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const BIZ_ID = 'ee6f0b22-5a46-406a-a3d4-b901551c4261'
const APP_URL = 'https://agendapro.net.br'
const LOGIN_URL = `${APP_URL}/profissional/login`

const equipe = [
  { name: 'Kelle Monique',     email: 'kellemoniqueeloysantoscardoso@gmail.com', isRecep: false, employment: 'commissioned' },
  { name: 'Sofia',             email: 'sofiasouzaiiiix@gmail.com',               isRecep: false, employment: 'commissioned' },
  { name: 'Ariana',            email: 'arianainacio7251@gmail.com',              isRecep: false, employment: 'commissioned' },
  { name: 'Dos Santos Souza',  email: 'suziunica123@gmail.com',                  isRecep: false, employment: 'commissioned' },
  { name: 'Divina',            email: 'patriciavasconcellos37222@gmail.com',     isRecep: false, employment: 'commissioned' },
  { name: 'Leticia',           email: 'lelemathias00@icloud.com',                isRecep: true,  employment: 'employed' },
]

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

const results = []

for (const p of equipe) {
  const log = (s) => console.log(`[${p.name}] ${s}`)

  try {
    log('insert professional...')
    const { data: prof, error: insErr } = await sb
      .from('professionals')
      .insert({
        business_id: BIZ_ID,
        name: p.name,
        active: true,
        commission_percentage: 0,
        role: 'professional',
        employment_type: p.employment,
        is_receptionist: p.isRecep,
      })
      .select()
      .single()

    if (insErr) throw new Error(`insert: ${insErr.message}`)

    const tempPassword = `AgPro-${randomBytes(6).toString('base64url')}`

    log('create auth user...')
    const { data: userData, error: authErr } = await sb.auth.admin.createUser({
      email: p.email,
      password: tempPassword,
      email_confirm: true,
    })

    if (authErr) {
      // Se email já existe, tenta achar e linkar
      if (authErr.message?.includes('already')) {
        log('email já cadastrado, buscando user existente...')
        const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 })
        const existing = list?.users?.find((u) => u.email?.toLowerCase() === p.email.toLowerCase())
        if (!existing) throw new Error('email duplicado mas não achei o user')
        // Reseta senha
        await sb.auth.admin.updateUserById(existing.id, { password: tempPassword })
        userData.user = existing
      } else {
        throw new Error(`auth: ${authErr.message}`)
      }
    }

    log('linka auth_user_id...')
    const { error: linkErr } = await sb
      .from('professionals')
      .update({
        email: p.email,
        auth_user_id: userData.user.id,
        password_changed: false,
      })
      .eq('id', prof.id)

    if (linkErr) throw new Error(`link: ${linkErr.message}`)

    results.push({
      nome: p.name,
      papel: p.isRecep ? 'RECEPÇÃO' : 'profissional',
      email: p.email,
      senha: tempPassword,
    })

    log('OK')
  } catch (e) {
    results.push({
      nome: p.name,
      papel: p.isRecep ? 'RECEPÇÃO' : 'profissional',
      email: p.email,
      senha: `ERRO: ${e.message}`,
    })
    console.error(`[${p.name}] ERRO:`, e.message)
  }
}

console.log('\n\n========== CREDENCIAIS PALACE NAIL SPA MACAÉ ==========')
console.log(`Login URL: ${LOGIN_URL}\n`)
for (const r of results) {
  console.log(`${r.papel.padEnd(13)} | ${r.nome.padEnd(22)} | ${r.email.padEnd(48)} | ${r.senha}`)
}
console.log('\n')
