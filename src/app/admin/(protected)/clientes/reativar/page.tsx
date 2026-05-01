import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubPageHeader from '@/components/admin/SubPageHeader'
import ReativarSumidosView from '@/components/admin/ReativarSumidosView'

export default async function ReativarSumidosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, slug, name, description')
    .eq('owner_id', user.id)
    .single()
  if (!business) redirect('/cadastro')

  // Lista cupons ativos pra mostrar dashboard mini
  const { data: existingCoupons } = await supabase
    .from('coupons')
    .select('id, code, sent_at, used_at, expires_at, customer_id')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="admin-orb-1 absolute -top-32 left-1/2 w-[520px] h-[520px] rounded-full blur-[120px]"
          style={{ background: 'var(--admin-bg-orb-1)' }} />
        <div className="admin-orb-2 absolute top-[40%] -right-24 w-72 h-72 rounded-full blur-[80px]"
          style={{ background: 'var(--admin-bg-orb-2)' }} />
      </div>
      <div className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse 100% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.18) 100%)' }} />

      <div className="relative">
        <SubPageHeader
          title="Reativar sumidos"
          subtitle={business.name}
          back="/admin/clientes"
        />
        <div className="max-w-lg mx-auto px-4 py-6">
          <ReativarSumidosView
            businessSlug={business.slug}
            businessName={business.name}
            businessDescription={business.description}
            existingCoupons={existingCoupons || []}
          />
        </div>
      </div>
    </main>
  )
}
