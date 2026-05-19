import { redirect, notFound } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'
import SubPageHeader from '@/components/admin/SubPageHeader'
import ColaboradorTabs from '@/components/admin/colaboradores/ColaboradorTabs'

export const dynamic = 'force-dynamic'

export default async function ColaboradorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect('/cadastro')

  const { id } = await params

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: prof } = await sb
    .from('professionals')
    .select('id, name, email, phone, default_commission_percent, is_receptionist, active, business_id')
    .eq('id', id)
    .maybeSingle()

  if (!prof || prof.business_id !== business.id) notFound()

  const [{ data: vouchers }, { data: salaries }] = await Promise.all([
    sb
      .from('professional_vouchers')
      .select('id, description, date, amount, used_in_payment_id')
      .eq('professional_id', id)
      .order('date', { ascending: false }),
    sb
      .from('professional_salaries')
      .select('id, description, date, amount, paid, paid_at')
      .eq('professional_id', id)
      .order('date', { ascending: false }),
  ])

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <div className="relative">
        <SubPageHeader title="Colaborador" subtitle={prof.name} back="/admin/configuracoes?tab=profissionais" />
        <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-5xl lg:px-8">
          <ColaboradorTabs
            prof={{
              id: prof.id,
              name: prof.name,
              email: prof.email,
              phone: prof.phone,
              default_commission_percent: Number(prof.default_commission_percent ?? 40),
              is_receptionist: prof.is_receptionist ?? false,
              active: prof.active ?? true,
            }}
            initialVouchers={vouchers ?? []}
            initialSalaries={salaries ?? []}
          />
        </div>
      </div>
    </main>
  )
}
