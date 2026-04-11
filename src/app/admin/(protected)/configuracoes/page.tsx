import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConfiguracoesTabs from '@/components/admin/ConfiguracoesTabs'
import LogoutButton from '@/components/LogoutButton'
import Link from 'next/link'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!business) redirect('/cadastro')

  const [{ data: professionals }, { data: services }] = await Promise.all([
    supabase.from('professionals').select('*').eq('business_id', business.id).order('created_at'),
    supabase.from('services').select('*').eq('business_id', business.id).order('name'),
  ])

  // Busca horários de todos os profissionais
  const professionalIds = (professionals || []).map((p: { id: string }) => p.id)
  const { data: allWorkingHours } = professionalIds.length > 0
    ? await supabase.from('working_hours').select('*').in('professional_id', professionalIds)
    : { data: [] }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-400 hover:text-gray-700 transition-colors">
              ← Voltar
            </Link>
            <div>
              <h1 className="font-bold text-gray-900">Configurações</h1>
              <p className="text-gray-400 text-xs">{business.name}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <ConfiguracoesTabs
          business={business}
          initialProfessionals={professionals || []}
          initialServices={services || []}
          initialWorkingHours={allWorkingHours || []}
        />
      </div>
    </main>
  )
}
