import type { Metadata } from 'next'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NICHE_FICHAS } from '@/lib/fichas/registry'
import { hashToken, tokenValido } from '@/lib/fichas/convite'
import FichaClienteView from './FichaClienteView'

/* PÁGINA PÚBLICA (v157) · a cliente abre o link do WhatsApp e preenche a
   ficha no celular. Mostra o MÍNIMO: logo e nome da clínica, primeiro nome
   dela e a ficha. Nada de histórico, outras fichas ou telefone — quem pegar o
   link emprestado não descobre nada além do que vai responder. */

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Ficha', robots: { index: false, follow: false } }

type Estado = 'ok' | 'invalido' | 'usado' | 'expirado'

export default async function FichaClientePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  let estado: Estado = 'invalido'
  let dados: { slug: string; primeiroNome: string; negocio: string; logo: string | null; cor: string | null } | null = null

  if (tokenValido(token)) {
    const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    const { data: conv } = await admin
      .from('ficha_convites')
      .select('business_id, customer_id, niche_slug, expires_at, used_at, cancelado_em')
      .eq('token_hash', hashToken(token))
      .maybeSingle()
    if (conv && NICHE_FICHAS[conv.niche_slug]?.clientePreenche) {
      if (conv.used_at) estado = 'usado'
      else if (conv.cancelado_em || new Date(conv.expires_at) < new Date()) estado = 'expirado'
      else {
        const [{ data: biz }, { data: cust }] = await Promise.all([
          admin.from('businesses').select('name, logo_url, brand_logo_url, brand_primary, ficha_rodape').eq('id', conv.business_id).maybeSingle(),
          admin.from('customers').select('name').eq('id', conv.customer_id).maybeSingle(),
        ])
        const rodape = (biz?.ficha_rodape ?? null) as { logo?: string } | null
        estado = 'ok'
        dados = {
          slug: conv.niche_slug,
          primeiroNome: (cust?.name ?? '').trim().split(/\s+/)[0] ?? '',
          negocio: biz?.name ?? '',
          logo: rodape?.logo ?? biz?.brand_logo_url ?? biz?.logo_url ?? null,
          cor: biz?.brand_primary ?? null,
        }
      }
    }
  }

  return <FichaClienteView token={token} estado={estado} dados={dados} />
}
