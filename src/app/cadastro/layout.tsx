import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'

/**
 * Guarda server-side: usuario logado que JA tem business nao deveria estar
 * em /cadastro. Sem isso, race condition pos-pagamento (webhook + refresh)
 * pode jogar cliente aqui e ele cria UM SEGUNDO business — quebra tudo.
 *
 * Caso real: Erlane pagou PIX → webhook chegou → polling triggera refresh →
 * /admin/(protected) momentaneamente acha business=null e redireciona pra
 * /cadastro. Sem essa guarda ela criava negocio duplicado. Cravado 07/05/2026.
 */
export default async function CadastroLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (user) {
    const business = await getCurrentBusiness(user.id)
    if (business) {
      redirect('/admin')
    }
  }
  return <>{children}</>
}
