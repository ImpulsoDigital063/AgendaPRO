import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubPageHeader from '@/components/admin/SubPageHeader'
import PerguntasView from '@/components/admin/perguntas/PerguntasView'
import { getAdminAccess } from '@/lib/admin-data'
import { todayBR } from '@/lib/date-br'
import { PERGUNTAS } from '@/lib/perguntas/catalogo'
import { AREA_DO_GRUPO } from '@/lib/perguntas/areas'

/**
 * /admin/perguntas · "Pergunte ao seu negócio" (21/10/2026)
 *
 * Perguntas prontas sobre faturamento, equipe, clientes e agenda, SEM IA.
 * As respostas saem das mesmas contas das telas (lib/perguntas/responder).
 * Gerente só vê as perguntas das áreas liberadas pra ela.
 */
export default async function PerguntasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const acesso = await getAdminAccess(user.id)
  if (!acesso) redirect(await destinoSemNegocio())

  const [{ data: business }, { data: profs }] = await Promise.all([
    supabase.from('businesses').select('id, name').eq('id', acesso.businessId).single(),
    supabase.from('professionals').select('id, name').eq('business_id', acesso.businessId).eq('active', true).order('name'),
  ])
  if (!business) redirect(await destinoSemNegocio())

  const liberadas = PERGUNTAS.filter((p) => {
    const area = AREA_DO_GRUPO[p.grupo]
    return !area || !acesso.bloqueadas.includes(area)
  }).map((p) => p.id)

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <div className="relative">
        <SubPageHeader title="Pergunte ao seu negócio" subtitle={business.name} />
        <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-3xl lg:px-8">
          <PerguntasView
            profissionais={(profs ?? []).map((p) => ({ id: p.id as string, name: (p.name as string) ?? '' }))}
            liberadas={liberadas}
            hoje={todayBR()}
          />
        </div>
      </div>
    </main>
  )
}
