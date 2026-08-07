/* ═══════════════════════════════════════════════════════════════
   VARREDURA DE MENSAGENS — roda de hora em hora

   Por que de hora em hora e por que FORA da Vercel:
   um cron diário não consegue avisar "3 horas antes" de horários
   espalhados das 8h às 19h. Medido em 07/08: nos últimos 14 dias, os crons
   `reminder-1h` e `reminder-3h` marcaram ZERO agendamentos — às 6h da
   manhã, quando rodam, quase nenhum atendimento está a uma hora de
   distância. Eles nunca funcionaram na vida real. Só o da véspera (diário
   por natureza) entrega.
   No Hobby não existe cron de hora em hora, então quem chama é o GitHub
   Action que já roda o monitor. Custo zero.

   LOTE FIXO por invocação, e isso não é detalhe: a função tem 10s de
   padrão e 60s de teto no Hobby. Mandar 50 mensagens em sequência estoura
   e morre no meio — metade da fila sem enviar, ninguém sabendo. Aqui cada
   chamada manda até LOTE e devolve `restam`; quem chama repete até zerar.
   Escala por número de chamadas, não por duração.
   ═══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { enviar, regraDe } from '@/lib/mensagens/enviar'
import { chaveIdempotencia, type TipoMensagem } from '@/lib/mensagens/tipos'
import { todayBR, addDaysBR } from '@/lib/date-br'

export const runtime = 'nodejs'
export const maxDuration = 60

const LOTE = 20

/** Instante do atendimento em UTC a partir da data e hora locais (BR, −03). */
function instanteDo(data: string, hora: string): number {
  return new Date(`${data}T${(hora || '00:00').slice(0, 5)}:00-03:00`).getTime()
}

/** "sex, 08/08" — como a cliente lê, não como o banco guarda. */
function dataCurta(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(y, m - 1, d, 12)
  const semana = dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  return `${semana}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'nao_autorizado' }, { status: 401 })
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const agora = Date.now()
  /* Janela de 2h, não de 1h, mesmo rodando de hora em hora: o cron do
     GitHub atrasa alguns minutos com frequência e às vezes pula execução.
     Com janela justa, um atraso faz o lembrete NÃO SAIR — e ninguém
     percebe. Com folga ele sai um pouco atrasado, que é sempre melhor. Não
     há risco de mandar duas vezes: a chave em message_log é UNIQUE. */
  const JANELA = 2 * 60 * 60 * 1000

  /* Só os dois dias que interessam. Lembrete da véspera olha amanhã, o do
     dia olha hoje — varrer a agenda inteira toda hora seria desperdício de
     leitura pra achar as mesmas dezenas de linhas. */
  const hoje = todayBR()
  const amanha = addDaysBR(hoje, 1)

  const { data: appts, error } = await db
    .from('appointments')
    .select(`
      id, business_id, appointment_date, start_time, status, client_name, client_phone,
      client_email, service_name, customer_id,
      business:businesses(name, phone),
      professional:professionals(name)
    `)
    .in('appointment_date', [hoje, amanha])
    .in('status', ['pending', 'confirmed'])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type Tarefa = {
    tipo: TipoMensagem
    appt: NonNullable<typeof appts>[number]
  }
  const fila: Tarefa[] = []

  for (const a of appts ?? []) {
    const quando = instanteDo(a.appointment_date as string, a.start_time as string)

    for (const tipo of ['lembrete_vespera', 'lembrete_dia'] as const) {
      const regra = await regraDe(db, a.business_id as string, tipo)
      if (!regra.enabled) continue

      /* Momento de disparar = horário do atendimento + offset (negativo).
         Manda se esse momento já passou e ainda está dentro da janela desta
         varredura. Fora da janela, deixa passar: lembrete atrasado de 6h é
         pior que lembrete nenhum — a cliente já saiu de casa ou já perdeu. */
      const alvo = quando + regra.offsetMinutos * 60_000
      if (alvo <= agora && agora < alvo + JANELA) fila.push({ tipo, appt: a })
    }
  }

  const lote = fila.slice(0, LOTE)
  let enviados = 0, ignorados = 0, falhas = 0

  for (const t of lote) {
    const a = t.appt
    const negocio = a.business as unknown as { name: string; phone: string | null } | null
    const prof = a.professional as unknown as { name: string } | null

    const r = await enviar(db, {
      businessId: a.business_id as string,
      tipo: t.tipo,
      chave: chaveIdempotencia(t.tipo, a.id as string),
      destino: { telefone: a.client_phone as string | null, email: a.client_email as string | null },
      appointmentId: a.id as string,
      customerId: (a.customer_id as string) ?? null,
      variaveis: {
        cliente: (a.client_name as string) || 'Cliente',
        salao: negocio?.name ?? 'seu salão',
        data: dataCurta(a.appointment_date as string),
        hora: String(a.start_time).slice(0, 5),
        servico: (a.service_name as string) || 'seu atendimento',
        telefoneSalao: negocio?.phone ?? null,
        profissional: prof?.name,
      },
    })

    if (r.status === 'enviado') enviados++
    else if (r.status === 'ignorado') ignorados++
    else falhas++
  }

  return NextResponse.json({
    ok: true,
    hora_br: new Date(agora - 3 * 3600_000).toISOString().slice(0, 16).replace('T', ' '),
    candidatos: fila.length,
    processados: lote.length,
    enviados,
    ignorados,
    falhas,
    /* Quem chamou repete enquanto isto for > 0. É assim que a operação
       cresce sem a invocação ficar mais longa. */
    restam: Math.max(0, fila.length - lote.length),
  })
}
