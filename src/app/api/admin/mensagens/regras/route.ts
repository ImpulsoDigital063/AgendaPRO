/* Regras de mensagem automática do negócio — leitura e gravação pelo painel.
   A dona liga o que quiser; sem linha no banco, vale o padrão do código
   (tudo desligado). Só dono ou recepção: é comunicação em nome do salão. */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveBusinessIdOperacao } from '@/lib/api-business-access'
import { PADRAO, type TipoMensagem } from '@/lib/mensagens/tipos'
import { credencialDoSistema } from '@/lib/mensagens/canal-whatsapp'

/* Só os gatilhos que a varredura JÁ executa. Mostrar interruptor de coisa
   não implementada é prometer na tela o que o motor não faz — o dono liga,
   nada acontece, e ele para de confiar no resto que funciona. */
const DISPONIVEIS: TipoMensagem[] = [
  'confirmacao',
  'lembrete_vespera',
  'lembrete_dia',
  'aniversario',
  'dono_novo_agendamento',
]

export async function GET() {
  const supabase = await createClient()
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return NextResponse.json({ error: 'sem_acesso' }, { status: 403 })

  const { data } = await supabase
    .from('message_rules')
    .select('tipo, enabled, offset_minutos, hora_do_dia, retorno_dias')
    .eq('business_id', businessId)

  const porTipo = new Map((data ?? []).map((r) => [r.tipo, r]))

  return NextResponse.json({
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
