/* ═══════════════════════════════════════════════════════════════
   MOTOR DE MENSAGENS AUTOMÁTICAS — tipos e padrões

   Três pedidos que chegaram juntos (lembrete de horário, aniversário e
   "hora de voltar") são a MESMA máquina: muda só o gatilho. Por isso o
   motor é uma tabela de regras, não um cron por mensagem. Gatilho novo
   vira uma linha aqui, não um projeto.

   Toda regra nasce DESLIGADA. Mandar mensagem em nome do salão sem a dona
   ter pedido é o tipo de coisa que ela descobre pela cliente reclamando.
   ═══════════════════════════════════════════════════════════════ */

export type TipoMensagem =
  | 'confirmacao'
  /* Ocupa o LUGAR da confirmação quando o horário depende de sinal. Nunca
     sai junto com ela: enquanto não pagou, dizer "ficou marcado" é mentira,
     e o horário pode cair. */
  | 'sinal_pendente'
  | 'lembrete_vespera'
  | 'lembrete_dia'
  | 'aniversario'
  | 'retorno'
  | 'dono_novo_agendamento'
  | 'dono_cancelamento'

export type Regra = {
  tipo: TipoMensagem
  enabled: boolean
  /** Minutos relativos ao gatilho. Negativo = antes. */
  offsetMinutos: number
  /** Gatilhos de calendário (aniversário, retorno) saem nesta hora, BR. */
  horaDoDia: string
  /** Dias sem voltar que caracterizam retorno. Só pro tipo 'retorno'. */
  retornoDias: number | null
  /** Texto próprio da dona. null = padrão do sistema. */
  template: string | null
  /** Lembrete sai com os botões Confirmo/Preciso remarcar (v127). */
  comBotao?: boolean
}

/** Quem é o destinatário — muda o canal e a régua de opt-out. */
export const DESTINATARIO: Record<TipoMensagem, 'cliente' | 'dono'> = {
  confirmacao: 'cliente',
  sinal_pendente: 'cliente',
  lembrete_vespera: 'cliente',
  lembrete_dia: 'cliente',
  aniversario: 'cliente',
  retorno: 'cliente',
  dono_novo_agendamento: 'dono',
  dono_cancelamento: 'dono',
}

/**
 * Mensagem que a cliente NÃO pediu é a que gera denúncia de spam — e
 * denúncia é o que derruba número de WhatsApp, não volume. Lembrete de um
 * horário que ela marcou, ela espera. "Volte ao salão" ela não pediu.
 *
 * Só as marcadas aqui respeitam opt-out e entram no limite de frequência.
 * As transacionais saem sempre (a cliente precisa saber do horário dela).
 */
export const EH_PROMOCIONAL: Record<TipoMensagem, boolean> = {
  confirmacao: false,
  /* Transacional: é o pagamento do horário que ELA marcou. Não respeita
     opt-out pelo mesmo motivo da confirmação — sem essa mensagem ela perde
     o horário sem saber por quê. */
  sinal_pendente: false,
  lembrete_vespera: false,
  lembrete_dia: false,
  aniversario: true,
  retorno: true,
  dono_novo_agendamento: false,
  dono_cancelamento: false,
}

/**
 * Padrão de fábrica. Vale quando o negócio não tem linha em message_rules.
 *
 * `enabled: false` em tudo é decisão, não preguiça: o motor sobe no ar sem
 * mandar nada, a gente liga negócio por negócio durante o aquecimento do
 * número, e ninguém acorda com o WhatsApp disparando pra base dele.
 */
export const PADRAO: Record<TipoMensagem, Regra> = {
  confirmacao: {
    tipo: 'confirmacao', enabled: false, offsetMinutos: 0,
    horaDoDia: '09:00', retornoDias: null, template: null,
  },
  /* Chave separada de propósito, e não um `if` dentro da confirmação: a
     dona pode querer confirmar sozinho e cobrar o sinal na mão, ou o
     contrário. São duas decisões, então são dois interruptores. */
  sinal_pendente: {
    tipo: 'sinal_pendente', enabled: false, offsetMinutos: 0,
    horaDoDia: '09:00', retornoDias: null, template: null,
  },
  lembrete_vespera: {
    // 24h antes. Dá tempo de remarcar em vez de simplesmente faltar.
    tipo: 'lembrete_vespera', enabled: false, offsetMinutos: -1440,
    horaDoDia: '09:00', retornoDias: null, template: null,
  },
  lembrete_dia: {
    /* 3h antes do horário DELA, não "de manhã pra todo mundo": quem atende
       às 19h não é lembrada às 8h. Exige varredura de hora em hora — o
       GitHub Action do monitor já roda nessa frequência. */
    tipo: 'lembrete_dia', enabled: false, offsetMinutos: -180,
    horaDoDia: '09:00', retornoDias: null, template: null,
  },
  aniversario: {
    tipo: 'aniversario', enabled: false, offsetMinutos: 0,
    horaDoDia: '09:00', retornoDias: null, template: null,
  },
  retorno: {
    /* 45 dias é o intervalo típico entre manutenções em salão/estética.
       Fica configurável porque clínica trabalha em outra escala. */
    tipo: 'retorno', enabled: false, offsetMinutos: 0,
    horaDoDia: '10:00', retornoDias: 45, template: null,
  },
  dono_novo_agendamento: {
    tipo: 'dono_novo_agendamento', enabled: false, offsetMinutos: 0,
    horaDoDia: '09:00', retornoDias: null, template: null,
  },
  dono_cancelamento: {
    tipo: 'dono_cancelamento', enabled: false, offsetMinutos: 0,
    horaDoDia: '09:00', retornoDias: null, template: null,
  },
}

/**
 * Chave de idempotência. É ela que impede a cliente de receber o mesmo
 * lembrete duas vezes — e é UNIQUE no banco, então a trava é do Postgres,
 * não da lógica: duas execuções simultâneas do cron não furam.
 *
 * Formato por gatilho:
 *   lembrete_vespera:<appointmentId>
 *   aniversario:<customerId>:2026
 *   retorno:<customerId>:2026-08
 */
export function chaveIdempotencia(
  tipo: TipoMensagem,
  alvo: string,
  sufixo?: string,
): string {
  return sufixo ? `${tipo}:${alvo}:${sufixo}` : `${tipo}:${alvo}`
}
