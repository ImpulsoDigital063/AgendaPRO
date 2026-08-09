import type { NicheFicha } from './types'

/**
 * CONTRATO DE PRESTAÇÃO DE SERVIÇOS ESTÉTICOS.
 *
 * Transcrito literalmente do kit de uma clínica de estética em uso real
 * (08/08/2026).
 *
 * A cláusula que carrega o contrato inteiro é a de CONDIÇÕES DOS PROCEDIMENTOS:
 * é ali que fica escrito que estética é obrigação de MEIO e não de resultado.
 * É a diferença entre "não ficou como eu queria, me devolve o dinheiro" e uma
 * conversa sobre sessão adicional. Sem contrato assinado, essa discussão começa
 * do zero e a palavra de uma vale a da outra.
 *
 * Vale pra qualquer negócio que venda serviço de aparência com expectativa
 * envolvida, não só clínica — por isso `segments` fica vazio.
 */
export const CONTRATO_SERVICOS_FICHA: NicheFicha = {
  slug: 'contrato-servicos',
  name: 'Contrato de Prestação de Serviços',
  sections: [
    {
      kind: 'fields',
      title: 'Identificação das partes',
      fields: [
        { name: 'contratante_documento', label: 'Documento do contratante (RG/CPF)', type: 'text' },
        { name: 'contratante_endereco', label: 'Endereço do contratante', type: 'text' },
        { name: 'contratada_nome', label: 'Contratada — nome / razão social', type: 'text' },
        { name: 'contratada_responsavel', label: 'Responsável técnico', type: 'text' },
        { name: 'contratada_registro', label: 'Registro profissional (se aplicável)', type: 'text' },
      ],
    },
    {
      kind: 'fields',
      title: 'Objeto e valores',
      fields: [
        { name: 'servicos_contratados', label: 'Serviços contratados', type: 'textarea' },
        { name: 'valor_total', label: 'Valor acordado (R$)', type: 'text' },
        { name: 'forma_pagamento', label: 'Forma de pagamento', type: 'text' },
        { name: 'vigencia', label: 'Vigência / previsão de conclusão', type: 'text' },
      ],
    },
    {
      kind: 'term',
      title: 'Contrato de prestação de serviços estéticos',
      text:
        'OBJETO DO CONTRATO\n' +
        'O presente contrato tem por objeto a prestação de serviços estéticos realizados pela ' +
        'contratada, conforme avaliação prévia e planejamento individualizado, podendo incluir ' +
        'procedimentos faciais ou corporais tais como toxina botulínica, preenchimentos, ' +
        'bioestimuladores, fios de sustentação, tratamentos de pele, procedimentos de ' +
        'embelezamento ou outras técnicas estéticas aplicáveis.\n' +
        'Os procedimentos serão realizados de acordo com a avaliação técnica da profissional ' +
        'responsável e com as necessidades e características individuais da contratante.\n\n' +
        'RESPONSABILIDADES DA CONTRATADA\n' +
        'A contratada compromete-se a executar os procedimentos utilizando produtos e materiais ' +
        'adequados e regularizados, respeitando as normas de biossegurança, higiene e ética ' +
        'profissional.\n' +
        'A contratada compromete-se a prestar informações claras sobre os procedimentos, ' +
        'orientações pré e pós-procedimento, bem como realizar acompanhamento quando ' +
        'necessário.\n' +
        'A contratada atuará sempre dentro dos limites técnicos e científicos reconhecidos para ' +
        'cada procedimento estético.\n\n' +
        'RESPONSABILIDADES DA CONTRATANTE\n' +
        'A contratante declara que fornecerá informações verdadeiras e completas sobre seu ' +
        'estado de saúde, histórico médico, alergias, uso de medicamentos e procedimentos ' +
        'estéticos ou médicos realizados anteriormente.\n' +
        'A contratante compromete-se a seguir corretamente todas as orientações fornecidas pela ' +
        'profissional antes e após a realização dos procedimentos.\n' +
        'A contratante compromete-se a comparecer aos retornos ou avaliações quando indicados ' +
        'pela profissional responsável.\n\n' +
        'CONDIÇÕES DOS PROCEDIMENTOS\n' +
        'A contratante declara estar ciente de que procedimentos estéticos possuem limitações e ' +
        'resultados variáveis, que dependem de fatores individuais como características da pele, ' +
        'metabolismo, hábitos de vida e cuidados após o procedimento.\n' +
        'A contratante reconhece que podem ocorrer reações transitórias como vermelhidão, ' +
        'inchaço, sensibilidade, hematomas, assimetrias temporárias ou outras reações compatíveis ' +
        'com os procedimentos realizados.\n' +
        'A contratante compreende que procedimentos estéticos não possuem garantia de resultados ' +
        'exatos ou permanentes, podendo ser necessárias sessões adicionais ou manutenções ' +
        'periódicas conforme orientação da profissional responsável.\n\n' +
        'VALOR E CONDIÇÕES DE PAGAMENTO\n' +
        'O pagamento refere-se exclusivamente aos serviços estéticos contratados conforme ' +
        'avaliação e planejamento realizados pela profissional responsável.\n\n' +
        'CANCELAMENTO E DESISTÊNCIA\n' +
        'A contratante reconhece que, após a realização do procedimento, não será possível o ' +
        'cancelamento ou devolução integral dos valores pagos, considerando a natureza ' +
        'personalizada e imediata dos serviços estéticos.\n' +
        'Em caso de desistência antes da realização do procedimento, poderão ser aplicadas ' +
        'condições administrativas previamente informadas pela contratada, respeitando a ' +
        'legislação vigente.\n\n' +
        'VIGÊNCIA\n' +
        'O presente contrato entra em vigor na data de sua assinatura e permanecerá válido até a ' +
        'conclusão dos serviços contratados e do acompanhamento pós-procedimento, quando ' +
        'aplicável.\n\n' +
        'FORO\n' +
        'Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o ' +
        'foro da comarca do estabelecimento, renunciando a qualquer outro, por mais privilegiado ' +
        'que seja.',
      consents: [
        { name: 'aceita_contrato', label: 'Li e aceito as condições do contrato', required: true },
        { name: 'ciente_obrigacao_meio', label: 'Estou ciente de que não há garantia de resultado exato ou permanente', required: true },
        { name: 'ciente_cancelamento', label: 'Estou ciente das condições de cancelamento e desistência', required: true },
      ],
    },
    {
      /* O papel dela tem duas linhas de testemunha. No sistema elas viram campo
         de nome, e não de assinatura: testemunha que não estava na sala não
         assina nada — quem colhe assinatura de testemunha ausente enfraquece o
         documento em vez de reforçar. */
      kind: 'fields',
      title: 'Testemunhas (opcional)',
      fields: [
        { name: 'testemunha_1', label: 'Testemunha 1 — nome e documento', type: 'text' },
        { name: 'testemunha_2', label: 'Testemunha 2 — nome e documento', type: 'text' },
      ],
    },
    { kind: 'signature', name: 'assinatura_paciente', label: 'Assinatura do contratante' },
  ],
}
