import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SumidosPanel from '@/components/admin/SumidosPanel'
import { IconClock } from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

/**
 * Aba própria pro Sumidos (Eduardo, 06/09/2026).
 *
 * A função existia desde sempre, mas só se chegava nela por dentro de Clientes
 * ou pelo Foco do Dia — nenhuma entrada de menu, nem no mobile nem no desktop.
 * Quem não sabia que existia não achava. A tela de campanha com cupom continua
 * em /admin/clientes/reativar; aqui é só olhar e chamar.
 */
export default async function SumidosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()
  if (!business) redirect(await destinoSemNegocio())

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="admin-orb-1 absolute -top-32 left-1/2 w-[520px] h-[520px] rounded-full blur-[120px]"
          style={{ background: 'var(--admin-bg-orb-1)' }} />
        <div className="admin-orb-2 absolute top-[40%] -right-24 w-72 h-72 rounded-full blur-[80px]"
          style={{ background: 'var(--admin-bg-orb-2)' }} />
      </div>

      <div className="relative max-w-lg md:max-w-7xl mx-auto px-4 md:px-6 pb-32">
        <header className="pt-7 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-faded)' }}>
            {business.name}
          </p>
          <h1 className="text-[26px] font-bold tracking-tight leading-tight inline-flex items-center gap-2" style={{ color: 'var(--admin-text)' }}>
            <IconClock size={22} /> Sumidos
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--admin-text-mute)' }}>
            Quem não volta há um tempo · escolha o prazo e chame no WhatsApp
          </p>
        </header>

        <SumidosPanel mostrarLinkCampanha podeEditarTexto />
      </div>
    </main>
  )
}
