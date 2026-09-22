/* ═══════════════════════════════════════════════════════════════
   O AVISO CHEGOU?

   Wanessa, 22/09/2026: "Onde vejo se o cliente recebeu msg de confirmação?"

   O dado sempre existiu — `message_log` guarda entregue_em, lido_em e a
   falha — mas nenhuma tela mostrava. A aba Avisos só contava quantas
   saíram, que é o gasto, não o resultado.

   Dois usos, uma regra de acesso:
     ?atendimento=<id> → o que foi enviado NAQUELE horário (ficha/agenda)
     sem parâmetro     → últimos avisos + placar do mês (aba Avisos)

   `message_log` tem RLS sem policy (quem escreve é o motor, sem sessão),
   então a leitura vai por service role DEPOIS do resolve de acesso — mesmo
   caminho da rota de respostas.
   ═══════════════════════════════════════════════════════════════ */

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resolveBusinessIdOperacao } from '@/lib/api-business-access'
import { rotuloDoAviso, situacaoDoAviso, ehResposta } from '@/lib/mensagens/rotulos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Linha = {
  id: string
  tipo: string
  status: string | null
  entregue_em: string | null
  lido_em: string | null
  falha_motivo: string | null
  created_at: string
  appointment_id: string | null
  customer_id: string | null
  destino: string | null
}

function admin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function traduzir(m: Linha, nome?: string | null) {
  return {
    id: m.id,
    tipo: m.tipo,
    rotulo: rotuloDoAviso(m.tipo),
    situacao: situacaoDoAviso(m),
    resposta: ehResposta(m.tipo),
    quando: m.created_at,
    entregueEm: m.entregue_em,
    lidoEm: m.lido_em,
    /* O motivo cru da Meta ("Message undeliverable") só serve pra suporte.
       Na tela vale a situação; o motivo vai junto pra eu conseguir explicar
       quando a dona perguntar por quê. */
    motivo: m.falha_motivo,
    cliente: nome ?? null,
    appointmentId: m.appointment_id,
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return NextResponse.json({ error: 'sem_acesso' }, { status: 403 })

  const db = admin()
  const atendimento = new URL(req.url).searchParams.get('atendimento')

  /* ─── Um atendimento só ─────────────────────────────────────── */
  if (atendimento) {
    const { data, error } = await db
      .from('message_log')
      .select('id, tipo, status, entregue_em, lido_em, falha_motivo, created_at, appointment_id, customer_id, destino')
      .eq('business_id', businessId)
      .eq('appointment_id', atendimento)
      .order('created_at', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ avisos: (((data ?? []) as Linha[])).map((m) => traduzir(m)) })
  }

  /* ─── Lista + placar ────────────────────────────────────────── */
  const desde = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const [{ data: recentes, error: e1 }, { data: doMes, error: e2 }, { data: confirmados }] =
    await Promise.all([
      db
        .from('message_log')
        .select('id, tipo, status, entregue_em, lido_em, falha_motivo, created_at, appointment_id, customer_id, destino')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(30),
      db
        .from('message_log')
        .select('tipo, status, entregue_em, lido_em')
        .eq('business_id', businessId)
        .gte('created_at', desde),
      /* Confirmação que a CLIENTE deu respondendo o WhatsApp. É o número que
         mostra pra que serviu o pacote — o resto é consumo. */
      db
        .from('appointments')
        .select('id')
        .eq('business_id', businessId)
        .gte('confirmado_em', desde),
    ])

  if (e1 || e2) return NextResponse.json({ error: (e1 ?? e2)!.message }, { status: 500 })

  const linhas = (recentes ?? []) as Linha[]

  /* Nome da cliente: a ficha manda, e o agendamento cobre quem ainda não tem
     ficha (avulso). Duas consultas em lote, não uma por linha. */
  const idsFicha = [...new Set(linhas.map((m) => m.customer_id).filter(Boolean))] as string[]
  const idsAtend = [...new Set(linhas.map((m) => m.appointment_id).filter(Boolean))] as string[]
  const [{ data: fichas }, { data: atends }] = await Promise.all([
    idsFicha.length
      ? db.from('customers').select('id, name').in('id', idsFicha)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    idsAtend.length
      ? db.from('appointments').select('id, client_name').in('id', idsAtend)
      : Promise.resolve({ data: [] as { id: string; client_name: string | null }[] }),
  ])
  const nomePorFicha = new Map((fichas ?? []).map((c) => [c.id, c.name]))
  const nomePorAtend = new Map((atends ?? []).map((a) => [a.id, a.client_name]))

  const mes = (doMes ?? []) as Pick<Linha, 'tipo' | 'status' | 'entregue_em' | 'lido_em'>[]
  const avisosDoMes = mes.filter((m) => !ehResposta(m.tipo))

  return NextResponse.json({
    avisos: linhas.map((m) =>
      traduzir(m, nomePorFicha.get(m.customer_id ?? '') ?? nomePorAtend.get(m.appointment_id ?? '') ?? null),
    ),
    placar: {
      /* Só o que a dona programou. Resposta automática é conversa e não entra
         no placar, senão o número infla sozinho e não quer dizer nada. */
      enviados: avisosDoMes.length,
      entregues: avisosDoMes.filter((m) => m.entregue_em).length,
      lidos: avisosDoMes.filter((m) => m.lido_em).length,
      falhas: avisosDoMes.filter((m) => m.status === 'falhou').length,
      confirmacoes: (confirmados ?? []).length,
      dias: 30,
    },
  })
}
