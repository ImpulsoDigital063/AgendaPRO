/* Monta as props da aba Metas (05/11/2026). Saiu de dentro da página pra a
   prova local renderizar a MESMA conta com outro cliente do Supabase: a
   página passa a sessão da pessoa (RLS v186), a prova passa o service role. */
import type { SupabaseClient } from '@supabase/supabase-js'
import { addDaysBR, addMonthsBR, monthBoundsBR, todayBR } from '@/lib/date-br'
import { resolveCategoria } from '@/lib/segmento'
import { agendaRestante, nomeMes } from '@/lib/metas/calculo'
import { escolherAcoes } from '@/lib/metas/acao'
import { faturadoMesFechado, mesesAnteriores, mesPassadoAteDia, painelDoMes, ritmoEsperado } from '@/lib/metas/painel'
import { nichoMetas } from '@/lib/metas/nichos'
import type { MetasViewProps } from '@/components/admin/metas/MetasView'
import type { Movimento } from '@/components/admin/metas/Cofrinho'

type Negocio = Parameters<typeof resolveCategoria>[0] & { id: string; name: string }

export async function montarMetas(supabase: SupabaseClient, business: Negocio, podeClientes: boolean): Promise<MetasViewProps & { mesAtual: string }> {
  const hoje = todayBR()
  const ym = hoje.slice(0, 7)
  const proximoYm = addMonthsBR(`${ym}-01`, 1).slice(0, 7)
  const nicho = nichoMetas(resolveCategoria(business))

  const anteriores = mesesAnteriores(ym, 6)
  const [{ data: metas }, { data: sonho }, painel, agenda, mesPassado, feitos] = await Promise.all([
    supabase.from('metas_mes').select('mes, valor, ticket_medio').eq('business_id', business.id).in('mes', [...anteriores, ym, proximoYm].map((m) => `${m}-01`)),
    supabase.from('metas_sonho').select('id, titulo, custo, ate_mes, desde_mes, conquistado_em').eq('business_id', business.id).maybeSingle(),
    painelDoMes(business.id, ym, hoje),
    agendaRestante(business.id, hoje),
    mesPassadoAteDia(business.id, hoje),
    Promise.all(anteriores.map((m) => faturadoMesFechado(business.id, m))),
  ])
  const faturado = painel.faturado
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

  // Sumidos e aniversariantes da semana: só pra quem pode abrir Clientes
  // (gerente sem a área não veria a tela do botão)
  let sumidos: number | null = null
  let aniversariantes: number | null = null
  if (podeClientes) {
    // aniversário: MM-DD de hoje até daqui 6 dias, no dia BR (mesmo critério
    // do cartão "Aniversariantes da semana" do Início)
    const semana = new Set(Array.from({ length: 7 }, (_, i) => addDaysBR(hoje, i).slice(5, 10)))
    const [{ data: ultimos }, { data: comAniversario }] = await Promise.all([
      supabase.rpc('ultimo_agendamento_clientes', { p_business_id: business.id }),
      supabase.from('customers').select('birthday').eq('business_id', business.id).not('birthday', 'is', null).range(0, 4999),
    ])
    const corte = addDaysBR(hoje, -nicho.diasSumido)
    sumidos = ((ultimos ?? []) as { ultima: string | null }[]).filter((r) => r.ultima && r.ultima < corte).length
    aniversariantes = ((comAniversario ?? []) as { birthday: string | null }[]).filter((c) => typeof c.birthday === 'string' && semana.has(c.birthday.slice(5, 10))).length
  }

  const acoes = escolherAcoes({
    amanha: addDaysBR(hoje, 1),
    bateu,
    proximoMesSemMeta: metaProx ? null : { ym: proximoYm, nome: nomeMes(proximoYm) },
    proximoDia: agenda.proximoDia,
    sumidos,
    aniversariantes,
    nicho,
  })

  const metaDoMes = (m: string) => {
    const linha = (metas ?? []).find((x) => String(x.mes).startsWith(m))
    return linha ? Number(linha.valor) : null
  }
  const historico = anteriores.map((m, i) => ({ ym: m, meta: metaDoMes(m), feito: feitos[i] }))
  const previsao = painel.agendadoAteFim > 0 ? Math.round((faturado + painel.agendadoAteFim) * 100) / 100 : null

  // sem horário cadastrado: cai nos dias corridos até o fim do mês
  const fimMes = monthBoundsBR(ym).end
  const diasRestantes = agenda.diasAbertos.length || Math.round((Date.parse(fimMes) - Date.parse(hoje)) / 86400000) + 1

  return {
    negocio: business.name,
    tom: nicho.tom,
    bateuTexto: nicho.bateu,
    imagemSonho: nicho.imagem,
    mesNome: nomeMes(ym),
    mesAtual: ym,
    meta: valorMeta,
    faturado: faturado,
    diasRestantes: diasRestantes,
    acoes: acoes,
    ritmo: valorMeta ? ritmoEsperado(valorMeta, hoje, agenda.diasAbertosMes, agenda.diasAbertos) : null,
    previsao: previsao,
    comparacao: mesPassado.valor > 0 ? { nomeMes: nomeMes(mesPassado.ym), dia: Number(mesPassado.ateDia.slice(8, 10)), valor: mesPassado.valor } : null,
    composicao: { servicos: painel.servicos, produtos: painel.produtos, outros: painel.outros, atendimentos: painel.atendimentos, ticketMedio: painel.ticketMedio },
    acumulado: painel.acumulado,
    diasNoMes: Number(fimMes.slice(8, 10)),
    topServicos: painel.topServicos,
    historico: historico,
    sonho: sonho ? {
          titulo: sonho.titulo as string,
          custo: sonho.custo !== null ? Number(sonho.custo) : null,
          ateMes: sonho.ate_mes ? String(sonho.ate_mes).slice(0, 7) : null,
          desdeMes: String(sonho.desde_mes).slice(0, 7),
          saldo,
          movimentos,
          conquistado: !!sonho.conquistado_em,
        } : null,
    ticket: metaMes?.ticket_medio ? Number(metaMes.ticket_medio) : null,
  }
}
