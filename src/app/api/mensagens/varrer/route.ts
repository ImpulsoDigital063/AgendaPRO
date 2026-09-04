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
import { confirmarAgendamento } from '@/lib/mensagens/confirmar'
import { chaveIdempotencia, PADRAO, type Regra, type TipoMensagem } from '@/lib/mensagens/tipos'
import { todayBR, addDaysBR } from '@/lib/date-br'
import { dataCurta } from '@/lib/mensagens/textos'
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
    .select('business_id, tipo, enabled, offset_minutos, hora_do_dia, retorno_dias, template, com_botao')
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
      comBotao: r.com_botao !== false,
      template: r.template ?? null,
    })
  }

  /* ── NEGÓCIOS QUE COBRAM SINAL ────────────────────────────────
     A cobrança de sinal NÃO tem linha em `message_rules` — quem a liga é
     `businesses.sinal_enabled` (ver `regraDe`). Então ela não aparece no
     mapa acima, e sem esta consulta um negócio que só cobra sinal, sem
     nenhuma régua ligada, nunca seria varrido: cairia no early-return
     abaixo e a cliente ficaria sem a cobrança pra sempre.

     É o mesmo buraco que obrigou o aviso de "sinal vencendo" a ter rota
     própria; aqui dá pra resolver dentro da varredura porque o custo é uma
     consulta a mais, só quando há o que fazer. */
  const { data: negSinalDb } = await db
    .from('businesses')
    .select('id')
    .eq('sinal_enabled', true)
  const negSinal = (negSinalDb ?? []).map((n) => n.id as string)

  if (regras.size === 0 && negSinal.length === 0) {
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
               client_email, service_name, customer_id, created_at,
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

        /* NAO LEMBRA DO QUE ACABOU DE SER MARCADO.
           Eduardo, 01/09: "porque veio 2?" — chegaram a confirmacao e o
           lembrete no mesmo minuto.

           Acontece com cliente de verdade: ela agenda as 17h para hoje as
           19h, e o alvo do lembrete de 3h (16h) ja passou. A confirmacao sai
           por ser agendamento novo e o lembrete sai por estar na janela. Ela
           le "seu horario ficou marcado" e, um segundo depois, "passando
           para lembrar que seu horario e hoje". Duas mensagens, duas
           unidades, e a segunda sem sentido nenhum.

           Se o agendamento foi criado DEPOIS da hora do lembrete, a
           confirmacao ja fez esse trabalho. */
        if (a.created_at && new Date(a.created_at as string).getTime() > alvo) continue

        fila.push({
          tipo, businessId: a.business_id as string,
          chave: chaveIdempotencia(tipo, a.id as string),
          telefone: a.client_phone as string | null,
          email: a.client_email as string | null,
          appointmentId: a.id as string,
          customerId: (a.customer_id as string) ?? undefined,
          variaveis: {
            cliente: (a.client_name as string) || 'Cliente',
            salao: negocio?.name ?? 'seu negócio',
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
  /* `negSinal` entra aqui porque a cobrança de sinal vive fora de
     `message_rules` — sem ele, negócio que cobra sinal e não ligou a
     confirmação não seria nem consultado. */
  const negNovo = [
    ...new Set([...negociosCom('confirmacao'), ...negociosCom('dono_novo_agendamento'), ...negSinal]),
  ]
  if (negNovo.length > 0) {
    const { data: novos } = await db
      .from('appointments')
      .select(`id, business_id, appointment_date, start_time, client_name, client_phone,
               client_email, service_name, customer_id, recurring_group_id, recurring_index,
               sinal_valor, sinal_pago_at, customer:customers(sinal_isento),
               business:businesses(name, phone, owner_id), professional:professionals(name)`)
      .in('business_id', negNovo)
      .gte('created_at', new Date(agora - JANELA).toISOString())
      .in('status', ['pending', 'confirmed'])

    for (const a of novos ?? []) {
      /* SERIE MANDA UMA CONFIRMACAO SO. Clinica que marca pacote de 10
         sessoes de uma vez (o caso do CAF) inseriria 10 linhas, e a cliente
         receberia 10 mensagens quase iguais em segundos — risco de bloqueio
         num numero que e' compartilhado por TODOS os negocios. Mesma guarda
         de `confirmarAgendamento`; aqui precisa existir de novo porque esta
         varredura monta a fila direto, sem passar pelo helper.
         Os LEMBRETES seguem por sessao: cada um avisa de um dia diferente. */
      const idx = a.recurring_index as number | null
      if (a.recurring_group_id && idx !== null && idx > 1) continue

      const negocio = a.business as unknown as { name: string; phone: string | null } | null
      const prof = a.professional as unknown as { name: string } | null
      const v = {
        cliente: (a.client_name as string) || 'Cliente',
        salao: negocio?.name ?? 'seu negócio',
        data: dataCurta(a.appointment_date as string),
        hora: String(a.start_time).slice(0, 5),
        servico: (a.service_name as string) || 'seu atendimento',
        telefoneSalao: negocio?.phone ?? null,
        profissional: prof?.name,
      }

      /* ── QUEM DEVE SINAL NÃO RECEBE CONFIRMAÇÃO (04/09) ─────────
         Esta varredura monta a fila à mão e, até aqui, mandava
         `confirmacao` pra todo mundo — inclusive pra quem ainda não pagou o
         sinal. Dizer "seu horário ficou marcado" pra quem deve é mentira, e
         o horário ainda pode cair.

         Delega em vez de montar a mensagem de sinal aqui: ela precisa de
         valor, prazo, token e dois botões, e duplicar essa montagem foi
         exatamente o que fez a rota do link público divergir e mentir por
         semanas. Uma fonte só — `confirmarAgendamento`.

         A chave de idempotência é a mesma dos dois lados, então rodar de
         hora em hora não manda duas vezes. */
      /* A isenção é coluna de `customers`, não de `appointments` — pedir
         `appointments.sinal_isento` faz o SELECT INTEIRO falhar e a varredura
         devolver zero candidato, derrubando junto a confirmação de todo
         mundo. Foi o que eu mesmo causei aqui algumas horas atrás, repetindo
         no arquivo ao lado o bug que estava corrigindo. */
      const deveSinal =
        Number(a.sinal_valor ?? 0) > 0 &&
        !a.sinal_pago_at &&
        (a.customer as unknown as { sinal_isento?: boolean } | null)?.sinal_isento !== true

      if (deveSinal) {
        /* Sem `continue`: o aviso pro DONO é outra mensagem, pra outro
           destinatário, e ele precisa saber do agendamento novo tendo sinal
           ou não. O `else if` abaixo troca só a mensagem DA CLIENTE. */
        await confirmarAgendamento(db, a.id as string).catch((e) => {
          console.error('varrer · cobranca de sinal falhou', a.id, e)
          return null
        })
      } else if (regras.has(`${a.business_id}:confirmacao`)) {
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
          salao: negocio?.name ?? 'seu negócio',
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
            salao: negocio?.name ?? 'seu negócio',
            data: dataCurta(a.appointment_date as string),
            hora: '',
            servico: (a.service_name as string) || 'seu procedimento',
            telefoneSalao: negocio?.phone ?? null,
          },
        })
      }
    }
  }

  /* ═══ UMA MENSAGEM POR PESSOA A CADA 30 MINUTOS ═══════════════
     Regra cravada por Eduardo em 01/09: "nao faz sentido disparar duas msg
     assim uma atras da outra".

     A guarda anterior resolvia UM caso (lembrete de algo recem-marcado).
     Esta e' a regra geral, e cobre os que a gente nao previu — inclusive
     configuracao errada, como o lembrete do dia em 24h colidindo com o da
     vespera.

     Duas camadas:

     1. DENTRO DESTA VARREDURA: se duas tarefas caem na mesma pessoa e mesmo
        negocio, so a de maior prioridade vai. A outra nao e' descartada por
        capricho — dizer duas vezes a mesma coisa em segundos e' o que faz a
        cliente bloquear o numero, e o numero e' compartilhado por toda a
        base.

     2. CONTRA O QUE JA SAIU: se essa pessoa recebeu algo deste negocio nos
        ultimos 30 minutos, espera. Pega o caso da confirmacao que sai NA
        HORA do agendamento (fora desta fila) seguida de um lembrete.

     PRIORIDADE. Confirmacao ganha de tudo: e' a unica que traz dia, hora e
     servico de um horario que a pessoa talvez nao saiba que existe. Entre os
     dois lembretes ganha o da VESPERA — se os dois vencem juntos e' porque o
     "do dia" esta configurado em 24h, e o texto dele afirma "e hoje", que
     seria falso. Aniversario e retorno cedem: sao os unicos que podem
     esperar um dia sem prejuizo. */
  const PRIORIDADE: Partial<Record<TipoMensagem, number>> = {
    /* Acima de tudo: e' a unica com PRAZO. O horario cai sozinho quando o
       sinal vence, entao adiar essa mensagem em meia hora pode custar a
       venda — as outras so chegam mais tarde. Na pratica ela nunca disputa
       com a confirmacao, porque uma substitui a outra. */
    sinal_pendente: 0,
    confirmacao: 1,
    dono_novo_agendamento: 2,
    lembrete_vespera: 3,
    lembrete_dia: 4,
    retorno: 5,
    aniversario: 6,
  }
  const SILENCIO = 30 * 60 * 1000

  /* Uma consulta so pra toda a fila, nao uma por tarefa. */
  const telefones = [...new Set(fila.map((t) => t.telefone).filter(Boolean))] as string[]
  const recentes = new Set<string>()
  if (telefones.length > 0) {
    const { data: jaFoi } = await db
      .from('message_log')
      .select('business_id, destino')
      .eq('canal', 'whatsapp')
      .gte('created_at', new Date(agora - SILENCIO).toISOString())
    for (const m of (jaFoi ?? []) as { business_id: string | null; destino: string | null }[]) {
      /* Compara so digito: o destino e' gravado como a dona digitou —
         "(63) 99292-0080" numa linha, "556392920080" noutra. */
      if (m.business_id && m.destino) {
        recentes.add(`${m.business_id}:${m.destino.replace(/\D/g, '').slice(-11)}`)
      }
    }
  }

  const vistos = new Set<string>()
  const filaLimpa = fila
    .slice()
    .sort((x, y) => (PRIORIDADE[x.tipo] ?? 9) - (PRIORIDADE[y.tipo] ?? 9))
    .filter((t) => {
      if (!t.telefone) return true // e-mail nao concorre com WhatsApp
      const chave = `${t.businessId}:${t.telefone.replace(/\D/g, '').slice(-11)}`
      if (vistos.has(chave)) return false
      if (recentes.has(chave)) return false
      vistos.add(chave)
      return true
    })

  const adiados = fila.length - filaLimpa.length

  // ── ENVIO (lote) ──────────────────────────────────────────────
  const lote = filaLimpa.slice(0, LOTE)
  let enviados = 0, ignorados = 0, falhas = 0
  /* POR QUE FOI IGNORADO. As travas mais duras (conta demo, assinatura
     bloqueada, regra desligada) devolvem ANTES de gravar no message_log — de
     propósito, pra não encher a tabela de linha de mensagem que nunca teve
     chance. O efeito colateral é que a conta bloqueada para de avisar as
     clientes dela e não sobra rastro nenhum: o dono reclama que "o sistema
     parou" e ninguém consegue dizer por quê. O motivo agregado sai aqui, que
     é o que o monitor lê. */
  const motivos: Record<string, number> = {}
  const errosDeFalha: string[] = []

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
    else { falhas++; const q = 'erro' in r ? r.erro : 'falha'; motivos[q] = (motivos[q] ?? 0) + 1; errosDeFalha.push(q) }
  }


  /* CANAL MORTO AVISA NA PRIMEIRA. A licao veio da W-API: em 19/08 a conta
     venceu e as mensagens falharam de hora em hora, uma por vez, lote de 1.
     A regra de baixo (lote inteiro falhando) nunca fechou, entao o Telegram
     ficou mudo por 6 dias com regra ligada em cliente REAL.

     Erro de CREDENCIAL nao e problema de destinatario: numero errado da erro
     de numero. Uma unica falha dessas ja significa que NENHUMA mensagem sai
     ate alguem mexer na conta — avisa na primeira.

     Codigos da Cloud API que entram aqui: 190 (token invalido/expirado),
     10 e 200 (permissao), 4 (limite da conta), 131042 (problema de forma de
     pagamento) e qualquer HTTP 401/403. */
  /* O formato do erro vem do canal-cloud.ts: "<code>/<subcode> <mensagem>".
     Casar o codigo no INICIO evita falso alarme — "190" solto casaria com
     qualquer id de mensagem que contenha esses digitos. */
  const CODIGOS_DE_CANAL = ['190', '10', '200', '4', '131042', '131047']
  const erroDeCanal = errosDeFalha.find(
    (e) =>
      CODIGOS_DE_CANAL.some((c) => e.startsWith(c + '/')) ||
      /HTTP 40[13]|unauthorized|access token|payment method/i.test(e),
  )

  if (erroDeCanal) {
    await sendAlert(
      `🔴 MENSAGENS PARADAS: a Cloud API recusou o envio.
` +
      `Nenhum aviso sai ate resolver. Ver token do usuario do sistema, permissoes ` +
      `e forma de pagamento da conta do WhatsApp.
` +
      `Erro: ${erroDeCanal.slice(0, 160)}
Falharam agora: ${falhas} de ${lote.length}.`,
    )
  } else if (lote.length >= 3 && falhas === lote.length) {
    /* LOTE INTEIRO FALHANDO = problema de canal, nao de destinatario: um
       numero errado falha sozinho.
       Na Cloud API nao existe mais "sessao caida" — o numero e registrado e
       fica. Mas o sintoma continua valendo pra outras causas: template
       pausado, numero restringido por qualidade, ou limite de volume
       estourado. Todas param tudo de uma vez. */
    await sendAlert(
      `🔴 MENSAGENS: ${falhas} envios falharam seguidos.
` +
      `Falha em tudo e problema de canal. Ver no WhatsApp Manager: qualidade do ` +
      `numero, template pausado, ou limite de volume atingido.`,
    )
  }

  return NextResponse.json({
    ok: true,
    hora_br: new Date(agora - 3 * 3600_000).toISOString().slice(0, 16).replace('T', ' '),
    regras_ligadas: regras.size,
    candidatos: fila.length,
    adiados_por_silencio: adiados,
    processados: lote.length,
    enviados, ignorados, falhas,
    motivos,
    restam: Math.max(0, filaLimpa.length - lote.length),
  })
}
