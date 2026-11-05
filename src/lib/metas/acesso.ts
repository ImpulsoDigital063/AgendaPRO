/* Quem vê a aba Metas: a dona e a gerente com a área "financeiro" liberada
   (v156). Mesma regra da policy pode_ver_metas (v186) — o app confere antes
   pra nem montar a tela, o banco confere de novo em cada leitura/escrita. */
import { getAdminAccess, getCurrentBusiness, getCurrentUser } from '@/lib/admin-data'

export type AcessoMetas = {
  userId: string
  business: Record<string, unknown> & { id: string; name: string; owner_id: string; category?: string | null; description?: string | null }
  /** a gerente pode abrir Sumidos? (área clientes) */
  podeClientes: boolean
}

export async function acessoMetas(): Promise<AcessoMetas | null> {
  const user = await getCurrentUser()
  if (!user) return null
  const business = await getCurrentBusiness(user.id)
  if (!business) return null
  const acesso = await getAdminAccess(user.id)
  if (!acesso) return null
  if (acesso.bloqueadas.includes('financeiro')) return null
  return {
    userId: user.id,
    business: business as AcessoMetas['business'],
    podeClientes: !acesso.bloqueadas.includes('clientes'),
  }
}
