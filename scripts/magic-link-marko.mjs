/**
 * Gera magic link one-shot pro admin do Palace (Marko).
 * Sem afetar a senha dele — link expira após uso ou em 1h.
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
const redirectTo = 'https://agenda-pro-seven.vercel.app/auth/callback?next=/admin'

const { data, error } = await sb.auth.admin.generateLink({
  type: 'magiclink',
  email,
  options: { redirectTo },
})

if (error) {
  console.error('FAIL:', error.message)
  process.exit(1)
}

console.log('\nMagic link gerado pro admin Marko:\n')
console.log(data.properties.action_link)
console.log('\nCole no navegador desktop. Loga direto em /admin.')
