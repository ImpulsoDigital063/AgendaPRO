import type { NicheFicha } from './types'

/**
 * FICHA DE EVOLUÇÃO LIVRE.
 *
 * Do kit de uma clínica de estética em uso real (08/08/2026): no papel é uma
 * folha pautada em branco, e é a ficha mais usada de todas — é onde entra o que
 * não cabe em campo estruturado ("cliente relatou ardência no 3º dia", "trouxe
 * exame", "remarcou por causa do herpes").
 *
 * NÃO TEM ASSINATURA DE PACIENTE de propósito. É registro do profissional sobre
 * o atendimento, não termo. Pedir assinatura aqui inverteria o sentido do
 * documento: a paciente estaria endossando a observação clínica de outra
 * pessoa.
 *
 * `segments` vazio: evolução serve barbearia, salão, nail e clínica igual.
 */
export const EVOLUCAO_LIVRE_FICHA: NicheFicha = {
  slug: 'evolucao-livre',
  name: 'Evolução do Atendimento',
  sections: [
    {
      kind: 'fields',
      title: 'Registro',
      fields: [
        { name: 'data_registro', label: 'Data do registro', type: 'text' },
        { name: 'profissional', label: 'Profissional responsável', type: 'text' },
        { name: 'procedimento', label: 'Procedimento realizado', type: 'text' },
      ],
    },
    {
      kind: 'fields',
      title: 'Evolução',
      fields: [
        { name: 'evolucao', label: 'Evolução do atendimento', type: 'textarea' },
        { name: 'relato_cliente', label: 'Relato do cliente desde o último atendimento', type: 'textarea' },
        { name: 'conduta', label: 'Conduta adotada e próximos passos', type: 'textarea' },
      ],
    },
  ],
}
