import type { NicheFicha } from './types'

/**
 * PLANEJAMENTO FULL FACE.
 *
 * Do kit de uma clínica de estética em uso real (08/08/2026): no papel é uma
 * página inteira ocupada pelo rosto anatômico, sem tabela nenhuma. É a ficha da
 * AVALIAÇÃO — vem antes de decidir qual protocolo aplicar, e é o desenho que a
 * profissional mostra pra paciente pra explicar o plano.
 *
 * Por isso o mapeamento vem primeiro e os campos depois, invertendo a ordem dos
 * protocolos: aqui o desenho é o documento, o texto é a legenda dele.
 *
 * Também é a ficha que sustenta o orçamento: paciente que vê o plano desenhado
 * entende por que são três sessões e não uma. No papel esse desenho ficava na
 * pasta; aqui fica no histórico dela e pode ser comparado com o do ano passado.
 */
export const PLANEJAMENTO_FULL_FACE_FICHA: NicheFicha = {
  slug: 'planejamento-full-face',
  name: 'Planejamento Full Face',
  segments: ['Clínica estética', 'Clínica', 'Estética', 'Estética avançada', 'Biomedicina'],
  sections: [
    {
      kind: 'mapping',
      title: 'Planejamento',
      drawName: 'mapa_planejamento',
      background: 'rosto',
      /* Se a clínica tiver a própria arte de planejamento cadastrada, ela vence
         o desenho embutido — mesma regra das outras fichas. */
      imagemChave: 'planejamento-full-face.mapa',
      params: [
        { name: 'queixa_principal', label: 'Queixa principal da paciente', type: 'textarea' },
        { name: 'achados', label: 'Achados da avaliação', type: 'textarea' },
      ],
    },
    {
      kind: 'fields',
      title: 'Plano de tratamento',
      fields: [
        { name: 'protocolo_indicado', label: 'Protocolos indicados', type: 'textarea' },
        { name: 'ordem_execucao', label: 'Ordem de execução e intervalo entre etapas', type: 'textarea' },
        { name: 'sessoes_previstas', label: 'Nº de sessões previstas', type: 'text' },
        { name: 'prazo_estimado', label: 'Prazo estimado do plano', type: 'text' },
        { name: 'investimento_estimado', label: 'Investimento estimado (R$)', type: 'text' },
      ],
    },
    {
      kind: 'fields',
      title: 'Observações',
      fields: [
        { name: 'contraindicacoes_observadas', label: 'Contraindicações ou cuidados observados', type: 'textarea' },
        { name: 'expectativa_paciente', label: 'Expectativa da paciente e alinhamento feito', type: 'textarea' },
      ],
    },
    {
      kind: 'term',
      title: 'Ciência do planejamento',
      text:
        'O planejamento acima é uma proposta técnica baseada na avaliação realizada nesta data. ' +
        'Pode ser ajustado ao longo do tratamento conforme a resposta individual, e não ' +
        'constitui garantia de resultado. Cada procedimento do plano terá seu próprio termo de ' +
        'consentimento, assinado antes da execução.',
      consents: [
        { name: 'ciente_planejamento', label: 'Tomei ciência do planejamento proposto', required: true },
      ],
    },
    { kind: 'signature', name: 'assinatura_paciente', label: 'Assinatura do paciente' },
  ],
}
