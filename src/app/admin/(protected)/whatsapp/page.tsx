import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WhatsAppPainel from '@/components/admin/whatsapp/WhatsAppPainel'

export const dynamic = 'force-dynamic'

/**
 * Central de WhatsApp — tudo que o negócio manda pela cliente num lugar só.
 *
 * Fica no grupo PAINEL do menu, não em Configurações (Eduardo, 21/08). O
 * motivo é operacional: quando o canal cai, os avisos param em silêncio, e
 * a dona precisa ver isso na primeira tela que abre — não a quatro cliques
 * de distância, numa aba de configuração que ninguém visita.
 */
export default async function AdminWhatsAppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, category, phone')
    .eq('owner_id', user.id)
    .single()
  if (!business) redirect(await destinoSemNegocio())

  return <WhatsAppPainel businessName={business.name} category={business.category} businessPhone={business.phone} />
}
