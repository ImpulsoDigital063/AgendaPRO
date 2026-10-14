import type { Metadata } from 'next'
import { cache } from 'react'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NICHE_FICHAS } from '@/lib/fichas/registry'
import { hashToken, tokenValido } from '@/lib/fichas/convite'
import FichaClienteView from './FichaClienteView'

/* PÁGINA PÚBLICA (v157) · a cliente abre o link do WhatsApp e preenche a
   ficha no celular. Mostra o MÍNIMO: logo e nome da clínica, primeiro nome
   dela e a ficha. Nada de histórico, outras fichas ou telefone — quem pegar o
   link emprestado não descobre nada além do que vai responder. */

export const dynamic = 'force-dynamic'

type Estado = 'ok' | 'invalido' | 'usado' | 'expirado'
type Dados = { slug: string; primeiroNome: string; negocio: string; logo: string | null; cor: string | null }

/* `cache`: a página e a prévia do link (generateMetadata) leem o mesmo
   convite numa ida só ao banco. */
const carregar = cache(async (token: string): Promise<{ estado: Estado; dados: Dados | null; negocio: string | null; logo: string | null }> => {
  if (!tokenValido(token)) return { estado: 'invalido', dados: null, negocio: null, logo: null }
  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data: conv } = await admin
    .from('ficha_convites')
    .select('business_id, customer_id, niche_slug, expires_at, used_at, cancelado_em, grupo')
    .eq('token_hash', hashToken(token))
    .maybeSingle()
  if (!conv || !NICHE_FICHAS[conv.niche_slug]?.clientePreenche) return { estado: 'invalido', dados: null, negocio: null, logo: null }

  const [{ data: biz }, { data: cust }] = await Promise.all([
    admin.from('businesses').select('name, logo_url, brand_logo_url, brand_primary, ficha_rodape').eq('id', conv.business_id).maybeSingle(),
    admin.from('customers').select('name').eq('id', conv.customer_id).maybeSingle(),
  ])
  /* Na TELA vale a logo do app (feita pra tela). A do impresso (ficha_rodape)
     vem com a margem branca do papel e ficava minúscula — visto no teste do
     Eduardo na conta da Wanessa, 14/10. */
  const rodape = (biz?.ficha_rodape ?? null) as { logo?: string } | null
  const logo = biz?.logo_url ?? biz?.brand_logo_url ?? rodape?.logo ?? null
  const negocio = biz?.name ?? null
  if (conv.used_at) return { estado: 'usado', dados: null, negocio, logo }
  /* Cancelado porque a cliente respondeu a outra do grupo (Feminina ×
     Masculina, v159): pra ela, a ficha "já foi enviada", não "expirou". */
  if (conv.cancelado_em && conv.grupo) {
    const { count } = await admin.from('ficha_convites').select('id', { count: 'exact', head: true }).eq('grupo', conv.grupo).not('used_at', 'is', null)
    if ((count ?? 0) > 0) return { estado: 'usado', dados: null, negocio, logo }
  }
  if (conv.cancelado_em || new Date(conv.expires_at) < new Date()) return { estado: 'expirado', dados: null, negocio, logo }
  return {
    estado: 'ok',
    negocio,
    logo,
    dados: {
      slug: conv.niche_slug,
      primeiroNome: (cust?.name ?? '').trim().split(/\s+/)[0] ?? '',
      negocio: negocio ?? '',
      logo,
      cor: biz?.brand_primary ?? null,
    },
  }
})

/* PRÉVIA DO LINK NO WHATSAPP · tem que ser da CLÍNICA. Sem isto o card era o
   do AgendaPRO ("Agenda inteligente pro seu negócio crescer sozinho"), e a
   cliente — que não conhece o AgendaPRO — recebia de um número conhecido um
   link com a marca de um estranho. Mesma regra do /sinal. Nada de nome da
   cliente: a prévia aparece em notificação de tela bloqueada. */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const { negocio, logo } = await carregar(token)
  const titulo = negocio ? `Ficha de atendimento · ${negocio}` : 'Ficha de atendimento'
  const descricao = 'Preencha sua ficha antes do atendimento. Leva poucos minutos.'
  return {
    title: titulo,
    description: descricao,
    robots: { index: false, follow: false },
    openGraph: {
      title: titulo,
      description: descricao,
      type: 'website',
      ...(logo ? { images: [{ url: logo, alt: negocio ?? 'Logo' }] } : {}),
    },
  }
}

export default async function FichaClientePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { estado, dados } = await carregar(token)
  return <FichaClienteView token={token} estado={estado} dados={dados} />
}
