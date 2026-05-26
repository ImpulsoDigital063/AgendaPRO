import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RecepClientesList from '@/components/recepcao/RecepClientesList'
import {
  IconUsers,
} from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

export default async function RecepcaoClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  const { data: recep } = await supabase
    .from('professionals')
    .select('id, business:businesses(id, name)')
    .eq('auth_user_id', user.id)
    .eq('is_receptionist', true)
    .single()

  if (!recep || !recep.business) redirect('/profissional/login')

  const business = recep.business as unknown as { id: string; name: string }

  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, phone, email, total_points, birthday, notes')
    .eq('business_id', business.id)
    .order('name', { ascending: true })

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <header className="relative max-w-lg md:max-w-7xl mx-auto px-4 md:px-6 pt-7 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-faded)' }}>
          Recepção
        </p>
        <div className="flex items-baseline justify-between">
          <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--admin-text)' }}>
            Clientes
          </h1>
          <span
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5"
            style={{
              background: 'var(--admin-accent-bg)',
              color: 'var(--admin-accent)',
              border: '1px solid var(--admin-accent-border)',
            }}
          >
            <IconUsers size={12} />
            {customers?.length ?? 0}
          </span>
        </div>
      </header>

      <RecepClientesList businessId={business.id} initial={customers ?? []} />
    </main>
  )
}
