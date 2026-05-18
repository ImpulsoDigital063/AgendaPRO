/**
 * Gera magic link one-shot pro admin do Palace (Marko).
 * Usa hashed_token + /auth/confirm (server-side verifyOtp).
 * Sem afetar senha. Expira em 1h ou após uso.
 *
 * Rodar:
 *   node --env-file=.env.local scripts/magic-link-marko.mjs
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

const email = 'palacenailspamacae@gmail.com'
const base = 'https://agenda-pro-seven.vercel.app'

const { data, error } = await sb.auth.admin.generateLink({
  type: 'magiclink',
  email,
})

if (error) {
  console.error('FAIL:', error.message)
  process.exit(1)
}

const tokenHash = data.properties.hashed_token
const url = `${base}/auth/confirm?token_hash=${tokenHash}&type=magiclink&next=/admin`

console.log('\nMagic link gerado pro admin Marko:\n')
console.log(url)
console.log('\nCole no navegador desktop. Loga direto em /admin.')
