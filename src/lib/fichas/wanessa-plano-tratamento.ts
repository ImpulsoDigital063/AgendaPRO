import type { NicheFicha } from './types'

/**
 * AVALIAÇÃO E PLANO DE TRATAMENTO — Wanessa Silva Estética Avançada.
 *
 * São as folhas 2 e 3 do papel dela (14/10/2026), as que a PROFISSIONAL
 * preenche e assina: avaliação, rotina home care, produtos adquiridos,
 * observações, queixas e plano de tratamento. Ficam separadas da anamnese
 * porque mudam ao longo do tratamento — a anamnese a cliente assina uma vez e
 * trava; esta a Wanessa refaz quando o plano muda (assinar de novo gera versão
 * nova apontando pra anterior, o histórico fica).
 *
 * Nome e data saem do cadastro e do registro da ficha. A tabela Data /
 * Procedimento / Valor / Desconto não entra: é o histórico de atendimentos
 * que o sistema já mostra na aba Atividades da cliente.
 */
export const WANESSA_PLANO_TRATAMENTO: NicheFicha = {
  slug: 'wanessa-plano-tratamento',
  name: 'Avaliação e Plano de Tratamento',
  businessSlugs: ['wanessasilvaestetica', 'clinica-teste-fichas'], // + conta espelho dos testes
  sections: [
    {
      kind: 'fields',
      title: 'Plano de tratamento',
      fields: [
        { name: 'queixas', label: 'Queixas', type: 'textarea' },
        { name: 'plano_tratamento', label: 'Plano de tratamento', type: 'textarea' },
      ],
    },
    {
      kind: 'fields',
      title: 'Avaliação profissional',
      fields: [
        { name: 'avaliacao_profissional', label: 'Avaliação profissional', type: 'textarea' },
        { name: 'rotina_home_care', label: 'Rotina home care', type: 'textarea' },
        { name: 'produtos_adquiridos', label: 'Produtos adquiridos', type: 'textarea' },
        { name: 'observacoes', label: 'Observações', type: 'textarea' },
      ],
    },
    { kind: 'signature', name: 'assinatura_profissional', label: 'Assinatura da Profissional' },
  ],
}
