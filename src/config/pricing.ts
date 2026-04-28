/**
 * AgendaPRO — Fonte única do pricing oficial
 *
 * Decisão travada em 27/04/2026 (sessão Eduardo + GPT — IMPULSO_CORE_SYSTEM_V2):
 * - Sem setup pra ninguém nesse início (sem Z-API ainda, integração mínima)
 * - Subiu mensalidade pra refletir valor real (Solo 47→67, Equipe 67→97)
 * - Setup R$197 oficial volta a ser cobrado a partir do cliente 11+
 * - Clube Fundador (10 primeiros): setup R$197 ISENTO pra sempre
 *
 * NUNCA falar R$47 ou R$147 em copy nova — versão antiga arquivada.
 *
 * Frase de fechamento pesada validada por GPT:
 * "depois que fechar os 10, o setup de R$197 volta normal"
 */

export const PRICING = {
  /** Plano Solo — 1 profissional + 1 colaborador */
  solo: {
    nome: 'Solo',
    publico: '1 profissional + 1 colaborador',
    mensalidadeReais: 67,
    mensalidadeCentavos: 6700,
    mensalidadeFormatada: 'R$ 67',
    mensalidadeCompleta: 'R$ 67/mês',
  },

  /** Plano Equipe — até 5 profissionais */
  equipe: {
    nome: 'Equipe',
    publico: 'até 5 profissionais',
    mensalidadeReais: 97,
    mensalidadeCentavos: 9700,
    mensalidadeFormatada: 'R$ 97',
    mensalidadeCompleta: 'R$ 97/mês',
  },

  /**
   * Setup oficial R$197 — voltará a ser cobrado a partir do cliente 11+,
   * depois que o Clube Fundador fechar.
   * Nesse início (até cliente 10), Clube Fundador entra com setup ISENTO.
   */
  setup: {
    valorReais: 197,
    valorCentavos: 19700,
    valorFormatado: 'R$ 197',
    isencaoFundador: true,
  },

  /** Clube Fundador — primeiros 10 clientes */
  clubeFundador: {
    vagas: 10,
    setupIsento: true,
    contrapartida: 'depoimento em vídeo + 1 indicação qualificada',
    fraseFechamento: 'depois que fechar os 10, o setup de R$197 volta normal',
  },

  /** Garantia (substitui o trial antigo) */
  garantia: {
    diasReembolso: 7,
    pitch: 'você testa 7 dias, se não fizer sentido eu devolvo sem burocracia',
  },

  /** Comparativo de mercado pra ancoragem */
  concorrentes: {
    faixaMercado: 'R$ 200-500/mês com fidelidade anual',
    nomes: ['ZenPlace', 'Trinks', 'Booksy', 'BarberApp', 'Belezzia'],
  },

  /** Sem fidelidade — diferencial */
  semFidelidade: true,
} as const

/**
 * Helpers pra exibir pricing já formatado em copy.
 * Use sempre estes em vez de hardcoded em pages/components.
 */
export const PRICING_TEXT = {
  /** "Solo R$67/mês ou Equipe R$97/mês, sem setup" */
  resumoCurto:
    `${PRICING.solo.nome} ${PRICING.solo.mensalidadeCompleta} ou ` +
    `${PRICING.equipe.nome} ${PRICING.equipe.mensalidadeCompleta}, sem setup`,

  /** "A partir de R$67/mês" */
  aPartirDe: `A partir de ${PRICING.solo.mensalidadeCompleta}`,

  /** Frase do Clube Fundador pra usar em CTA */
  cluFundadorFrase: `Os 10 primeiros entram sem o setup de ${PRICING.setup.valorFormatado} pra sempre`,

  /** Frase de pressão pra fechamento */
  fraseFechamento: PRICING.clubeFundador.fraseFechamento,

  /** Comparativo de mercado em 1 linha */
  ancoragemMercado:
    `${PRICING.concorrentes.nomes.slice(0, 3).join(', ')} cobram ` +
    `${PRICING.concorrentes.faixaMercado}. SmartAgenda é sem fidelidade — cancela quando quiser`,
} as const

/** Type helpers — pra TS sugerir os planos disponíveis */
export type PlanoTipo = 'solo' | 'equipe'
export type PlanoConfig = (typeof PRICING)['solo' | 'equipe']

/** Pega config do plano por tipo */
export function getPlano(tipo: PlanoTipo): PlanoConfig {
  return PRICING[tipo]
}
