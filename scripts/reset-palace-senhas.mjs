/**
 * Reset senhas da equipe Palace pro padrão fácil de digitar.
 * Também seta password_changed=false pra forçar troca no primeiro login
 * (cliente premium em onboarding · cada uma cria senha pessoal).
 *
 * Rodar:
 *   node --env-file=.env.local scripts/reset-palace-senhas.mjs
 */
import { createClient } from '@supabase/supabase-js'

const equipe = [
  { name: 'Kelle Monique',     email: 'kellemoniqueeloysantoscardoso@gmail.com', senha: 'kelle2026' },
  { name: 'Sofia',             email: 'sofiasouzaiiiix@gmail.com',               senha: 'sofia2026' },
  { name: 'Ariana',            email: 'arianainacio7251@gmail.com',              senha: 'ariana2026' },
  { name: 'Dos Santos Souza',  email: 'suziunica123@gmail.com',                  senha: 'susana2026' },
  { name: 'Divina',            email: 'patriciavasconcellos37222@gmail.com',     senha: 'divina2026' },
  { name: 'Leticia',           email: 'lelemathias00@icloud.com',                senha: 'leticia2026' },
]

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

// Pega lista de users uma vez só
const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 })

for (const p of equipe) {
  const user = list?.users?.find((u) => u.email?.toLowerCase() === p.email.toLowerCase())
  if (!user) {
    console.error(`  FAIL ${p.name} · sem auth user pra ${p.email}`)
    continue
  }

  // 1. Atualiza senha
  const { error: e1 } = await sb.auth.admin.updateUserById(user.id, { password: p.senha })
  if (e1) {
    console.error(`  FAIL ${p.name} updateUser · ${e1.message}`)
    continue
  }

  // 2. Reseta password_changed=false pra forçar troca no próximo login
  const { error: e2 } = await sb
    .from('professionals')
    .update({ password_changed: false })
    .eq('email', p.email)
  if (e2) {
    console.error(`  FAIL ${p.name} update prof · ${e2.message}`)
    continue
  }

  console.log(`  OK ${p.name.padEnd(22)} | ${p.email.padEnd(48)} | ${p.senha}`)
}

console.log('\nPróximo login de qualquer uma cai em /profissional/trocar-senha pra criar senha pessoal.')
