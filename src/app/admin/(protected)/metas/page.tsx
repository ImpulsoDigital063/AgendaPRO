/**
 * /admin/metas — aba Metas (04/11/2026). Ver components/admin/metas/MetasView.
 *
 * Custo por abertura: metas (8 meses) e sonho do banco + painel do mês, mês
 * passado e meses fechados em cache (lib/metas/painel) + agenda em cache
 * (lib/metas/calculo) + sumidos (RPC) e aniversariantes quando a pessoa
 * pode ver Clientes. 05/11/2026: tela completa (8 blocos escolhidos pelo
 * Eduardo). Nenhuma tabela nova, só leitura.
 *
 * 06/11/2026 (protótipo): ?visual=A|B|C mostra a MESMA conta em 3 caminhos
 * de composição (MetasCaminhos) para o Eduardo escolher. Sem o parâmetro,
 * nada muda.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { acessoMetas } from '@/lib/metas/acesso'
import { montarMetas } from '@/lib/metas/montar'
import MetasView from '@/components/admin/metas/MetasView'
import MetasCaminhos, { type Visual } from '@/components/admin/metas/MetasCaminhos'

export const metadata = { title: 'Metas' }

export default async function MetasPage({ searchParams }: { searchParams: Promise<{ visual?: string }> }) {
  const acesso = await acessoMetas()
  if (!acesso) redirect('/admin/inicio?sem_acesso=1')
  const { visual: v } = await searchParams
  const visual: Visual | null = v === 'A' || v === 'B' || v === 'C' ? v : null
  const supabase = await createClient()
  const props = await montarMetas(supabase, acesso.business, acesso.podeClientes)
  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      {visual ? <MetasCaminhos {...props} visual={visual} /> : <MetasView {...props} />}
    </main>
  )
}
