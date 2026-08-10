import type { NicheFicha } from './types'

/**
 * Ficha de anamnese de estética facial (limpeza de pele) — 2ª ficha de nicho.
 * Espelha a ficha de papel da Rosy. Sem dados pessoais (vêm do cadastro ·
 * pedido da Rosy no áudio 26/06).
 *
 * GANHOU TERMO E ASSINATURA em 09/08/2026. Nasceu sem porque a folha de papel
 * da Rosy não tinha — mas era a única das 15 fichas do sistema que colhia dado
 * de saúde (câncer de pele, gestação, medicação em uso) sem declaração de
 * veracidade e sem assinatura. Isso é dado sensível pela LGPD, e uma anamnese
 * que ninguém assinou não sustenta nada numa discussão: não dá pra provar que
 * a cliente respondeu aquilo.
 *
 * A ANÁLISE VISUAL É O QUE ELA TEM DE MELHOR e é por isso que ela continua
 * valendo pra clínica mesmo com o Histórico Clínico existindo: cor da pele,
 * biótipo, Glogau e textura são avaliação de pele, que o Histórico Clínico não
 * cobre. As duas se complementam em vez de competir — o Histórico é o "quem é
 * essa paciente", esta é o "como está a pele dela hoje".
 *
 * Os campos novos são ADITIVOS: resposta já preenchida antes desta data
 * continua abrindo normal, com os campos novos em branco.
 */
export const ESTETICA_FACIAL_FICHA: NicheFicha = {
  slug: 'estetica-facial',
  name: 'Estética Facial · Anamnese',
  segments: ['Salão de beleza', 'Clínica estética', 'Nail designer', 'Manicure'],
  sections: [
    {
      kind: 'health',
      title: 'Saúde / histórico',
      detailLabel: 'Informação adicional · detalhar os marcados (qual medicamento, alergia, fator do filtro, etc.)',
      items: [
        'Fez tratamento estético anterior',
        'Alérgico a algum medicamento',
        'Faz uso de algum medicamento',
        'Faz uso regular de filtro solar',
        'Usa ácido ou peeling químico',
        'Já teve câncer de pele',
        'Casos de câncer de pele na família',
        'Grávida ou amamentando',
      ],
    },
    {
      kind: 'fields',
      title: 'Análise visual',
      fields: [
        { name: 'cor_pele', label: 'Cor da pele', type: 'select', options: ['Branca', 'Parda', 'Preta'] },
        { name: 'biotipo', label: 'Biótipo', type: 'select', options: ['Normal', 'Mista', 'Oleosa', 'Seca'] },
        { name: 'hidratacao', label: 'Grau de hidratação', type: 'select', options: ['Hidratada', 'Semi-hidratada', 'Desidratada'] },
        { name: 'acne', label: 'Acne', type: 'select', options: ['Não', 'Grau I', 'Grau II', 'Grau III'] },
        { name: 'textura', label: 'Textura da pele', type: 'select', options: ['Fina', 'Áspera', 'Normal', 'Com rugas', 'Espessa', 'Flácida'] },
        { name: 'glogau', label: 'Grau de envelhecimento (Glogau)', type: 'select', options: ['Leve', 'Moderado', 'Avançado', 'Severo'] },
        { name: 'rugas', label: 'Rugas', type: 'select', options: ['Superficiais', 'Médias', 'Profundas'] },
        { name: 'rugas_onde', label: 'Rugas — onde?', type: 'text' },
      ],
    },
    {
      kind: 'fields',
      title: 'Tratamento realizado',
      fields: [
        { name: 'tratamento', label: 'Tratamento realizado', type: 'textarea' },
        { name: 'produtos_usados', label: 'Produtos e ativos utilizados', type: 'textarea' },
        { name: 'orientacoes', label: 'Orientações e home care', type: 'textarea' },
      ],
    },
    {
      /* Texto curto de propósito. Isto é anamnese de limpeza de pele, não
         procedimento injetável — encher de cláusula aqui faria a profissional
         pular a leitura, que é o oposto do que o termo serve. */
      kind: 'term',
      title: 'Declaração e orientações',
      text:
        'Declaro que as informações prestadas nesta ficha são verdadeiras e que não omiti ' +
        'nenhuma informação de saúde, alergia ou uso de medicamento que possa interferir na ' +
        'segurança do procedimento.\n\n' +
        'Fui orientado(a) de que o resultado depende das características individuais da minha ' +
        'pele e dos cuidados em casa, em especial o uso de protetor solar, e que podem ocorrer ' +
        'vermelhidão, ardência leve e descamação nos dias seguintes.\n\n' +
        'Comprometo-me a informar o(a) profissional sobre qualquer alteração no meu estado de ' +
        'saúde ou reação após o atendimento.',
      consents: [
        { name: 'veracidade', label: 'Confirmo que as informações acima são verdadeiras', required: true },
        { name: 'recebeu_orientacoes', label: 'Recebi e compreendi as orientações', required: true },
      ],
    },
    { kind: 'signature', name: 'assinatura_paciente', label: 'Assinatura do cliente' },
  ],
}
