/* Regras de mensagem automática do negócio — leitura e gravação pelo painel.
   A dona liga o que quiser; sem linha no banco, vale o padrão do código
   (tudo desligado). Só dono ou recepção: é comunicação em nome do salão. */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveBusinessIdOperacao } from '@/lib/api-business-access'
import { corpoEditavel } from '@/lib/mensagens/textos'
import { PADRAO, type TipoMensagem } from '@/lib/mensagens/tipos'
import { credencialDoSistema } from '@/lib/mensagens/canal-cloud'
import { unidadesDaFranquia } from '@/lib/mensagens/templates-cloud'
import { consumoDoMes } from '@/lib/mensagens/franquia'

/* Só os gatilhos que a varredura JÁ executa. Mostrar interruptor de coisa
   não implementada é prometer na tela o que o motor não faz — o dono liga,
   nada acontece, e ele para de confiar no resto que funciona. */
/* SEM AVISO PRO DONO (Eduardo, 21/08). Ele ja recebe push do navegador
   quando entra agendamento novo — mandar a mesma noticia por WhatsApp e
   como se ensina o dono a desligar os dois canais. Os tipos dono_* seguem
   no motor, so nao aparecem pra ligar. */
const DISPONIVEIS: TipoMensagem[] = [
  'confirmacao',
  'lembrete_vespera',
  'lembrete_dia',
  'aniversario',
]

export async function GET() {
  const supabase = await createClient()
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return NextResponse.json({ error: 'sem_acesso' }, { status: 403 })

  const { data } = await supabase
    .from('message_rules')
    .select('tipo, enabled, offset_minutos, hora_do_dia, retorno_dias, template, com_botao')
    .eq('business_id', businessId)

  const porTipo = new Map((data ?? []).map((r) => [r.tipo, r]))

  /* QUANTO CADA AVISO CUSTA DO PACOTE DELA.
     ─────────────────────────────────────────────────────────────
     Sem este número, ela liga o aniversário sem saber que cada mensagem
     gasta 7 do pacote — e descobre na fatura. O consumo é dela, então a
     conta tem que estar do lado do interruptor, não num documento.

     Movimento real dos últimos 90 dias, não média de mercado. */
  const de = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10)
  const [{ count: atend90 }, { count: clientes }, consumo] = await Promise.all([
    supabase.from('appointments').select('id', { count: 'exact', head: true })
      .eq('business_id', businessId).gte('appointment_date', de),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
    consumoDoMes(supabase, businessId).catch(() => null),
  ])
  const atendimentosMes = Math.round((atend90 ?? 0) / 3)
  /* Aniversário e retorno são por CLIENTE, não por atendimento: espalham no
     ano, então é a base dividida por 12. */
  const porClienteMes = Math.round((clientes ?? 0) / 12)

  const unidadesDoAviso = (tipo: TipoMensagem) => {
    const peso = unidadesDaFranquia(tipo)
    const quantas = tipo === 'aniversario' || tipo === 'retorno' ? porClienteMes : atendimentosMes
    return quantas * peso
  }

  return NextResponse.json({
    consumo: consumo
      ? { usadas: consumo.usadas, franquia: consumo.franquia, saldo: consumo.saldo, temPacote: !!consumo.pacote }
      : null,
    atendimentosMes,
    /* A tela precisa saber ANTES de a dona ligar: sem canal, ligar não
       manda nada. Deixar ela descobrir sozinha depois de uma semana é o
       jeito mais rápido de queimar a confiança na funcionalidade. */
    canal_ligado: credencialDoSistema() !== null,
    regras: DISPONIVEIS.map((tipo) => {
      const r = porTipo.get(tipo)
      return {
        tipo,
        enabled: r?.enabled === true,
        offsetMinutos: Number(r?.offset_minutos ?? PADRAO[tipo].offsetMinutos),
        horaDoDia: String(r?.hora_do_dia ?? PADRAO[tipo].horaDoDia).slice(0, 5),
        retornoDias: r?.retorno_dias ?? PADRAO[tipo].retornoDias,
        /* template = o que a dona escreveu; padrao = o que o sistema manda
           quando ela nao escreveu nada. A tela mostra o padrao no editor
           pra ela partir dele, e so grava template quando ela muda. */
        template: (r?.template as string | null) ?? null,
        padrao: corpoEditavel(tipo),
        comBotao: r?.com_botao !== false,
        /* Quantas unidades do pacote este aviso consome por mês, no
           movimento real dela. Marketing já vem multiplicado por 7. */
        unidadesPorMes: unidadesDoAviso(tipo),
        gasta7: unidadesDaFranquia(tipo) > 1,
      }
    }),
  })
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return NextResponse.json({ error: 'sem_acesso' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const tipo = body?.tipo as TipoMensagem
  if (!DISPONIVEIS.includes(tipo)) {
    return NextResponse.json({ error: 'tipo_invalido' }, { status: 400 })
  }

  /* Texto proprio. Vazio ou igual ao padrao volta pra null: assim a dona
     que apagou tudo recebe o texto do sistema de novo, em vez de mandar
     mensagem em branco pra cliente dela. */
  const bruto = typeof body?.template === 'string' ? body.template.trim() : null
  const template = !bruto || bruto === corpoEditavel(tipo).trim() ? null : bruto.slice(0, 1000)

  const offset = Number(body?.offsetMinutos)
  const hora = typeof body?.horaDoDia === 'string' ? body.horaDoDia.slice(0, 5) : null

  const { error } = await supabase.from('message_rules').upsert(
    {
      business_id: businessId,
      tipo,
      enabled: body?.enabled === true,
      offset_minutos: Number.isFinite(offset) ? offset : PADRAO[tipo].offsetMinutos,
      hora_do_dia: hora && /^\d{2}:\d{2}$/.test(hora) ? hora : PADRAO[tipo].horaDoDia,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'business_id,tipo' },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
