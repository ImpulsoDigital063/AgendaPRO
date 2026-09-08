/**
 * Quanto cada tipo de mensagem consome da franquia.
 *
 * Reativação (`retorno`) é template de categoria MARKETING na Meta — a mais
 * cara. O comentário em templates-cloud.ts já avisava: "~7x mais caro, e
 * consome 7 da franquia". O número mora aqui pra a tela poder mostrar o custo
 * ANTES do disparo, em vez de a dona descobrir depois que gastou meio pacote.
 *
 * Referência de tamanho (catálogo em pacotes.ts):
 *   Essencial  80 unidades → 11 reativações
 *   Padrão    200 unidades → 28 reativações
 *   Plus      400 unidades → 57 reativações
 */
export const UNIDADES_POR_TIPO = {
  retorno: 7,
} as const
