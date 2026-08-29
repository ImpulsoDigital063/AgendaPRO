/* ═══════════════════════════════════════════════════════════════
   FRANQUIA — quanto do pacote o negócio já usou no mês

   O módulo de avisos é vendido como pacote: 120 mensagens por R$11,90, e o
   que passar disso sai a R$0,12. Este arquivo é a única fonte dessa conta.

   ─── Três decisões que estão embutidas aqui ───────────────────

   1. NÃO CORTA. Estourar a franquia não para o envio, gera excedente. Um
      pacote que acaba é o sistema falhando no sábado de manhã com a dona
      achando que quebrou — e a cliente que faltar naquele dia vira culpa
      nossa. A franquia é teto de RISCO nosso, não interruptor dela.

   2. O QUE CORTA É O SALDO, NÃO A DATA. O pacote é pré-pago, mas o que ela
      pagou é dela: se o mês virou e sobraram 30 mensagens, elas continuam
      saindo. Zerar no dia 30 seria ficar com dinheiro de mensagem não
      entregue — e não economiza nada, porque a Meta cobra por mensagem, não
      por período. Os 30 dias são o ciclo de COBRANÇA, não prazo de uso.

      Consequência: renovar SOMA o que sobrou. Sem isso ela é punida por
      renovar cedo e aprende a esperar zerar antes — trocando uma renovação
      tranquila por uma janela de sistema parado.

   3. A CONTA É POR ENTREGA, não por envio. A Meta cobra por mensagem
      ENTREGUE — mensagem que falhou não entra na fatura dela, então não
      pode entrar na da dona. Por isso o consumo olha `entregue_em`, e o
      que ainda não voltou fica separado em "aguardando".

   4. MARKETING PESA 7. Aniversário e "hora de voltar" custam ~7x mais na
      Meta que um lembrete. Sem isso, uma dona que use o pacote em
      aniversário gera R$42 de custo contra R$11,90 recebidos. O peso vem
      gravado em `message_log.unidades` no momento do envio.
   ═══════════════════════════════════════════════════════════════ */

import type { SupabaseClient } from '@supabase/supabase-js'
import { pacotePorId, PRECO_EXCEDENTE, type Pacote } from './pacotes'
import { PADRAO } from './tipos'

export { PRECO_EXCEDENTE }

export type Consumo = {
  /** Unidades já confirmadas como entregues — é o que se cobra. */
  usadas: number
  /** Enviadas mas ainda sem confirmação da Meta. Podem virar `usadas`. */
  aguardando: number
  /** Mensagens (não unidades) entregues, pra dona entender o número. */
  mensagens: number
  franquia: number
  /** Quanto ainda cabe antes de gerar excedente. Nunca negativo. */
  restantes: number
  excedente: number
  custoExcedente: number
  inicioDoCiclo: string
  fimDoCiclo: string | null
  /** Unidades que ainda dá pra usar. É ISTO que decide se a mensagem sai. */
  saldo: number
  /** false = sem pacote contratado. */
  vigente: boolean
  /** null = não contratou o módulo. */
  pacote: Pacote | null
}

/**
 * Consumo do mês corrente. Uma consulta só — o índice
 * `message_log_business_created_idx` cobre este filtro.
 */
export async function consumoDoMes(db: SupabaseClient, businessId: string): Promise<Consumo> {
  /* Tudo que decide a conta vem da linha do negócio: qual pacote, quando o
     ciclo começou, e quantas unidades ESTE ciclo tem — que pode ser menos
     que o catálogo, porque a primeira compra é proporcional. */
  const { data: neg } = await db
    .from('businesses')
    .select('avisos_pacote, avisos_desde, avisos_ate, avisos_unidades')
    .eq('id', businessId)
    .maybeSingle()
  const n = neg as {
    avisos_pacote?: string | null
    avisos_desde?: string | null
    avisos_ate?: string | null
    avisos_unidades?: number | null
  } | null

  const pacote = pacotePorId(n?.avisos_pacote)
  /* `avisos_unidades` só é preenchido quando o PIX é confirmado. Contratou
     sem pagar = null = franquia zero. Escolher não é pagar. */
  const vigente = !!pacote && (n?.avisos_unidades ?? 0) > 0
  const franquia = n?.avisos_unidades ?? 0

  /* Sem ciclo ativo, mostra os últimos 30 dias — é o que a dona espera ver
     quando o pacote acaba, pra decidir se renova.
     Janela corrida de propósito: não tem nada de fuso aqui pra errar, e
     "mês do calendário" não significa nada pra quem nunca teve ciclo. */
  const inicio = n?.avisos_desde ?? new Date(Date.now() - 30 * 864e5).toISOString()

  const { data } = await db
    .from('message_log')
    .select('unidades, entregue_em, falhou_em, status')
    .eq('business_id', businessId)
    .eq('canal', 'whatsapp')
    .gte('created_at', inicio)

  let usadas = 0
  let aguardando = 0
  let mensagens = 0

  for (const r of (data ?? []) as {
    unidades: number | null
    entregue_em: string | null
    falhou_em: string | null
    status: string | null
  }[]) {
    const peso = r.unidades ?? 1
    if (r.entregue_em) {
      usadas += peso
      mensagens += 1
    } else if (!r.falhou_em && r.status === 'enviado') {
      /* Aceita pela Meta, entrega ainda não confirmada. Fica de fora da
         cobrança até virar `entregue_em` — mostrar isso como já gasto
         seria repetir o erro de tratar aceite como entrega. */
      aguardando += peso
    }
    // falhou_em: não conta. A Meta também não cobra.
  }

  const excedente = Math.max(0, usadas - franquia)
  return {
    pacote,
    saldo: Math.max(0, franquia - usadas),
    usadas,
    aguardando,
    mensagens,
    franquia,
    restantes: Math.max(0, franquia - usadas),
    excedente,
    custoExcedente: Number((excedente * PRECO_EXCEDENTE).toFixed(2)),
    inicioDoCiclo: inicio,
    fimDoCiclo: n?.avisos_ate ?? null,
    vigente,
  }
}

/**
 * Frase pronta pra tela da dona.
 *
 * Em português do negócio dela, não em jargão: ela não sabe o que é
 * "unidade" nem por que aniversário pesa mais — e é justamente isso que
 * precisa ficar claro antes da primeira fatura com excedente, senão vira
 * discussão.
 */
export function resumoEmPortugues(c: Consumo): string {
  if (!c.pacote) {
    return 'Os avisos automáticos não estão contratados para este negócio.'
  }
  if (c.excedente > 0) {
    return `Você já usou as ${c.franquia} mensagens do mês e mandou mais ${c.excedente}. ` +
      `Isso soma R$ ${c.custoExcedente.toFixed(2).replace('.', ',')} na próxima fatura.`
  }
  if (c.restantes <= 20) {
    return `Restam ${c.restantes} mensagens do seu pacote este mês. ` +
      `Depois delas, cada uma sai a R$ 0,12 — os avisos não param.`
  }
  return `${c.usadas} de ${c.franquia} mensagens usadas este mês.`
}

/* ═══════════════════════════════════════════════════════════════
   O PORTÃO — duas perguntas, e as duas são de dinheiro
   ═══════════════════════════════════════════════════════════════ */

/**
 * Pode mandar mensagem por este negócio?
 *
 * 1. TEM SALDO? O que ela pagou é dela até acabar, mesmo depois do
 *    vencimento. O que corta é o saldo, não o calendário.
 *
 * 2. A ASSINATURA ESTÁ EM DIA? Saldo de mensagem é uma coisa, mensalidade
 *    do AgendaPRO é outra. Se a conta dela está bloqueada — cancelou,
 *    reembolsou, ou atrasou e passou a carência — os avisos param mesmo com
 *    saldo, senão a Impulso paga a Meta por quem não paga nada.
 *    O saldo não some: fica esperando ela regularizar.
 *
 * A regra de bloqueio é a MESMA do layout do admin, de propósito. Duas
 * definições de "bloqueado" no mesmo sistema divergem no primeiro ajuste.
 */
export async function podeEnviar(
  db: SupabaseClient,
  businessId: string,
): Promise<{ pode: true } | { pode: false; motivo: string }> {
  const { data: sub } = await db
    .from('subscriptions')
    .select('status, refunded_at, grace_ends_at')
    .eq('business_id', businessId)
    .maybeSingle()
  const sb = sub as {
    status?: string | null
    refunded_at?: string | null
    grace_ends_at?: string | null
  } | null

  if (!sb) return { pode: false, motivo: 'sem_assinatura' }
  const carenciaVenceu = !!sb.grace_ends_at && new Date(sb.grace_ends_at) < new Date()
  if (sb.status === 'cancelled' || sb.refunded_at || (sb.status === 'past_due' && carenciaVenceu)) {
    return { pode: false, motivo: 'assinatura_bloqueada' }
  }

  const c = await consumoDoMes(db, businessId)
  if (!c.pacote) return { pode: false, motivo: 'sem_pacote_contratado' }
  if (c.saldo <= 0) return { pode: false, motivo: 'sem_saldo' }
  return { pode: true }
}

/* ═══════════════════════════════════════════════════════════════
   ATIVAÇÃO — as duas formas de mexer no balde, e elas são diferentes
   ═══════════════════════════════════════════════════════════════ */

/**
 * RENOVAÇÃO ou COMPRA NOVA: começa um ciclo e SOMA o que sobrou.
 *
 * Somar não é cortesia, é o que impede um comportamento ruim: se renovar
 * apagasse o saldo, ela aprenderia a esperar zerar antes de pagar — e você
 * trocaria uma renovação tranquila por uma janela de sistema parado.
 *
 * `unidades` pode vir menor que o catálogo na PRIMEIRA compra, quando o
 * valor é proporcional aos dias que faltam pro vencimento da mensalidade.
 * Quem paga por 19 dias leva a franquia de 19 dias.
 *
 * Só deve ser chamada quando o pagamento estiver CONFIRMADO. Escolher o
 * pacote na tela não ativa nada — é isto aqui que faz a mensagem sair.
 */
export async function ativarPacote(
  db: SupabaseClient,
  businessId: string,
  pacoteId: string,
  opts?: { unidades?: number; dias?: number },
): Promise<{ ok: boolean; unidades: number; erro?: string }> {
  const pacote = pacotePorId(pacoteId)
  if (!pacote) return { ok: false, unidades: 0, erro: 'pacote_invalido' }

  const antes = await consumoDoMes(db, businessId)
  const compradas = opts?.unidades ?? pacote.unidades
  const unidades = compradas + antes.saldo

  const agora = new Date()
  const ate = new Date(agora.getTime() + (opts?.dias ?? 30) * 864e5)

  const { error } = await db
    .from('businesses')
    .update({
      avisos_pacote: pacote.id,
      avisos_unidades: unidades,
      /* O relógio reinicia: o consumo passa a contar daqui. Por isso o
         saldo anterior tem que estar SOMADO em `unidades` — senão ele
         desapareceria junto com o histórico do ciclo velho. */
      avisos_desde: agora.toISOString(),
      avisos_ate: ate.toISOString(),
    })
    .eq('id', businessId)
  if (error) return { ok: false, unidades: 0, erro: error.message }

  /* Read-after-write: aqui o valor decide se as mensagens saem. */
  const { data } = await db
    .from('businesses')
    .select('avisos_unidades')
    .eq('id', businessId)
    .maybeSingle()
  const gravado = (data as { avisos_unidades?: number | null } | null)?.avisos_unidades
  if (gravado !== unidades) return { ok: false, unidades: 0, erro: 'nao_persistiu' }

  await ligarReguaPadrao(db, businessId).catch(() => null)
  return { ok: true, unidades }
}

/**
 * Liga confirmação + véspera na PRIMEIRA contratação.
 *
 * Duas mensagens por atendimento, decidido em 29/08. A terceira (lembrete do
 * dia) traz R$4,47 de margem a mais e aumenta o volume em 50% — não paga o
 * risco de bloqueio num número compartilhado.
 *
 * A confirmação fica porque, no nosso desenho, o número não é o do salão:
 * ela é o que APRESENTA o número pra cliente. Sem ela, a véspera chega de um
 * desconhecido.
 *
 * A véspera em vez do lembrete de 3h porque é a única que dá tempo de a dona
 * vender o horário pra outra pessoa. Três horas antes o horário já morreu.
 *
 * 🔴 Só age quando ela NÃO TEM regra nenhuma. Quem já configurou escolheu —
 * sobrescrever a escolha dela na renovação seria religar aviso que ela
 * desligou de propósito.
 */
async function ligarReguaPadrao(db: SupabaseClient, businessId: string) {
  const { count } = await db
    .from('message_rules')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
  if ((count ?? 0) > 0) return

  await db.from('message_rules').insert(
    (['confirmacao', 'lembrete_vespera'] as const).map((tipo) => ({
      business_id: businessId,
      tipo,
      enabled: true,
      offset_minutos: PADRAO[tipo].offsetMinutos,
      hora_do_dia: PADRAO[tipo].horaDoDia,
      com_botao: true,
    })),
  )
}

/**
 * UPGRADE NO MEIO DO CICLO: troca o tamanho do balde, NÃO zera o relógio.
 *
 * Ela tinha 150 e usou 130. Sobe pro Plus pagando só a diferença: passa a
 * ter 300 NO MESMO CICLO, com 170 disponíveis. Não são 300 novas em cima
 * das 130 já gastas.
 *
 * A diferença entre as duas leituras é a margem inteira: trocando o balde,
 * ela pagou R$23,90 por até 300 mensagens (custo R$15,00, margem 37%);
 * dando balde novo, pagou R$23,90 por até 430 (custo R$21,50, margem 10%).
 *
 * E é à prova de abuso: subir degrau por degrau no mesmo ciclo soma
 * exatamente o preço do degrau final (7,90 + 5,00 + 11,00 = 23,90 = Plus).
 */
export async function trocarPacoteNoCiclo(
  db: SupabaseClient,
  businessId: string,
  novoPacoteId: string,
): Promise<{ ok: boolean; erro?: string }> {
  const novo = pacotePorId(novoPacoteId)
  if (!novo) return { ok: false, erro: 'pacote_invalido' }

  const atual = await consumoDoMes(db, businessId)
  if (!atual.pacote) return { ok: false, erro: 'sem_pacote_para_trocar' }
  if (novo.unidades <= atual.franquia) return { ok: false, erro: 'nao_e_upgrade' }

  /* `avisos_desde` e `avisos_ate` ficam intactos — é o mesmo ciclo. */
  const { error } = await db
    .from('businesses')
    .update({ avisos_pacote: novo.id, avisos_unidades: novo.unidades })
    .eq('id', businessId)
  if (error) return { ok: false, erro: error.message }

  const { data } = await db
    .from('businesses')
    .select('avisos_pacote, avisos_unidades')
    .eq('id', businessId)
    .maybeSingle()
  const d = data as { avisos_pacote?: string; avisos_unidades?: number } | null
  if (d?.avisos_pacote !== novo.id || d?.avisos_unidades !== novo.unidades) {
    return { ok: false, erro: 'nao_persistiu' }
  }
  return { ok: true }
}

/** Quanto falta pagar pra subir de degrau no meio do ciclo. */
export function diferencaDoUpgrade(deId: string, paraId: string): number | null {
  const de = pacotePorId(deId)
  const para = pacotePorId(paraId)
  if (!de || !para || para.preco <= de.preco) return null
  return Number((para.preco - de.preco).toFixed(2))
}

/* ═══════════════════════════════════════════════════════════════
   COBRANÇA — o pacote entra no MESMO PIX da mensalidade
   ═══════════════════════════════════════════════════════════════ */

/**
 * Quanto somar na próxima cobrança do plano por causa dos avisos.
 *
 * Decisão de 28/08: um PIX por mês. Cada cobrança separada é uma chance a
 * mais de ela esquecer, atrasar, e o pacote vencer sem ela perceber.
 *
 * Só soma se o pacote estiver contratado AGORA. Quem cancelou não é
 * cobrado — parece óbvio, mas é a regra que impede cobrar de quem saiu, que
 * é o erro que vira reclamação pública.
 *
 * Devolve zero (e não erro) quando não há pacote: quem chama está montando
 * uma cobrança de mensalidade e não pode quebrar por causa de um adicional.
 */
export async function adicionalDeAvisos(
  db: SupabaseClient,
  businessId: string,
): Promise<{ valor: number; pacote: Pacote | null; descricao: string | null }> {
  const { data } = await db
    .from('businesses')
    .select('avisos_pacote')
    .eq('id', businessId)
    .maybeSingle()
  const pacote = pacotePorId((data as { avisos_pacote?: string | null } | null)?.avisos_pacote)
  if (!pacote) return { valor: 0, pacote: null, descricao: null }
  return {
    valor: pacote.preco,
    pacote,
    descricao: `Avisos ${pacote.nome} (${pacote.unidades} mensagens)`,
  }
}

/**
 * Primeira compra: proporcional aos dias que faltam pro vencimento do plano.
 *
 * É o que alinha os dois ciclos. Sem isso, o pacote comprado dia 12 vence
 * dia 12 e a mensalidade dia 1º — nunca mais se encontram, e ela paga dois
 * PIX por mês pra sempre.
 *
 * Escala PREÇO E FRANQUIA juntos. Dar a franquia cheia por meio período
 * derrubaria a margem de 42% pra 5% naquele ciclo; cobrar cheio por meio
 * período seria vender dias que ela não tem.
 *
 * Mínimo de 7 dias: abaixo disso o valor fica ridículo (R$3) e a dona não
 * entende o que comprou. Faltando menos que isso, já emenda no ciclo cheio.
 */
export function primeiraCompraProporcional(
  pacoteId: string,
  diasAteVencimento: number,
): { valor: number; unidades: number; dias: number } | null {
  const pacote = pacotePorId(pacoteId)
  if (!pacote) return null
  const dias = Math.max(7, Math.min(30, Math.round(diasAteVencimento)))
  if (diasAteVencimento < 7) {
    // Emenda: paga o cheio e leva até o vencimento seguinte.
    return { valor: pacote.preco, unidades: pacote.unidades, dias: Math.round(diasAteVencimento) + 30 }
  }
  const fator = dias / 30
  return {
    valor: Number((pacote.preco * fator).toFixed(2)),
    unidades: Math.round(pacote.unidades * fator),
    dias,
  }
}
