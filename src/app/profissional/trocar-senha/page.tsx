import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TrocarSenhaForm from './TrocarSenhaForm'

export default async function TrocarSenhaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/profissional/login')

  // Se já trocou a senha (não é mais primeiro acesso), manda pra tela "Conta"
  // dentro do app — evita reaparecer o copy de "senha temporária".
  const { data: professional } = await supabase
    .from('professionals')
    .select('password_changed')
    .eq('auth_user_id', user.id)
    .single()

  if (professional?.password_changed) {
    redirect('/profissional/conta')
  }

  return <TrocarSenhaForm />
}
