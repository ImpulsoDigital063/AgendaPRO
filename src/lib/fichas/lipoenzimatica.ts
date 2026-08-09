import type { NicheFicha } from './types'

/**
 * LIPOENZIMÁTICA (enzimas lipolíticas / intradermoterapia corporal) — protocolo
 * completo.
 *
 * Montada a partir do serviço que a clínica já vende ("Lipoenzimática"), no
 * mesmo esqueleto dos protocolos transcritos do kit dela. O texto do termo é
 * escrito daqui; quando ela mandar a folha dela deste procedimento, é pra
 * trocar por ela.
 *
 * DUAS COISAS SEPARAM ESTA FICHA DAS FACIAIS:
 *
 * 1. O MAPEAMENTO É CORPORAL (frente e costas). Flanco e culote só existem de
 *    costas, e "aplicado no abdômen" sem marcação não diz de que lado nem em
 *    que altura.
 *
 * 2. TEM PERIMETRIA. Este é o único protocolo do pacote cujo resultado é
 *    MEDIDO, não observado — e a medida é o que sustenta a venda do pacote
 *    inteiro. Paciente que vê "cintura 84 → 81" continua; paciente que ouve
 *    "acho que diminuiu" some na terceira sessão. Por isso as medidas ficam em
 *    campo próprio, e não perdidas dentro das observações.
 */
export const LIPOENZIMATICA_FICHA: NicheFicha = {
  slug: 'lipoenzimatica',
  name: 'Lipoenzimática · Protocolo',
  segments: ['Clínica estética', 'Clínica', 'Estética', 'Estética avançada', 'Biomedicina'],
  sections: [
    {
      kind: 'health',
      title: 'Contraindicações específicas',
      detailLabel: 'Detalhe os itens marcados',
      items: [
        'Gestante ou amamentando',
        'Doença renal',
        'Doença hepática',
        'Doença cardíaca',
        'Distúrbio de coagulação ou uso de anticoagulante',
        'Diabetes descompensada',
        'Doença autoimune não controlada',
        'Infecção, ferida ou dermatite ativa na área',
        'Alergia a algum dos ativos (fosfatidilcolina, desoxicolato, cafeína…)',
        'Hérnia na região a tratar',
        'Uso de marca-passo',
        'Histórico de trombose',
        'Cirurgia recente na área',
      ],
    },
    {
      kind: 'fields',
      title: 'Avaliação inicial',
      fields: [
        { name: 'queixa', label: 'Queixa principal', type: 'textarea' },
        { name: 'peso', label: 'Peso (kg)', type: 'text' },
        { name: 'altura', label: 'Altura (m)', type: 'text' },
        { name: 'grau_adiposidade', label: 'Adiposidade localizada', type: 'select', options: ['Leve', 'Moderada', 'Acentuada'] },
        { name: 'grau_celulite', label: 'Grau de celulite', type: 'select', options: ['Não possui', 'Grau I', 'Grau II', 'Grau III', 'Grau IV'] },
        { name: 'flacidez', label: 'Flacidez', type: 'select', options: ['Não possui', 'Leve', 'Moderada', 'Acentuada'] },
      ],
    },
    {
      kind: 'fields',
      title: 'Dados do produto',
      fields: [
        { name: 'ativo_nome', label: 'Ativo / associação enzimática', type: 'text' },
        { name: 'ativo_lote', label: 'Nº do lote', type: 'text' },
        { name: 'ativo_validade', label: 'Validade', type: 'text' },
        { name: 'volume_total', label: 'Volume total aplicado (ml)', type: 'text' },
        { name: 'tecnica', label: 'Técnica (intradérmica / subcutânea / ponto a ponto)', type: 'text' },
        { name: 'sessao_numero', label: 'Nº da sessão do plano', type: 'text' },
      ],
    },
    {
      kind: 'mapping',
      title: 'Áreas de aplicação',
      drawName: 'mapa_corpo',
      /* Silhueta frente/costas — ver drawCorpoFigura em DrawCanvas. */
      background: 'corpo',
      imagemChave: 'lipoenzimatica.mapa_corpo',
      params: [
        { name: 'vol_abdomen', label: 'Abdômen (ml)', type: 'text' },
        { name: 'vol_flancos', label: 'Flancos (ml)', type: 'text' },
        { name: 'vol_culote', label: 'Culote (ml)', type: 'text' },
        { name: 'vol_coxas', label: 'Coxas (ml)', type: 'text' },
        { name: 'vol_gluteos', label: 'Glúteos (ml)', type: 'text' },
        { name: 'vol_bracos', label: 'Braços (ml)', type: 'text' },
        { name: 'vol_costas', label: 'Costas / sutiã (ml)', type: 'text' },
        { name: 'vol_papada', label: 'Papada (ml)', type: 'text' },
      ],
    },
    {
      kind: 'fields',
      title: 'Perimetria',
      fields: [
        { name: 'per_cintura', label: 'Cintura (cm)', type: 'text' },
        { name: 'per_abdomen', label: 'Abdômen (cm)', type: 'text' },
        { name: 'per_quadril', label: 'Quadril (cm)', type: 'text' },
        { name: 'per_coxa_dir', label: 'Coxa direita (cm)', type: 'text' },
        { name: 'per_coxa_esq', label: 'Coxa esquerda (cm)', type: 'text' },
        { name: 'per_braco_dir', label: 'Braço direito (cm)', type: 'text' },
        { name: 'per_braco_esq', label: 'Braço esquerdo (cm)', type: 'text' },
        { name: 'per_referencia', label: 'Ponto de referência da medição (altura do umbigo, etc.)', type: 'text' },
      ],
    },
    {
      kind: 'fields',
      title: 'Observações do atendimento',
      fields: [
        { name: 'observacoes', label: 'Intercorrências, conduta e observações', type: 'textarea' },
        { name: 'orientacao_complementar', label: 'Orientação complementar (drenagem, atividade física, alimentação)', type: 'textarea' },
      ],
    },
    {
      kind: 'term',
      title: 'Termo de consentimento livre e esclarecido — lipoenzimática',
      text:
        'LIPOENZIMÁTICA\n' +
        'A lipoenzimática consiste na aplicação injetável de ativos enzimáticos e lipolíticos no ' +
        'tecido subcutâneo, com o objetivo de auxiliar na redução de gordura localizada, melhora ' +
        'do contorno corporal e da aparência da celulite.\n' +
        'O resultado é gradual e depende do número de sessões, da resposta individual do ' +
        'organismo e, de forma determinante, dos hábitos de vida do paciente — alimentação, ' +
        'ingestão de água e atividade física. O procedimento NÃO substitui tratamento para ' +
        'obesidade, não é método de emagrecimento e não substitui acompanhamento médico ou ' +
        'nutricional.\n\n' +
        'ORIENTAÇÕES E CUIDADOS PÓS PROCEDIMENTO LIPOENZIMÁTICA\n' +
        'As reações esperadas são dor local, ardência durante a aplicação, vermelhidão, inchaço, ' +
        'endurecimento temporário, equimoses (manchas roxas) e sensibilidade ao toque por alguns ' +
        'dias. Na ocorrência de qualquer complicação mais grave, o profissional deverá ser ' +
        'comunicado imediatamente.\n' +
        'A resposta ao tratamento é individual, não sendo possível garantir percentual exato de ' +
        'redução de medidas.\n' +
        'Poderão ser necessárias múltiplas sessões, conforme o plano de tratamento definido pela ' +
        'profissional.\n' +
        'Podem ocorrer nódulos transitórios, assimetrias temporárias e, raramente, necrose ' +
        'cutânea, infecção ou reação alérgica aos ativos.\n' +
        'Pacientes com doença renal, hepática ou cardíaca, distúrbios de coagulação, gestantes, ' +
        'lactantes ou com hipersensibilidade aos componentes não devem realizar o procedimento.\n' +
        'A ingestão adequada de água e a prática de atividade física potencializam o resultado e ' +
        'fazem parte do tratamento.\n\n' +
        'TERMO DE CONSENTIMENTO\n' +
        'Autorizo o(a) profissional acima identificado(a) a realizar o procedimento de ' +
        'lipoenzimática.\n' +
        'Declaro que fui devidamente informado(a) sobre o procedimento, sua finalidade, ' +
        'benefícios, limitações, riscos e possíveis complicações, tendo compreendido todas as ' +
        'informações prestadas e recebido esclarecimento adequado para todas as minhas dúvidas.\n' +
        'Declaro que respondi com veracidade todas as informações relacionadas ao meu estado de ' +
        'saúde, incluindo histórico médico, uso de medicamentos, alergias e condições ' +
        'pré-existentes, assumindo responsabilidade pelas informações fornecidas.\n' +
        'Estou ciente de que este procedimento não é tratamento para obesidade, não é método de ' +
        'emagrecimento e que o resultado depende diretamente dos meus hábitos de vida.\n' +
        'Confirmo que estou ciente de que os resultados podem variar de acordo com meu ' +
        'organismo, não sendo garantido resultado específico, caracterizando obrigação de meio e ' +
        'não de resultado.\n' +
        'Declaro que minha decisão é voluntária e que posso revogar este consentimento a ' +
        'qualquer momento antes da realização do procedimento.\n' +
        'Autorizo o tratamento dos meus dados pessoais e sensíveis para fins de registro clínico ' +
        'e cumprimento das obrigações legais, conforme a Lei Geral de Proteção de Dados Lei nº ' +
        '13.709/2018.',
      consents: [
        { name: 'ciente_riscos', label: 'Fui informado(a) sobre finalidade, riscos e limitações', required: true },
        { name: 'ciente_nao_emagrecimento', label: 'Estou ciente de que não é método de emagrecimento e que depende dos meus hábitos', required: true },
        { name: 'autoriza_procedimento', label: 'Autorizo a realização do procedimento', required: true },
        { name: 'autoriza_dados', label: 'Autorizo o tratamento dos meus dados para registro clínico (LGPD)', required: true },
      ],
    },
    {
      kind: 'term',
      title: 'Orientações pós-cuidados',
      text:
        'PRIMEIRAS 24 A 48 HORAS\n' +
        '• Não massagear, apertar ou manipular as áreas aplicadas, salvo orientação específica.\n' +
        '• Evitar exposição solar direta, sauna, banho muito quente e piscina.\n' +
        '• Evitar exercícios físicos intensos.\n' +
        '• Não ingerir bebidas alcoólicas.\n' +
        '• Compressas frias podem ser usadas para aliviar dor e inchaço.\n\n' +
        'NOS DIAS SEGUINTES\n' +
        '• Beber no mínimo 2 litros de água por dia — a eliminação do que foi mobilizado depende ' +
        'disso.\n' +
        '• Retomar atividade física conforme liberação da profissional.\n' +
        '• Manter alimentação equilibrada durante todo o plano de tratamento.\n' +
        '• Realizar drenagem linfática se indicada pela profissional.\n' +
        '• Usar malha compressiva se orientado.\n\n' +
        'REAÇÕES ESPERADAS\n' +
        '• Dor e sensibilidade ao toque nas áreas aplicadas por 2 a 5 dias.\n' +
        '• Inchaço e endurecimento temporário da região.\n' +
        '• Equimoses (manchas roxas) nos pontos de aplicação.\n' +
        '• Aumento da frequência urinária nas primeiras horas.\n\n' +
        'PROCURE O PROFISSIONAL CASO OCORRA\n' +
        '• Dor intensa e crescente em vez de diminuir com os dias.\n' +
        '• Vermelhidão exagerada, calor local, secreção ou febre.\n' +
        '• Nódulos endurecidos que não regridem.\n' +
        '• Alteração de cor da pele nos pontos aplicados.',
      consents: [
        { name: 'recebeu_orientacoes', label: 'Recebi e compreendi as orientações pós-procedimento', required: true },
      ],
    },
    { kind: 'signature', name: 'assinatura_paciente', label: 'Assinatura do paciente' },
  ],
}
