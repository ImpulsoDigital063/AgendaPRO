import type { NicheFicha } from './types'

/**
 * LOBULOPLASTIA NÃO CIRÚRGICA & FURO HUMANIZADO DA ORELHA.
 *
 * Modelada sobre a ficha da Dra Elaine Rebolo (08/08/2026). Conteúdo genérico:
 * qualquer clínica que faça o procedimento usa.
 *
 * O MAPEAMENTO É O CORAÇÃO DESTA FICHA. No papel dela são quatro orelhas
 * desenhadas — duas pra marcar a lobuloplastia, duas pro furo — e é ali que a
 * informação clínica de verdade fica: onde está o rasgo, onde vai o furo.
 * Reproduzir orelha desenhando no canvas sairia caricato, então o campo aceita
 * o DIAGRAMA DO PRÓPRIO NEGÓCIO como fundo (`imagemChave`), e a profissional
 * marca por cima com o dedo. Quem tem a arte usa a arte; quem não tem, marca
 * na folha em branco e descreve ao lado.
 */
export const LOBULOPLASTIA_FICHA: NicheFicha = {
  slug: 'lobuloplastia',
  name: 'Lobuloplastia & Furo Humanizado',
  segments: ['Clínica estética', 'Clínica', 'Estética', 'Estética avançada', 'Biomedicina'],
  sections: [
    {
      kind: 'health',
      title: 'Dados gerais',
      detailLabel: 'Detalhe os itens marcados (qual alergia, qual medicamento, qual condição)',
      items: [
        'Tem alergia a medicamentos, alimentos ou outros',
        'Faz algum tratamento de saúde',
        'Faz uso de medicações',
        'Faz uso de anticoagulante',
        'Tem histórico de queloide ou cicatrização alterada',
        'Tem alguma condição de saúde importante',
        'Está grávida ou amamentando',
        'É alérgica a níquel, metais ou anestésicos',
      ],
    },
    {
      kind: 'fields',
      title: 'Lobuloplastia não cirúrgica',
      fields: [
        { name: 'incomodo_lobulo', label: 'O que incomoda no lóbulo (rasgado, alargado, assimétrico, fino)', type: 'textarea' },
        { name: 'tempo_incomodo', label: 'Há quanto tempo ocorre esse incômodo', type: 'text' },
        { name: 'correcao_anterior', label: 'Já realizou tentativa de correção anterior? Descreva', type: 'textarea' },
      ],
    },
    {
      kind: 'mapping',
      title: 'Marcação — lobuloplastia',
      drawName: 'mapa_lobulo',
      /* Sem diagrama cadastrado, cai em folha branca: melhor uma folha limpa
         do que um desenho de orelha mal feito por cima da anatomia. */
      background: 'blank',
      imagemChave: 'lobuloplastia.mapa_lobulo',
      params: [
        { name: 'lobulo_direita', label: 'Orelha direita — observações', type: 'textarea' },
        { name: 'lobulo_esquerda', label: 'Orelha esquerda — observações', type: 'textarea' },
      ],
    },
    {
      kind: 'fields',
      title: 'Furo humanizado da orelha',
      fields: [
        { name: 'ja_possui_furos', label: 'Já possui outros furos? Cicatrizaram bem?', type: 'textarea' },
        { name: 'expectativa', label: 'Qual a expectativa com o procedimento', type: 'textarea' },
      ],
    },
    /* Duas marcações separadas, não uma só. No papel dela são dois pares de
       orelhas em blocos distintos — e num celular de 393px as quatro juntas
       num canvas viram miniatura: não dá pra marcar com o dedo onde está o
       rasgo. Separado, cada par ocupa a largura inteira. */
    {
      kind: 'mapping',
      title: 'Marcação — furo humanizado',
      drawName: 'mapa_furo',
      background: 'blank',
      imagemChave: 'lobuloplastia.mapa_furo',
      params: [
        { name: 'furo_direita', label: 'Orelha direita — observações', type: 'textarea' },
        { name: 'furo_esquerda', label: 'Orelha esquerda — observações', type: 'textarea' },
      ],
    },
    {
      kind: 'term',
      title: 'Termo de responsabilidade',
      text:
        'Estou ciente e de acordo com todas as informações acima relacionadas e declaro não ' +
        'ter omitido nenhuma informação de saúde que possa prejudicar a avaliação do ' +
        'profissional.',
      consents: [
        { name: 'ciente', label: 'Estou ciente e de acordo com as informações acima', required: true },
      ],
    },
    {
      kind: 'term',
      title: 'Cuidados e orientações',
      text:
        'Siga todas as orientações pré e pós-procedimento.\n' +
        'Evite manipular a área tratada.\n' +
        'Em caso de dúvidas ou reações, entre em contato.',
      consents: [
        { name: 'recebeu_orientacoes', label: 'Recebi e compreendi as orientações', required: true },
      ],
    },
    { kind: 'signature', name: 'assinatura_paciente', label: 'Assinatura do paciente' },
  ],
}
