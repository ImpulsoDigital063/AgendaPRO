/* Quem pode mexer na conexão do Google Agenda: só a DONA do negócio liberado.
   Gerente não conecta a conta Google de outra pessoa. */
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { negocioDoPainel } from '@/lib/admin-data'
import { googleAgendaLiberado } from '@/lib/google-agenda'

export function dbServico() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

export async function donaDoNegocioLiberado() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const businessId = await negocioDoPainel(user.id)
  const db = dbServico()
  const { data: b } = await db.from('businesses').select('id, slug, owner_id').eq('id', businessId).maybeSingle()
  if (!b || b.owner_id !== user.id || !googleAgendaLiberado(b.slug)) return null
  return { userId: user.id, businessId: b.id as string, db }
}
