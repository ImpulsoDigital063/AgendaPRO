/**
 * /admin/metas — aba Metas (04/11/2026). Ver components/admin/metas/MetasView.
 *
 * Custo por abertura: metas (8 meses) e sonho do banco + painel do mês, mês
 * passado e meses fechados em cache (lib/metas/painel) + agenda em cache
 * (lib/metas/calculo) + sumidos (RPC) e aniversariantes quando a pessoa
 * pode ver Clientes. 05/11/2026: tela completa (8 blocos escolhidos pelo
 * Eduardo). Nenhuma tabela nova, só leitura.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { acessoMetas } from '@/lib/metas/acesso'
import { montarMetas } from '@/lib/metas/montar'
import MetasView from '@/components/admin/metas/MetasView'

export const metadata = { title: 'Metas' }

export default async function MetasPage() {
  const acesso = await acessoMetas()
  if (!acesso) redirect('/admin/inicio?sem_acesso=1')
  const supabase = await createClient()
  const props = await montarMetas(supabase, acesso.business, acesso.podeClientes)
  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <MetasView {...props} />
    </main>
  )
}
