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

  // v79 · select expandido pra alimentar tabs Perfil/Configurações
  const { data: prof, error: profErr } = await sb
    .from('professionals')
    .select(`
      id, name, email, default_commission_percent, is_receptionist, active, business_id,
      is_owner, is_manager, is_professional, is_attendant,
      does_appointments, sells_products, sells_packages,
      nickname, birth_date, cpf, instagram
    `)
    .eq('id', id)
    .maybeSingle()

  if (profErr) {
    console.error('[colaborador/[id]] erro:', profErr.message)
    notFound()
  }
  if (!prof || prof.business_id !== business.id) notFound()

  const [{ data: vouchers }, { data: salaries }, { data: appts }] = await Promise.all([
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
    // v79 Estágio 3 · histórico de atendimentos pra tab Atividades · últimos 60 dias
    sb
      .from('appointments')
      .select('id, appointment_date, start_time, client_name, service_name, total_price, status, paid_at')
      .eq('business_id', business.id)
      .eq('professional_id', id)
      .order('appointment_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(100),
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
              phone: null,
              default_commission_percent: Number(prof.default_commission_percent ?? 40),
              is_receptionist: prof.is_receptionist ?? false,
              active: prof.active ?? true,
              is_owner: !!prof.is_owner,
              is_manager: !!prof.is_manager,
              is_professional: prof.is_professional !== false,
              is_attendant: !!prof.is_attendant,
              does_appointments: prof.does_appointments !== false,
              sells_products: prof.sells_products !== false,
              sells_packages: prof.sells_packages !== false,
              nickname: prof.nickname ?? null,
              birth_date: prof.birth_date ?? null,
              cpf: prof.cpf ?? null,
              instagram: prof.instagram ?? null,
            }}
            initialVouchers={vouchers ?? []}
            initialSalaries={salaries ?? []}
            initialAppointments={(appts ?? []) as Array<{
              id: string
              appointment_date: string
              start_time: string
              client_name: string | null
              service_name: string | null
              total_price: number | null
              status: string
              paid_at: string | null
            }>}
          />
        </div>
      </div>
    </main>
  )
}
