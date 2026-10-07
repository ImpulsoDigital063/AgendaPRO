import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AvisosManuaisPainel from '@/components/admin/whatsapp/AvisosManuaisPainel'

export const dynamic = 'force-dynamic'

/**
 * Avisos manuais — o texto que abre no botão "Enviar WhatsApp" do agendamento.
 * Separado de /admin/whatsapp (avisos automáticos) em 07/10/2026: ver o
 * comentário no topo de AvisosManuaisPainel.
 */
export default async function AdminAvisosManuaisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, category, phone')
    .eq('owner_id', user.id)
    .single()
  if (!business) redirect(await destinoSemNegocio())

  /* Mesmo fundo (orbs + vinheta) de /admin/whatsapp, pra as duas telas irmãs
     parecerem do mesmo sistema. */
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
        <AvisosManuaisPainel
          businessName={business.name}
          businessPhone={business.phone}
          category={business.category}
        />
      </div>
    </main>
  )
}
