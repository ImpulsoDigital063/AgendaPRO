/* ═══════════════════════════════════════════════════════════════
   VARREDURA DE MENSAGENS — roda de hora em hora

   Por que de hora em hora e por que FORA da Vercel:
   um cron diário não consegue avisar "3 horas antes" de horários
   espalhados das 8h às 19h. Medido em 07/08: nos últimos 14 dias, os crons
   `reminder-1h` e `reminder-3h` marcaram ZERO agendamentos — às 6h da
   manhã, quando rodam, quase nenhum atendimento está a uma hora de
   distância. Nunca funcionaram na vida real. No Hobby não existe cron
   horário, então quem chama é o GitHub Action, como já acontece com o
   monitor. Custo zero.

   LOTE FIXO por invocação: a função tem 10s de padrão e 60s de teto no
   Hobby. Mandar 50 mensagens em sequência estoura e morre no meio — metade
   da fila sem enviar, ninguém sabendo. Cada chamada manda até LOTE e
   devolve quantas restam; quem chama repete até zerar. Escala por número de
   chamadas, não por duração.

   PRIMEIRA CONSULTA É A DAS REGRAS, e ela decide se o resto acontece.
   Hoje ninguém ligou nada: a varredura faz UMA consulta por hora e volta.
   Sem isso, seriam dezenas de leituras por hora pra descobrir que não há
   nada a fazer — que é exatamente o tipo de desperdício que consome cota
   de plano free sem entregar nada.
   ═══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { enviar } from '@/lib/mensagens/enviar'
import { chaveIdempotencia, PADRAO, type Regra, type TipoMensagem } from '@/lib/mensagens/tipos'
import { todayBR, addDaysBR } from '@/lib/date-br'
import { sendAlert } from '@/lib/alert'

export const runtime = 'nodejs'
export const maxDuration = 60

const LOTE = 20
/* Janela de 2h, não de 1h, mesmo rodando de hora em hora: o cron do GitHub
   atrasa e às vezes pula execução. Com janela justa, o atraso faz o lembrete
   NÃO SAIR e ninguém percebe; com folga ele sai um pouco atrasado, que é
   sempre melhor. Mandar duas vezes não é risco: a chave é UNIQUE. */
const JANELA = 2 * 60 * 60 * 1000

function instanteDo(data: string, hora: string): number {
  return new Date(`${data}T${(hora || '00:00').slice(0, 5)}:00-03:00`).getTime()
}

function dataCurta(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(y, m - 1, d, 12)
  const semana = dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  return `${semana}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

type Tarefa = {
  tipo: TipoMensagem
  businessId: string
  chave: string
  telefone: string | null
  email: string | null
  appointmentId?: string
  customerId?: string
  variaveis: Parameters<typeof enviar>[1]['variaveis']
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
  const horaBR = Number(new Date(agora - 3 * 3600_000).toISOString().slice(11, 13))

  /* TODAS as regras ligadas, de uma vez. A versão anterior consultava a
     regra dentro do laço, por agendamento e por tipo — N+1 clássico, que
     numa varredura de hora em hora vira milhares de leituras por dia pra
     ler sempre as mesmas poucas linhas. */
  const { data: regrasDb, error: errRegras } = await db
    .from('message_rules')
    .select('business_id, tipo, enabled, offset_minutos, hora_do_dia, retorno_dias, template')
    .eq('enabled', true)
  if (errRegras) return NextResponse.json({ error: errRegras.message }, { status: 500 })

  const regras = new Map<string, Regra>()
  for (const r of regrasDb ?? []) {
    regras.set(`${r.business_id}:${r.tipo}`, {
      tipo: r.tipo as TipoMensagem,
      enabled: true,
      offsetMinutos: Number(r.offset_minutos ?? PADRAO[r.tipo as TipoMensagem].offsetMinutos),
      horaDoDia: String(r.hora_do_dia ?? '09:00').slice(0, 5),
      retornoDias: r.retorno_dias ?? null,
      template: r.template ?? null,
    })
  }

  if (regras.size === 0) {
    return NextResponse.json({ ok: true, sem_regra_ligada: true, candidatos: 0, restam: 0 })
  }

  const negociosCom = (tipo: TipoMensagem) =>
    [...regras.keys()].filter((k) => k.endsWith(`:${tipo}`)).map((k) => k.split(':')[0])

  const fila: Tarefa[] = []
  const hoje = todayBR()
  const amanha = addDaysBR(hoje, 1)

  // ── LEMBRETES (véspera e do dia) ──────────────────────────────
  const negLembrete = [...new Set([...negociosCom('lembrete_vespera'), ...negociosCom('lembrete_dia')])]
  if (negLembrete.length > 0) {
    const { data: appts } = await db
      .from('appointments')
      .select(`id, business_id, appointment_date, start_time, client_name, client_phone,
               client_email, service_name, customer_id,
               business:businesses(name, phone), professional:professionals(name)`)
      .in('business_id', negLembrete)
      .in('appointment_date', [hoje, amanha])
      .in('status', ['pending', 'confirmed'])

    for (const a of appts ?? []) {
      const negocio = a.business as unknown as { name: string; phone: string | null } | null
      const prof = a.professional as unknown as { name: string } | null
      const quando = instanteDo(a.appointment_date as string, a.start_time as string)

      for (const tipo of ['lembrete_vespera', 'lembrete_dia'] as const) {
        const regra = regras.get(`${a.business_id}:${tipo}`)
        if (!regra) continue
        const alvo = quando + regra.offsetMinutos * 60_000
        if (!(alvo <= agora && agora < alvo + JANELA)) continue

        fila.push({
          tipo, businessId: a.business_id as string,
          chave: chaveIdempotencia(tipo, a.id as string),
          telefone: a.client_phone as string | null,
          email: a.client_email as string | null,
          appointmentId: a.id as string,
          customerId: (a.customer_id as string) ?? undefined,
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
      }
    }
  }

  // ── CONFIRMAÇÃO e AVISO PRO DONO (agendamento novo) ───────────
  //
  // Pela varredura, e não por chamada na hora de marcar, de propósito: o
  // painel insere o agendamento direto do navegador (AgendarModal), e ~90%
  // dos agendamentos da base são o próprio dono marcando. Pendurar o aviso
  // no navegador é o erro que já foi corrigido uma vez aqui — se ele fecha
  // a tela, ninguém é avisado. Varrendo por `created_at`, todo caminho de
  // criação fica coberto sem tocar em nenhum deles.
  const negNovo = [...new Set([...negociosCom('confirmacao'), ...negociosCom('dono_novo_agendamento')])]
  if (negNovo.length > 0) {
    const { data: novos } = await db
      .from('appointments')
      .select(`id, business_id, appointment_date, start_time, client_name, client_phone,
               client_email, service_name, customer_id,
               business:businesses(name, phone, owner_id), professional:professionals(name)`)
      .in('business_id', negNovo)
      .gte('created_at', new Date(agora - JANELA).toISOString())
      .in('status', ['pending', 'confirmed'])

    for (const a of novos ?? []) {
      const negocio = a.business as unknown as { name: string; phone: string | null } | null
      const prof = a.professional as unknown as { name: string } | null
      const v = {
        cliente: (a.client_name as string) || 'Cliente',
        salao: negocio?.name ?? 'seu salão',
        data: dataCurta(a.appointment_date as string),
        hora: String(a.start_time).slice(0, 5),
        servico: (a.service_name as string) || 'seu atendimento',
        telefoneSalao: negocio?.phone ?? null,
        profissional: prof?.name,
      }

      if (regras.has(`${a.business_id}:confirmacao`)) {
        fila.push({
          tipo: 'confirmacao', businessId: a.business_id as string,
          chave: chaveIdempotencia('confirmacao', a.id as string),
          telefone: a.client_phone as string | null,
          email: a.client_email as string | null,
          appointmentId: a.id as string,
          customerId: (a.customer_id as string) ?? undefined,
          variaveis: v,
        })
      }
      /* O aviso pro dono vai pro telefone do NEGÓCIO. Quem já ativou o push
         não entra aqui — receber a mesma coisa por dois canais faz o dono
         desligar os dois. Esse filtro entra junto com o canal ligado. */
      if (regras.has(`${a.business_id}:dono_novo_agendamento`) && negocio?.phone) {
        fila.push({
          tipo: 'dono_novo_agendamento', businessId: a.business_id as string,
          chave: chaveIdempotencia('dono_novo_agendamento', a.id as string),
          telefone: negocio.phone, email: null,
          appointmentId: a.id as string,
          variaveis: v,
        })
      }
    }
  }

  // ── ANIVERSÁRIO ───────────────────────────────────────────────
  const negAniversario = negociosCom('aniversario').filter((b) => {
    const r = regras.get(`${b}:aniversario`)!
    return Number(r.horaDoDia.slice(0, 2)) === horaBR
  })
  if (negAniversario.length > 0) {
    const [, mes, dia] = hoje.split('-')
    const ano = hoje.slice(0, 4)
    const { data: clientes } = await db
      .from('customers')
      .select('id, name, phone, email, birthday, business_id, business:businesses(name, phone)')
      .in('business_id', negAniversario)
      .not('birthday', 'is', null)

    for (const c of clientes ?? []) {
      const b = String(c.birthday)
      if (b.slice(5, 7) !== mes || b.slice(8, 10) !== dia) continue
      const negocio = c.business as unknown as { name: string; phone: string | null } | null
      fila.push({
        tipo: 'aniversario', businessId: c.business_id as string,
        // Uma vez por ano por cliente — a chave carrega o ano.
        chave: chaveIdempotencia('aniversario', c.id as string, ano),
        telefone: c.phone as string | null,
        email: c.email as string | null,
        customerId: c.id as string,
        variaveis: {
          cliente: (c.name as string) || 'Cliente',
          salao: negocio?.name ?? 'seu salão',
          data: dataCurta(hoje), hora: '', servico: '',
          telefoneSalao: negocio?.phone ?? null,
        },
      })
    }
  }

  /* ── RETORNO POR PROCEDIMENTO ──────────────────────────────────
     Especificação da clínica (10/08): cada procedimento tem um intervalo
     mínimo próprio, e o aviso deve dizer a DATA do último procedimento e que
     já pode repetir. Por isso o prazo mora em services.retorno_dias (v123) e
     não em message_rules — um número por negócio não distingue toxina
     (4 meses) de microagulhamento (15 dias).

     Duas travas que evitam a mensagem constrangedora:
     1. só dispara pra atendimento CONCLUÍDO — agendamento cancelado não gera
        "já pode repetir" de um procedimento que não aconteceu;
     2. some se a cliente JÁ voltou pra esse mesmo procedimento depois — nada
        pior que cobrar retorno de quem acabou de sair de lá. */
  const negRetorno = negociosCom('retorno').filter((b) => {
    const r = regras.get(`${b}:retorno`)!
    return Number(r.horaDoDia.slice(0, 2)) === horaBR
  })
  if (negRetorno.length > 0) {
    const { data: servicos } = await db
      .from('services')
      .select('id, business_id, name, retorno_dias')
      .in('business_id', negRetorno)
      .not('retorno_dias', 'is', null)

    const prazos = (servicos ?? []).filter((s) => Number(s.retorno_dias) > 0)
    if (prazos.length > 0) {
      // (serviço, data em que o intervalo fecha hoje)
      const alvoPorServico = new Map<string, string>()
      for (const s of prazos) alvoPorServico.set(s.id as string, addDaysBR(hoje, -Number(s.retorno_dias)))
      const datas = [...new Set(alvoPorServico.values())]

      const { data: feitos } = await db
        .from('appointments')
        .select(`id, business_id, appointment_date, client_name, client_phone, client_email,
                 service_id, service_name, customer_id, business:businesses(name, phone)`)
        .in('business_id', negRetorno)
        .in('service_id', [...alvoPorServico.keys()])
        .in('appointment_date', datas)
        .eq('status', 'completed')

      // só interessa quem casa serviço COM a data daquele serviço
      const candidatos = (feitos ?? []).filter(
        (a) => alvoPorServico.get(a.service_id as string) === a.appointment_date,
      )

      /* "já voltou?" numa consulta só, não uma por candidato: N+1 aqui
         significa uma consulta por cliente todo dia, pra sempre.

         GUARDA A DATA MAIS RECENTE, não um simples "existe". Com um corte
         global (a data-alvo mais antiga entre todos os serviços) o próprio
         atendimento candidato caía dentro da janela e se auto-suprimia: a
         toxina, de 120 dias, escapava, e o microagulhamento, de 15, nunca
         avisava. Comparar contra a data DO CANDIDATO resolve os dois. */
      const ultimaVolta = new Map<string, string>()
      if (candidatos.length > 0) {
        const maisAntiga = datas.slice().sort()[0]
        const { data: posteriores } = await db
          .from('appointments')
          .select('customer_id, service_id, appointment_date, status')
          .in('business_id', negRetorno)
          .in('service_id', [...alvoPorServico.keys()])
          .gte('appointment_date', maisAntiga)
          .in('status', ['completed', 'confirmed', 'pending'])
        for (const p of posteriores ?? []) {
          if (!p.customer_id) continue
          const k = `${p.customer_id}:${p.service_id}`
          const d = String(p.appointment_date)
          if (!ultimaVolta.has(k) || d > ultimaVolta.get(k)!) ultimaVolta.set(k, d)
        }
      }

      for (const a of candidatos) {
        const ultima = a.customer_id ? ultimaVolta.get(`${a.customer_id}:${a.service_id}`) : undefined
        if (ultima && ultima > String(a.appointment_date)) continue
        const negocio = a.business as unknown as { name: string; phone: string | null } | null
        fila.push({
          tipo: 'retorno',
          businessId: a.business_id as string,
          // um aviso por atendimento concluído — nunca repete pro mesmo
          chave: chaveIdempotencia('retorno', a.id as string),
          telefone: a.client_phone as string | null,
          email: a.client_email as string | null,
          appointmentId: a.id as string,
          customerId: (a.customer_id as string) ?? undefined,
          variaveis: {
            cliente: (a.client_name as string) || 'Cliente',
            salao: negocio?.name ?? 'seu salão',
            data: dataCurta(a.appointment_date as string),
            hora: '',
            servico: (a.service_name as string) || 'seu procedimento',
            telefoneSalao: negocio?.phone ?? null,
          },
        })
      }
    }
  }

  // ── ENVIO (lote) ──────────────────────────────────────────────
  const lote = fila.slice(0, LOTE)
  let enviados = 0, ignorados = 0, falhas = 0
  /* POR QUE FOI IGNORADO. As travas mais duras (conta demo, assinatura
     bloqueada, regra desligada) devolvem ANTES de gravar no message_log — de
     propósito, pra não encher a tabela de linha de mensagem que nunca teve
     chance. O efeito colateral é que a conta bloqueada para de avisar as
     clientes dela e não sobra rastro nenhum: o dono reclama que "o sistema
     parou" e ninguém consegue dizer por quê. O motivo agregado sai aqui, que
     é o que o monitor lê. */
  const motivos: Record<string, number> = {}

  for (const t of lote) {
    const r = await enviar(db, {
      businessId: t.businessId, tipo: t.tipo, chave: t.chave,
      destino: { telefone: t.telefone, email: t.email },
      appointmentId: t.appointmentId ?? null,
      customerId: t.customerId ?? null,
      variaveis: t.variaveis,
    })
    if (r.status === 'enviado') enviados++
    else if (r.status === 'ignorado') { ignorados++; motivos[r.motivo ?? 'sem_motivo'] = (motivos[r.motivo ?? 'sem_motivo'] ?? 0) + 1 }
    else { falhas++; const q = 'erro' in r ? r.erro : 'falha'; motivos[q] = (motivos[q] ?? 0) + 1 }
  }

  /* SESSAO CAIDA AVISA. O aparelho do numero remetente vive desligado e vai
     ser ligado ~1x por semana (Eduardo, 07/08). O WhatsApp derruba a sessao
     conectada se o aparelho principal nao aparecer em ~14 dias - e quando
     isso acontece TODOS os envios passam a falhar em silencio. Ninguem
     descobre ate uma cliente reclamar que nao foi avisada.

     Regra: lote inteiro falhando = problema de canal, nao de destinatario.
     Um numero errado falha sozinho; a sessao caida falha tudo. Vai pro
     mesmo Telegram que ja recebe o monitor. */
  if (lote.length >= 3 && falhas === lote.length) {
    await sendAlert(
      `🔴 MENSAGENS: ${falhas} envios falharam seguidos.
` +
      `Provavel sessao do WhatsApp caida — ligar o aparelho do numero remetente e reconectar no painel da W-API.`,
    )
  }

  return NextResponse.json({
    ok: true,
    hora_br: new Date(agora - 3 * 3600_000).toISOString().slice(0, 16).replace('T', ' '),
    regras_ligadas: regras.size,
    candidatos: fila.length,
    processados: lote.length,
    enviados, ignorados, falhas,
    motivos,
    restam: Math.max(0, fila.length - lote.length),
  })
}
