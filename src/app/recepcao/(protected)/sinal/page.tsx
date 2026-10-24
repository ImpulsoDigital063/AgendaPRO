import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubPageHeader from '@/components/admin/SubPageHeader'
import SinalView from '@/components/admin/SinalView'

export const dynamic = 'force-dynamic'

/* v174 · Sinais a conferir na recepção (Ivna Loyola, 24/10/2026).
   A cliente manda o comprovante pro WhatsApp da clínica e quem confere é a
   recepção: aqui ela vê quem disse que pagou e marca "Recebi o sinal", o que
   confirma o horário. Só a lista: a configuração (com a chave PIX) é da dona. */
export default async function RecepSinalPage() {
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

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <SubPageHeader title="Sinais a conferir" subtitle={business.name} back="/recepcao" />
      <div className="max-w-lg mx-auto px-4 py-6 sm:max-w-3xl sm:px-6">
        <SinalView soLista />
      </div>
    </main>
  )
}
