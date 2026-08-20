import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import SubPageHeader from '@/components/admin/SubPageHeader'
import EmpresaDetalheView from '@/components/admin/convenios/EmpresaDetalheView'

export const dynamic = 'force-dynamic'

export default async function EmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, convenios_enabled')
    .eq('owner_id', user.id)
    .single()
  if (!business) redirect(await destinoSemNegocio())
  if (!business.convenios_enabled) notFound()

  const { data: empresa } = await supabase
    .from('companies')
    .select('id, business_id, name, cnpj, contato_nome, contato_telefone, contato_email, ativo')
    .eq('id', id)
    .eq('business_id', business.id)
    .maybeSingle()
  if (!empresa) notFound()

  const [{ data: profissionais }, { data: vinculados }, { data: funcionarios }] = await Promise.all([
    supabase
      .from('professionals')
      .select('id, name, active')
      .eq('business_id', business.id)
      .order('name'),
    supabase.from('company_professionals').select('professional_id').eq('company_id', empresa.id),
    supabase
      .from('customers')
      .select('id, name, phone')
      .eq('company_id', empresa.id)
      .order('name'),
  ])

  return (
    <>
      <SubPageHeader title={empresa.name} subtitle="Convênio" back="/admin/convenios" />
      <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-5xl lg:px-8">
        <EmpresaDetalheView
          businessId={business.id}
          empresa={empresa}
          profissionais={(profissionais ?? []).filter((p) => p.active !== false)}
          vinculadosIniciais={(vinculados ?? []).map((v) => v.professional_id)}
          funcionariosIniciais={funcionarios ?? []}
        />
      </div>
    </>
  )
}
