/**
 * /admin/metas — aba Metas (04/11/2026). Ver components/admin/metas/MetasView.
 *
 * Custo por abertura: 2 leituras de 1 linha (meta, sonho) + faturado e agenda
 * em cache (lib/metas/calculo) + 1 RPC de sumidos (só quando a ação precisa).
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { addDaysBR, addMonthsBR, monthBoundsBR, todayBR } from '@/lib/date-br'
import { resolveCategoria } from '@/lib/segmento'
import { acessoMetas } from '@/lib/metas/acesso'
import { agendaRestante, faturadoDoMes, nomeMes } from '@/lib/metas/calculo'
import { escolherAcao } from '@/lib/metas/acao'
import { nichoMetas } from '@/lib/metas/nichos'
import MetasView from '@/components/admin/metas/MetasView'
import type { Movimento } from '@/components/admin/metas/Cofrinho'

export const metadata = { title: 'Metas' }

export default async function MetasPage() {
  const acesso = await acessoMetas()
  if (!acesso) redirect('/admin/inicio?sem_acesso=1')
  const { business, podeClientes } = acesso

  const supabase = await createClient()
  const hoje = todayBR()
  const ym = hoje.slice(0, 7)
  const proximoYm = addMonthsBR(`${ym}-01`, 1).slice(0, 7)
  const nicho = nichoMetas(resolveCategoria(business))

  const [{ data: metas }, { data: sonho }, faturado, agenda] = await Promise.all([
    supabase.from('metas_mes').select('mes, valor, ticket_medio').eq('business_id', business.id).in('mes', [`${ym}-01`, `${proximoYm}-01`]),
    supabase.from('metas_sonho').select('id, titulo, custo, ate_mes, desde_mes, conquistado_em').eq('business_id', business.id).maybeSingle(),
    faturadoDoMes(business.id, ym, hoje),
    agendaRestante(business.id, hoje),
  ])
  const metaMes = (metas ?? []).find((m) => String(m.mes).startsWith(ym))
  const metaProx = (metas ?? []).find((m) => String(m.mes).startsWith(proximoYm))
  const valorMeta = metaMes ? Number(metaMes.valor) : null
  const bateu = valorMeta !== null && faturado >= valorMeta

  // Cofrinho do sonho: saldo somado NO BANCO + últimos lançamentos
  let saldo = 0
  let movimentos: Movimento[] = []
  if (sonho) {
    const [{ data: s }, { data: movs }] = await Promise.all([
      supabase.rpc('cofrinho_saldo', { p_sonho_id: sonho.id }),
      supabase.from('metas_cofrinho').select('id, tipo, valor, motivo, criado_em').eq('sonho_id', sonho.id)
        .order('criado_em', { ascending: false }).order('id', { ascending: false }).limit(5),
    ])
    saldo = Number(s ?? 0)
    movimentos = ((movs ?? []) as Movimento[]).map((m) => ({ ...m, valor: Number(m.valor) }))
  }

  // Sumidos: só se a ação pode usar (gerente sem Clientes não abre a tela)
  let sumidos: number | null = null
  if (podeClientes && !(bateu && !metaProx)) {
    const { data: ultimos } = await supabase.rpc('ultimo_agendamento_clientes', { p_business_id: business.id })
    const corte = addDaysBR(hoje, -nicho.diasSumido)
    sumidos = ((ultimos ?? []) as { ultima: string | null }[]).filter((r) => r.ultima && r.ultima < corte).length
  }

  const acao = escolherAcao({
    amanha: addDaysBR(hoje, 1),
    bateu,
    proximoMesSemMeta: metaProx ? null : { ym: proximoYm, nome: nomeMes(proximoYm) },
    proximoDia: agenda.proximoDia,
    sumidos,
    nicho,
  })

  // sem horário cadastrado: cai nos dias corridos até o fim do mês
  const fimMes = monthBoundsBR(ym).end
  const diasRestantes = agenda.diasAbertos.length || Math.round((Date.parse(fimMes) - Date.parse(hoje)) / 86400000) + 1

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <MetasView
        negocio={business.name}
        tom={nicho.tom}
        bateuTexto={nicho.bateu}
        imagemSonho={nicho.imagem}
        mesNome={nomeMes(ym)}
        mesAtual={ym}
        meta={valorMeta}
        faturado={faturado}
        diasRestantes={diasRestantes}
        acao={acao}
        sonho={sonho ? {
          titulo: sonho.titulo as string,
          custo: sonho.custo !== null ? Number(sonho.custo) : null,
          ateMes: sonho.ate_mes ? String(sonho.ate_mes).slice(0, 7) : null,
          desdeMes: String(sonho.desde_mes).slice(0, 7),
          saldo,
          movimentos,
          conquistado: !!sonho.conquistado_em,
        } : null}
        ticket={metaMes?.ticket_medio ? Number(metaMes.ticket_medio) : null}
      />
    </main>
  )
}
