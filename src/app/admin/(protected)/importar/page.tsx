import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubPageHeader from '@/components/admin/SubPageHeader'
import ImportarView from '@/components/admin/ImportarView'

export default async function ImportarPage() {
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
    <>
      <SubPageHeader
        title="Importar dados"
        subtitle="Traga clientes de outro sistema"
        back="/admin"
      />
      <ImportarView businessId={business.id} businessName={business.name} />
    </>
  )
}
