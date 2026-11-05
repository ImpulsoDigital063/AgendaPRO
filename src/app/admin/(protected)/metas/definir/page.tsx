/**
 * /admin/metas/definir — definir/editar a meta em 2 passos (04/11/2026).
 *   ?passo=2      → só o sonho (link "Adicionar um sonho" / "Editar")
 *   ?mes=AAAA-MM  → meta do mês que vem (depois de bater a deste)
 *
 * A sugestão (6 meses de histórico pela régua do Hub) é calculada SÓ aqui,
 * nunca na abertura do Início ou da aba.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { addMonthsBR, monthBoundsBR, todayBR } from '@/lib/date-br'
import { resolveCategoria } from '@/lib/segmento'
import { acessoMetas } from '@/lib/metas/acesso'
import { agendaRestante, faturadoDoMes, nomeMes, sugestaoDeMeta } from '@/lib/metas/calculo'
import { nichoMetas } from '@/lib/metas/nichos'
import DefinirMeta from '@/components/admin/metas/DefinirMeta'

export const metadata = { title: 'Definir meta' }

export default async function DefinirMetaPage({ searchParams }: { searchParams: Promise<{ passo?: string; mes?: string }> }) {
  const acesso = await acessoMetas()
  if (!acesso) redirect('/admin/inicio?sem_acesso=1')
  const { business } = acesso
  const sp = await searchParams

  const hoje = todayBR()
  const atual = hoje.slice(0, 7)
  const proximo = addMonthsBR(`${atual}-01`, 1).slice(0, 7)
  const ym = sp.mes === proximo ? proximo : atual
  const soSonho = sp.passo === '2'
  const nicho = nichoMetas(resolveCategoria(business))
  const supabase = await createClient()

  const [{ data: meta }, { data: sonho }] = await Promise.all([
    supabase.from('metas_mes').select('valor').eq('business_id', business.id).eq('mes', `${ym}-01`).maybeSingle(),
    supabase.from('metas_sonho').select('id, titulo, custo, ate_mes, conquistado_em').eq('business_id', business.id).maybeSingle(),
  ])

  // sonho conquistado: o passo 2 começa um sonho novo (cofrinho do zero)
  const sonhoVivo = sonho && !sonho.conquistado_em ? sonho : null
  let guardado = 0
  if (sonhoVivo) {
    const { data: saldo } = await supabase.rpc('cofrinho_saldo', { p_sonho_id: sonhoVivo.id })
    guardado = Number(saldo ?? 0)
  }

  // Passo 1 só quando precisa: sugestão + quanto já entrou + dias que faltam
  // (ticket médio e agenda: UMA vez aqui; a conta por tecla é no navegador)
  let sugestao = null
  let faturado = 0
  let dias = 0
  let diasTrabalhoMes = 0
  let agendados = 0
  const { start: iniYm, end: fimYm } = monthBoundsBR(ym)
  const diasNoMes = Number(fimYm.slice(8, 10))
  if (!soSonho) {
    const [s, f, a, prox] = await Promise.all([
      sugestaoDeMeta(supabase, business.id, ym, hoje),
      ym === atual ? faturadoDoMes(business.id, ym, hoje) : Promise.resolve(0),
      agendaRestante(business.id, hoje),
      ym === atual
        ? Promise.resolve(null)
        : supabase.from('appointments').select('id', { count: 'exact', head: true })
          .eq('business_id', business.id).gte('appointment_date', iniYm).lte('appointment_date', fimYm)
          .not('status', 'in', '(cancelled,no_show)').is('paid_at', null).eq('historical', false),
    ])
    sugestao = s
    faturado = f
    dias = ym === atual ? a.diasAbertos.length : 0
    // mês que vem: usa o ritmo de dias de trabalho deste mês
    diasTrabalhoMes = a.diasAbertosMes
    agendados = ym === atual ? a.agendados : prox?.count ?? 0
  }

  // meses do "até quando": do mês atual a 24 meses à frente
  const mesesPrazo = Array.from({ length: 25 }, (_, i) => {
    const m = addMonthsBR(`${atual}-01`, i).slice(0, 7)
    return { ym: m, rotulo: `${nomeMes(m)} ${m.slice(0, 4)}` }
  })

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <DefinirMeta
        ym={ym}
        mesNome={nomeMes(ym)}
        passoInicial={soSonho ? 2 : 1}
        soSonho={soSonho}
        metaAtual={meta ? Number(meta.valor) : null}
        sugestao={sugestao}
        faturado={faturado}
        diasRestantes={dias}
        diasTrabalhoMes={diasTrabalhoMes}
        diasNoMes={diasNoMes}
        agendados={agendados}
        sonhoAtual={sonhoVivo ? {
          titulo: sonhoVivo.titulo as string,
          custo: sonhoVivo.custo !== null ? Number(sonhoVivo.custo) : null,
          ateMes: sonhoVivo.ate_mes ? String(sonhoVivo.ate_mes).slice(0, 7) : null,
        } : null}
        guardado={guardado}
        mesAtual={atual}
        mesesPrazo={mesesPrazo}
        nicho={{
          perguntaMeta: nicho.perguntaMeta,
          perguntaSonho: nicho.perguntaSonho,
          pular: nicho.pular,
          exemplosSonho: nicho.exemplosSonho,
          placeholderSonho: nicho.placeholderSonho,
          imagem: nicho.imagem,
        }}
      />
    </main>
  )
}
