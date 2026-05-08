import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'

/**
 * Em LPs publicas (/, /barbearia, /salao, /estetica, /nail): se user JA
 * tem business, manda pra /admin imediatamente.
 *
 * Resolve 2 cenarios:
 * 1. Swipe-back iOS Safari: cliente em /admin/bloqueado faz gesto de voltar,
 *    cai em / (LP que visitou antes). Sem essa guarda, fica preso na LP.
 * 2. Cliente pago vendo LP de venda de novo: confunde, da margem pra
 *    "uai, posso pagar de novo?".
 */
export async function redirectIfLoggedIn() {
  const user = await getCurrentUser()
  if (!user) return

  const business = await getCurrentBusiness(user.id)
  if (business) {
    redirect('/admin')
  }
}
