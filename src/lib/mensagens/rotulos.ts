/* ═══════════════════════════════════════════════════════════════
   COMO O AVISO SE CHAMA NA TELA

   Fonte única. Estes nomes já existiam dentro da rota de templates; saíram
   de lá quando a ficha do atendimento e a lista de avisos passaram a
   mostrar a mesma coisa (22/09/2026). Dois lugares escrevendo "Lembrete da
   véspera" na mão é o começo de um virar "Lembrete de véspera".

   `auto_resposta` e as `resposta_*` entram aqui porque aparecem no registro
   desde 22/09 — são as respostas em texto livre do webhook. Elas NÃO são
   aviso que a dona programou, e a lista trata isso separado.
   ═══════════════════════════════════════════════════════════════ */

import type { TipoMensagem } from './tipos'

export const ROTULO_AVISO: Record<string, string> = {
  confirmacao: 'Confirmação do agendamento',
  sinal_pendente: 'Cobrança do sinal',
  lembrete_vespera: 'Lembrete da véspera',
  lembrete_dia: 'Lembrete do dia',
  aniversario: 'Aniversário',
  retorno: 'Hora de voltar',
  dono_novo_agendamento: 'Aviso de agendamento novo',
  dono_cancelamento: 'Aviso de cancelamento',
  auto_resposta: 'Resposta automática',
  resposta_confirmou: 'Resposta · presença confirmada',
  resposta_ja_paguei: 'Resposta · já paguei',
  resposta_remarcar: 'Resposta · remarcar',
}

/** Nome na tela, com cair-fora seguro pra tipo que eu ainda não conheça. */
export function rotuloDoAviso(tipo: string): string {
  return ROTULO_AVISO[tipo] ?? tipo.replace(/_/g, ' ')
}

/** Só os que a dona programa — o resto é conversa, não aviso. */
export const TIPOS_PROGRAMADOS: TipoMensagem[] = [
  'confirmacao',
  'sinal_pendente',
  'lembrete_vespera',
  'lembrete_dia',
  'aniversario',
  'retorno',
]

/** É resposta do robô dentro da conversa, não aviso disparado. */
export function ehResposta(tipo: string): boolean {
  return tipo === 'auto_resposta' || tipo.startsWith('resposta_')
}

/* ═══ O QUE ACONTECEU COM A MENSAGEM ═══════════════════════════

   A dona não quer saber de "status=enviado, entregue_em=null". Ela quer
   saber se chegou, e principalmente se NÃO chegou — aí ela ainda tem tempo
   de ligar. Por isso quatro estados e nada além disso:

     lida       · chegou e a cliente abriu
     entregue   · chegou no aparelho
     enviada    · saiu daqui, a Meta ainda não confirmou
     não chegou · falhou, e é o único que pede ação
   ═══════════════════════════════════════════════════════════════ */

export type SituacaoAviso = 'lida' | 'entregue' | 'enviada' | 'falhou' | 'processando'

export function situacaoDoAviso(m: {
  status: string | null
  entregue_em: string | null
  lido_em: string | null
}): SituacaoAviso {
  if (m.status === 'falhou') return 'falhou'
  if (m.lido_em) return 'lida'
  if (m.entregue_em) return 'entregue'
  if (m.status === 'processando') return 'processando'
  return 'enviada'
}

export const TEXTO_SITUACAO: Record<SituacaoAviso, string> = {
  lida: 'Lida pela cliente',
  entregue: 'Entregue',
  enviada: 'Enviada',
  falhou: 'Não chegou',
  processando: 'Saindo agora',
}
