import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ContaView from './ContaView'

export default async function ContaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  const { data: professional } = await supabase
    .from('professionals')
    .select('id, name, email, photo_url, employment_type')
    .eq('auth_user_id', user.id)
    .single()

  if (!professional) redirect('/admin')

  return (
    <ContaView
      name={professional.name}
      email={professional.email ?? user.email ?? ''}
      photoUrl={professional.photo_url}
      employmentType={(professional.employment_type ?? 'commissioned') as 'commissioned' | 'employed'}
    />
  )
}
