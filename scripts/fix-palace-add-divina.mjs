/**
 * Fix Palace: deleta owner default "Luana & Marko" (Adm não atende)
 * e cadastra a Divina que faltou.
 */
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const BIZ_ID = 'ee6f0b22-5a46-406a-a3d4-b901551c4261'
const OWNER_DEFAULT_ID = '9e935f6e-2291-406b-9fed-2c056c8c9e3c'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

console.log('1. Deletando owner default "Luana & Marko"...')
const { error: delErr } = await sb
  .from('professionals')
  .delete()
  .eq('id', OWNER_DEFAULT_ID)
if (delErr) {
  console.error('ERRO delete:', delErr.message)
  process.exit(1)
}
console.log('   OK · aba "Eu" do admin some automaticamente')

console.log('2. Cadastrando Divina (Patricia)...')
const { data: prof, error: insErr } = await sb
  .from('professionals')
  .insert({
    business_id: BIZ_ID,
    name: 'Divina',
    active: true,
    commission_percentage: 0,
    role: 'professional',
    employment_type: 'commissioned',
    is_receptionist: false,
  })
  .select()
  .single()
if (insErr) {
  console.error('ERRO insert Divina:', insErr.message)
  process.exit(1)
}

const tempPassword = `AgPro-${randomBytes(6).toString('base64url')}`
const email = 'patriciavasconcellos37222@gmail.com'

console.log('3. Criando auth user...')
const { data: userData, error: authErr } = await sb.auth.admin.createUser({
  email,
  password: tempPassword,
  email_confirm: true,
})
if (authErr) {
  console.error('ERRO auth:', authErr.message)
  process.exit(1)
}

console.log('4. Linkando...')
await sb
  .from('professionals')
  .update({ email, auth_user_id: userData.user.id, password_changed: false })
  .eq('id', prof.id)

console.log(`\nDIVINA OK · email: ${email} · senha: ${tempPassword}`)
