import type { FichaParam, FichaSection, NicheFicha } from './types'

/**
 * ANAMNESE DA WANESSA SILVA ESTÉTICA AVANÇADA — feminina e masculina.
 *
 * Pedido dela em 14/10/2026: mandou as duas fichas de papel (.docx) que usa
 * com cliente novo, "pra quando for cliente novo já preencher", e quer se
 * livrar do papel. Variante EXCLUSIVA do negócio dela (`businessSlugs`) — é o
 * padrão DELA, não muda a Estética Facial das outras clínicas.
 *
 * As perguntas são TRANSCRIÇÃO LITERAL do papel. O formato dela é "( ) Não.
 * Se sim, especifique", então cada pergunta vira um Não/Sim + o campo de
 * especificar, em vez do checklist "marque o que se aplica" das outras fichas:
 * é assim que ela lê a pergunta pra cliente.
 *
 * As duas folhas só diferem em 3 perguntas (gestante, ciclo menstrual e
 * método contraceptivo), que a masculina não tem. Por isso nascem do mesmo
 * construtor: corrigir uma pergunta corrige nas duas.
 *
 * Fica FORA daqui, de propósito:
 *  - Nome, nascimento, contato, e-mail e profissão: vêm do cadastro.
 *  - "Avaliação profissional", home care, produtos e plano de tratamento: no
 *    papel são outra folha, assinada pela profissional e preenchida ao longo
 *    do tratamento. A anamnese é assinada pela cliente no primeiro dia e
 *    trava ao assinar — juntar as duas travaria o plano junto. Ver
 *    wanessa-plano-tratamento.ts.
 *  - A tabela Data / Procedimento / Valor / Desconto: é o histórico de
 *    atendimentos que o sistema já monta sozinho na aba Atividades da cliente.
 */

/* 'clinica-teste-fichas' = conta espelho dos testes de ficha (scripts/_e2e-*), não é cliente. */
const WANESSA = ['wanessasilvaestetica', 'clinica-teste-fichas']

/** "( ) Não. Se sim, por favor, especifique: ____" */
function simNao(name: string, label: string, especifique = 'Se sim, por favor, especifique'): FichaParam[] {
  return [
    { name, label, type: 'select', options: ['Não', 'Sim'] },
    { name: `${name}_qual`, label: especifique, type: 'text' },
  ]
}

function secoes(sexo: 'feminina' | 'masculina'): FichaSection[] {
  const fem = sexo === 'feminina'
  return [
    {
      kind: 'fields',
      title: 'Saúde',
      fields: [
        ...simNao('consulta_medica', 'Desde o ano passado passou em alguma consulta com dermatologista ou médico de outra especialidade?'),
        ...simNao('problema_saude', 'Teve algum problema de saúde no passado ou presente?'),
        {
          name: 'medicacoes',
          label:
            'Liste qualquer medicação, suplemento, vitaminas diuréticas, pílulas para emagrecimento, isotretinoína, contraceptivo, antidepressivos e etc. que você esteja sobre prescrição',
          type: 'textarea',
        },
        ...(fem ? simNao('gestante', 'É gestante?', 'Se sim, por favor, especifique quantas semanas') : []),
        ...simNao('implantes', 'Possui implantes metálicos, marcapasso, próteses dentárias ou piercings?'),
        ...simNao('alergia', 'Possui algum tipo de alergia?'),
        ...simNao('cardiaco_oncologico', 'Tem problemas cardíacos ou oncológicos?'),
        ...simNao('diabetes', 'Tem diabetes?'),
        ...(fem
          ? ([
              { name: 'ciclo_regular', label: 'Ciclo menstrual regular?', type: 'select', options: ['Sim', 'Não'] },
              ...simNao('contraceptivo', 'Usa algum método contraceptivo?', 'Se sim, especifique'),
            ] as FichaParam[])
          : []),
      ],
    },
    {
      kind: 'fields',
      title: 'Hábitos',
      fields: [
        { name: 'fuma', label: 'Fuma?', type: 'select', options: ['Sim', 'Não'] },
        ...simNao('atividade_fisica', 'Pratica atividade física?'),
        { name: 'intestino_regular', label: 'Funcionamento intestinal regular?', type: 'select', options: ['Sim', 'Não'] },
        ...simNao('dieta_restritiva', 'Segue algum tipo de dieta restritiva?'),
        { name: 'agua_dia', label: 'Qual a quantidade de água que ingere diariamente?', type: 'text' },
        { name: 'sono', label: 'Dorme bem à noite? Por quantas horas?', type: 'text' },
        {
          name: 'estresse',
          label: 'Avalie o nível do seu estresse dentro de uma escala de 1 a 5 (1=pouco estresse, 5=muito estresse)',
          type: 'select',
          options: ['1', '2', '3', '4', '5'],
        },
      ],
    },
    {
      kind: 'fields',
      title: 'Sol e cuidados com a pele',
      fields: [
        { name: 'toma_sol', label: 'Você costuma tomar sol?', type: 'select', options: ['Sim', 'Não'] },
        ...simNao('protetor_solar', 'Usa protetor solar?'),
        { name: 'reaplica', label: 'Reaplica ao longo do dia? Quantas vezes?', type: 'text' },
        { name: 'queima_facil', label: 'Você se queima facilmente com exposição ao sol?', type: 'select', options: ['Sim', 'Não'] },
        {
          name: 'fototipo',
          label:
            'Fototipo – reatividade à luz ultra violeta (Escala Fitzpatrick) – Em relação a sua facilidade em se bronzear',
          type: 'select',
          /* No papel o VI vem antes do V (deslize de digitação). Aqui segue a
             escala na ordem; o texto de cada tipo é o dela. */
          options: [
            'I – Ao se expor ao sol: nunca bronzeia - Branco / Loiro',
            'II – Ao se expor ao sol: dificilmente bronzeia - Branco',
            'III – Ao se expor ao sol: bronzeia moderadamente - Moreno Claro',
            'IV – Ao se expor ao sol: bronzeia facilmente - Moreno Moderado',
            'V – Ao se expor ao sol: bronzeia intensamente - Moreno Escuro',
            'VI – Ao se expor ao sol: não se queima - Negro',
          ],
        },
        ...simNao('produtos_pele', 'Utiliza diariamente produtos de cuidado com a pele?'),
        { name: 'queixas_pele', label: 'Quais a queixas sobre sua pele?', type: 'textarea' },
      ],
    },
    {
      kind: 'fields',
      title: 'Tratamentos anteriores',
      fields: [
        ...simNao(
          'tratamento_anterior',
          'Já fez algum tratamento estético anterior, peeling químico, microdermoabrasão, laser, fototerapia, procedimentos invasivos ou qualquer outro procedimento cosmético no último mês?',
        ),
        { name: 'ultima_limpeza', label: 'Quando foi sua última limpeza de pele?', type: 'text' },
        { name: 'satisfeito_limpeza', label: `Ficou ${fem ? 'satisfeita' : 'satisfeito'} com o resultado da sua última limpeza de pele?`, type: 'select', options: ['Sim', 'Não'] },
        { name: 'satisfeito_limpeza_qual', label: 'Se não, por favor, especifique', type: 'text' },
      ],
    },
    {
      kind: 'fields',
      title: 'Fotos e vídeos',
      fields: [
        {
          name: 'autoriza_fotos',
          label: fem
            ? 'Autoriza realizar fotos/vídeos para documentação do prontuário e divulgação de resultados em mídias sociais?'
            : 'Autoriza realizar fotos/vídeos para documentação do prontuário e/ou divulgação de resultados em mídias sociais?',
          type: 'select',
          options: ['Sim', 'Não'],
        },
      ],
    },
    { kind: 'signature', name: 'assinatura_paciente', label: 'Assinatura do Paciente' },
  ]
}

export const WANESSA_ANAMNESE_FEMININA: NicheFicha = {
  slug: 'wanessa-anamnese-feminina',
  name: 'Anamnese · Feminina',
  businessSlugs: WANESSA,
  clientePreenche: true,
  sections: secoes('feminina'),
}

export const WANESSA_ANAMNESE_MASCULINA: NicheFicha = {
  slug: 'wanessa-anamnese-masculina',
  name: 'Anamnese · Masculina',
  businessSlugs: WANESSA,
  clientePreenche: true,
  sections: secoes('masculina'),
}
