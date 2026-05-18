import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'
import AtividadesView from '@/components/admin/AtividadesView'
import { IconClock } from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

export default async function AtividadesPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) {
    // Não é dono · pode ser recep tentando acessar · manda pra /recepcao
    const supabaseCheck = await createClient()
    const { data: prof } = await supabaseCheck
      .from('professionals')
      .select('is_receptionist')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (prof?.is_receptionist) redirect('/recepcao')
    redirect('/admin/login')
  }

  const supabase = await createClient()

  const { data: activities } = await supabase
    .from('activity_log')
    .select('id, action, description, target_type, target_id, created_at, professional_id')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(200)

  const { data: profs } = await supabase
    .from('professionals')
    .select('id, name')
    .eq('business_id', business.id)

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <header className="relative max-w-2xl mx-auto px-4 pt-7 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-faded)' }}>
          Administração
        </p>
        <h1 className="text-[26px] font-bold tracking-tight leading-tight inline-flex items-center gap-2" style={{ color: 'var(--admin-text)' }}>
          <IconClock size={22} /> Atividades
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--admin-text-mute)' }}>
          Histórico de ações da equipe · quem fez o quê e quando
        </p>
      </header>

      <AtividadesView activities={activities ?? []} professionals={profs ?? []} />
    </main>
  )
}
