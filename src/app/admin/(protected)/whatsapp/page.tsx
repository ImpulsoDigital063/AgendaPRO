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

  /* O <main> com orbs e vinheta e o mesmo de Clientes, Caixa e Consultas.
     A primeira versao desta tela nao tinha nada disso e o painel aparecia
     solto sobre o fundo cru — era o que fazia ela parecer inacabada ao lado
     das outras. O container e o cabecalho grudado moram dentro do painel,
     porque o titulo e o botao de voltar mudam conforme a tela de dentro. */
  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="admin-orb-1 absolute -top-32 left-1/2 w-[520px] h-[520px] rounded-full blur-[120px]"
          style={{ background: 'var(--admin-bg-orb-1)' }}
        />
        <div
          className="admin-orb-2 absolute top-[40%] -right-24 w-72 h-72 rounded-full blur-[80px]"
          style={{ background: 'var(--admin-bg-orb-2)' }}
        />
        <div
          className="admin-orb-3 absolute bottom-0 -left-20 w-64 h-64 rounded-full blur-[80px]"
          style={{ background: 'var(--admin-bg-orb-3)' }}
        />
      </div>
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 50% 50%, transparent 55%, rgba(15,23,42,0.05) 100%)',
        }}
      />

      <div className="relative">
        <WhatsAppPainel
          businessName={business.name}
          category={business.category}
          businessPhone={business.phone}
        />
      </div>
    </main>
  )
}
