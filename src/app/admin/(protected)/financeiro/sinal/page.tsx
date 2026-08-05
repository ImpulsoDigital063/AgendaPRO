import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'
import SubPageHeader from '@/components/admin/SubPageHeader'
import SinalView from '@/components/admin/SinalView'

/**
 * Sinal do agendamento (v112) — pedido da Wanessa Silva em 05/08/2026.
 *
 * Fica no Financeiro e não em Configurações de propósito: a configuração é
 * feita uma vez, mas a LISTA de quem está devendo o sinal é consultada todo
 * dia. Enterrar isso numa aba de configuração seria esconder a parte que
 * ela vai usar.
 */
export default async function SinalPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect(await destinoSemNegocio())

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <SubPageHeader title="Sinal" subtitle={business.name} back="/admin/financeiro" />
      <div className="max-w-lg mx-auto px-4 py-6 sm:max-w-3xl sm:px-6">
        <SinalView />
      </div>
    </main>
  )
}
