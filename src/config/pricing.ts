/**
 * AgendaPRO — Fonte única do pricing oficial
 *
 * Decisão atualizada em 06/05/2026 (Eduardo):
 * - Preço único pra todos os clientes, sempre — Solo R$67/mês · Equipe R$97/mês
 * - SEM setup pra ninguém (descontinuado o setup R$197 do "Clube Fundador 10")
 * - SEM lógica de "fundador 10 primeiros" — preço fixo simplifica venda 1-a-1
 * - Sem fidelidade — cancela quando quiser
 *
 * NUNCA falar R$47 ou R$147 em copy nova — versão antiga arquivada.
 * NUNCA falar "Clube Fundador" / "setup R$197" — descontinuado em 06/05/2026.
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

  /**
   * Modalidades de pagamento (introduzidas em 29/04/2026)
   * - mensal_cartao: cobrança automática recorrente via cartão (preapproval MP)
   * - mensal_pix:    PIX único renovado mensalmente (cron gera novo a cada D-3)
   * - semestral_pix: PIX único cobre 6 meses (desconto ~13%)
   * - anual_pix:     PIX único cobre 12 meses (desconto ~17%)
   */
  modalidades: {
    mensal_cartao: {
      key: 'mensal_cartao',
      nome: 'Mensal — Cartão automático',
      descricaoCurta: 'Cartão automático todo mês',
      coberturaMeses: 1,
      multiplicador: 1,
      descontoReais: 0,
      descontoPercent: 0,
      metodoMP: 'preapproval' as const, // assinatura recorrente
    },
    mensal_pix: {
      key: 'mensal_pix',
      nome: 'Mensal — PIX',
      descricaoCurta: 'PIX a cada mês (a gente lembra antes)',
      coberturaMeses: 1,
      multiplicador: 1,
      descontoReais: 0,
      descontoPercent: 0,
      metodoMP: 'preference' as const, // PIX único, regenerado por cron
    },
    semestral_pix: {
      key: 'semestral_pix',
      nome: 'Semestral à vista — PIX',
      descricaoCurta: '6 meses pagos de uma vez',
      coberturaMeses: 6,
      multiplicador: 6,
      // Solo: 6×67 - 52 = 350. Equipe: 6×97 - 82 = 500
      descontoReais: { solo: 52, equipe: 82 },
      descontoPercent: 13,
      metodoMP: 'preference' as const,
    },
    anual_pix: {
      key: 'anual_pix',
      nome: 'Anual à vista — PIX',
      descricaoCurta: '12 meses pagos de uma vez (2 meses grátis)',
      coberturaMeses: 12,
      multiplicador: 12,
      // Solo: 12×67 - 134 = 670. Equipe: 12×97 - 194 = 970
      descontoReais: { solo: 134, equipe: 194 },
      descontoPercent: 17,
      metodoMP: 'preference' as const,
    },
  },
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

  /** Comparativo de mercado em 1 linha */
  ancoragemMercado:
    `${PRICING.concorrentes.nomes.slice(0, 3).join(', ')} cobram ` +
    `${PRICING.concorrentes.faixaMercado}. SmartAgenda é sem fidelidade — cancela quando quiser`,
} as const

/** Type helpers — pra TS sugerir os planos disponíveis */
export type PlanoTipo = 'solo' | 'equipe'
export type PlanoConfig = (typeof PRICING)['solo' | 'equipe']
export type ModalidadeKey = 'mensal_cartao' | 'mensal_pix' | 'semestral_pix' | 'anual_pix'

/** Pega config do plano por tipo */
export function getPlano(tipo: PlanoTipo): PlanoConfig {
  return PRICING[tipo]
}

/**
 * Calcula valor a cobrar (em centavos e reais) por plano + modalidade
 * Solo mensal_cartao   → 6700 cents (R$ 67)
 * Solo semestral_pix   → 35000 cents (R$ 350) — econ R$ 52 vs 6×67
 * Solo anual_pix       → 67000 cents (R$ 670) — econ R$ 134 vs 12×67
 * Equipe mensal_cartao → 9700 cents (R$ 97)
 * Equipe semestral_pix → 50000 cents (R$ 500) — econ R$ 82
 * Equipe anual_pix     → 97000 cents (R$ 970) — econ R$ 194
 */
export function calcularPreco(plano: PlanoTipo, modalidade: ModalidadeKey): {
  valorReais: number
  valorCentavos: number
  descontoReais: number
  coberturaMeses: number
  metodoMP: 'preapproval' | 'preference'
} {
  const planoConfig = PRICING[plano]
  const modalidadeConfig = PRICING.modalidades[modalidade]

  // mensal_cartao e mensal_pix: 1× mensalidade, sem desconto
  // semestral_pix e anual_pix: multiplicador × mensalidade − desconto
  const desconto =
    typeof modalidadeConfig.descontoReais === 'object'
      ? modalidadeConfig.descontoReais[plano]
      : modalidadeConfig.descontoReais

  const valorReais =
    planoConfig.mensalidadeReais * modalidadeConfig.multiplicador - desconto

  return {
    valorReais,
    valorCentavos: valorReais * 100,
    descontoReais: desconto,
    coberturaMeses: modalidadeConfig.multiplicador,
    metodoMP: modalidadeConfig.metodoMP,
  }
}
