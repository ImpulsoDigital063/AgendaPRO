import type { NicheFicha } from './types'

/**
 * FIOS DE PDO — protocolo completo em uma ficha.
 *
 * Anamnese, termo e pós-cuidados transcritos LITERALMENTE da ficha de papel de
 * uma clínica de estética em uso real (08/08/2026).
 *
 * A anamnese desta ficha é curta de propósito — no papel são três perguntas
 * abertas (tratamento anterior, como foi a experiência, qual a queixa atual) e
 * um parágrafo explicando o que é o fio. Não é descuido da clínica: fio de PDO
 * é procedimento de EXPECTATIVA, e a conversa sobre o que a paciente espera
 * vale mais que mais uma lista de checkbox. Mantive nessa forma.
 */
export const FIOS_PDO_FICHA: NicheFicha = {
  slug: 'fios-pdo',
  name: 'Fios de PDO · Protocolo',
  segments: ['Clínica estética', 'Clínica', 'Estética', 'Estética avançada', 'Biomedicina'],
  sections: [
    {
      kind: 'fields',
      title: 'Anamnese',
      fields: [
        { name: 'tratamento_anterior', label: 'Já efetuou algum tratamento estético? Se sim, qual?', type: 'textarea' },
        { name: 'experiencia', label: 'Como foi a experiência?', type: 'textarea' },
        { name: 'queixa_atual', label: 'Qual a principal queixa atual?', type: 'textarea' },
      ],
    },
    {
      kind: 'term',
      title: 'Sobre o procedimento',
      text:
        'Os fios de PDO são fios compostos de polidioxanona (é uma sutura com substância ' +
        'sintética e biodegradável), que são frequentemente utilizados diante de procedimentos ' +
        'que visam o efeito de lifting facial através de estímulo de colágeno. O uso dos fios ' +
        'tem como principal objetivo a sustentação da pele e a estimulação de colágeno, ' +
        'promovendo assim um aspecto mais rígido, saudável e jovem ao rosto.',
      consents: [
        { name: 'entendeu_procedimento', label: 'Compreendi o que é o procedimento e qual o seu objetivo', required: true },
      ],
    },
    {
      kind: 'health',
      title: 'Contraindicações específicas',
      detailLabel: 'Detalhe os itens marcados',
      items: [
        'Infecção ativa na área a tratar',
        'Doença autoimune não controlada',
        'Distúrbio de coagulação',
        'Gestante ou amamentando',
        'Hipersensibilidade a componente da fórmula',
        'Uso de anticoagulante',
        'Preenchedor definitivo na região',
        'Tendência a queloide',
      ],
    },
    {
      kind: 'fields',
      title: 'Dados do produto',
      fields: [
        { name: 'produto_nome', label: 'Produto / marca', type: 'text' },
        { name: 'produto_tipo', label: 'Tipo de fio (liso, espiculado, cog, screw…)', type: 'text' },
        { name: 'produto_quantidade', label: 'Quantidade de fios', type: 'text' },
        { name: 'produto_lote', label: 'Nº do lote', type: 'text' },
        { name: 'produto_validade', label: 'Validade', type: 'text' },
      ],
    },
    {
      kind: 'mapping',
      title: 'Vetores de tração',
      drawName: 'mapa_vetores',
      background: 'rosto',
      params: [
        { name: 'area_face', label: 'Face — nº de fios', type: 'text' },
        { name: 'area_mandibula', label: 'Mandíbula — nº de fios', type: 'text' },
        { name: 'area_pescoco', label: 'Pescoço — nº de fios', type: 'text' },
        { name: 'area_sobrancelhas', label: 'Sobrancelhas — nº de fios', type: 'text' },
        { name: 'area_malar', label: 'Região malar — nº de fios', type: 'text' },
        { name: 'area_corporal', label: 'Corporal — nº de fios', type: 'text' },
      ],
    },
    {
      kind: 'fields',
      title: 'Observações do atendimento',
      fields: [
        { name: 'observacoes', label: 'Intercorrências, conduta e observações', type: 'textarea' },
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
      title: 'Termo de consentimento informado para aplicação de fios de PDO',
      text:
        'FIOS DE PDO (POLIDIOXANONA)\n' +
        'Os fios de PDO são dispositivos absorvíveis utilizados em procedimentos estéticos para ' +
        'sustentação e estímulo de colágeno na pele. São compostos por polidioxanona, material ' +
        'biocompatível e reabsorvível pelo organismo, amplamente utilizado na área médica.\n' +
        'O procedimento consiste na inserção dos fios na derme ou subderme com o objetivo de ' +
        'promover efeito lifting, melhora da flacidez, estímulo de colágeno e reposicionamento ' +
        'dos tecidos. Os efeitos são progressivos, não sendo imediatos em sua totalidade.\n' +
        'Os fios são gradualmente absorvidos pelo organismo, enquanto estimulam a produção de ' +
        'colágeno, proporcionando melhora da firmeza e qualidade da pele ao longo do tempo.\n' +
        'As áreas mais tratadas incluem face, mandíbula, pescoço, sobrancelhas, região malar e ' +
        'corporal.\n\n' +
        'ORIENTAÇÕES E CUIDADOS PÓS PROCEDIMENTO FIOS DE PDO\n' +
        'As complicações mais frequentes são dor local, edema, equimoses, sensibilidade, leve ' +
        'assimetria, irregularidades na pele e sensação de repuxamento. Na ocorrência de ' +
        'qualquer complicação mais grave, o profissional deverá ser comunicado imediatamente.\n' +
        'A resposta ao tratamento é individual, não sendo possível garantir percentual exato de ' +
        'melhora.\n' +
        'Após o procedimento, pelo período de 48 horas, evitar atividades físicas intensas, ' +
        'exposição solar, manipulação da área tratada e movimentos faciais exagerados.\n' +
        'Evitar dormir de lado ou pressionar a área tratada nos primeiros dias.\n' +
        'Podem ocorrer sensações de desconforto ou dor leve, sendo geralmente transitórias.\n' +
        'Poderão ser necessárias sessões adicionais para atingir o resultado desejado.\n' +
        'A duração dos resultados é variável, podendo durar em média de 8 a 18 meses, dependendo ' +
        'do organismo e hábitos do paciente.\n' +
        'Pacientes com infecção ativa, doenças autoimunes não controladas, distúrbios de ' +
        'coagulação, gestantes, lactantes ou com sensibilidade aos componentes não devem ' +
        'realizar o procedimento.\n' +
        'Irregularidades, assimetrias ou palpação dos fios podem ocorrer temporariamente.\n' +
        'Hematomas podem ocorrer devido à introdução da cânula ou agulha, sendo geralmente ' +
        'autolimitados.\n\n' +
        'TERMO DE CONSENTIMENTO\n' +
        'Autorizo o(a) profissional acima identificado(a) a realizar o procedimento de inserção ' +
        'de fios de PDO.\n' +
        'Declaro que fui devidamente informado(a) sobre o procedimento, sua finalidade, ' +
        'benefícios, limitações, riscos e possíveis complicações, tendo compreendido todas as ' +
        'informações prestadas e recebido esclarecimento adequado para todas as minhas dúvidas.\n' +
        'Declaro que respondi com veracidade todas as informações relacionadas ao meu estado de ' +
        'saúde, incluindo histórico médico, uso de medicamentos, alergias e condições ' +
        'pré-existentes, assumindo responsabilidade pelas informações fornecidas.\n' +
        'Confirmo que meu estado físico e mental é compatível com a realização do procedimento e ' +
        'que estou ciente de que os resultados podem variar de acordo com meu organismo, não ' +
        'sendo garantido resultado específico, caracterizando obrigação de meio e não de ' +
        'resultado.\n' +
        'Estou ciente de que podem ocorrer efeitos adversos como edema, eritema, dor, hematomas, ' +
        'assimetrias, irregularidades, infecção, extrusão do fio, reação inflamatória ou ' +
        'alérgica, entre outros.\n' +
        'Compreendo que os resultados não são permanentes e que poderão variar em duração e ' +
        'intensidade conforme resposta individual e cuidados pós-procedimento.\n' +
        'Declaro que minha decisão é voluntária e que posso revogar este consentimento a ' +
        'qualquer momento antes da realização do procedimento.\n' +
        'Autorizo o tratamento dos meus dados pessoais e sensíveis para fins de registro clínico ' +
        'e cumprimento das obrigações legais, conforme a Lei Geral de Proteção de Dados Lei nº ' +
        '13.709/2018.\n' +
        'O(a) profissional DECLARA que explicou detalhadamente ao paciente o propósito, os ' +
        'benefícios, os riscos e as alternativas do procedimento, bem como disponibilizei tempo ' +
        'suficiente para esclarecimento de dúvidas.',
      consents: [
        { name: 'ciente_riscos', label: 'Fui informado(a) sobre finalidade, riscos e limitações', required: true },
        { name: 'autoriza_procedimento', label: 'Autorizo a realização do procedimento', required: true },
        { name: 'autoriza_dados', label: 'Autorizo o tratamento dos meus dados para registro clínico (LGPD)', required: true },
      ],
    },
    {
      kind: 'term',
      title: 'Orientações pós-cuidados',
      text:
        'ORIENTAÇÕES IMEDIATAS (PRIMEIRAS 24 A 48 HORAS)\n' +
        '• Evite tocar, massagear ou pressionar a região tratada\n' +
        '• Não aplicar maquiagem, cremes ou cosméticos não recomendados pelo profissional\n' +
        '• Evitar exposição solar direta e utilizar protetor solar FPS 50 ou superior\n' +
        '• Não realizar atividades físicas intensas, sauna, piscina ou banho muito quente\n' +
        '• Dormir com a cabeça levemente elevada para reduzir inchaço\n' +
        '• Evitar movimentos exagerados de mastigação, fala ou expressões faciais intensas\n' +
        '• Caso sinta dor ou desconforto, utilize apenas medicamentos indicados pelo ' +
        'profissional\n\n' +
        'APÓS 48 HORAS\n' +
        '• Retomar o uso de cremes e cosméticos apenas com liberação do profissional\n' +
        '• Evitar massagens, procedimentos estéticos ou tratamentos agressivos na região por 15 ' +
        'dias\n' +
        '• Manter a pele limpa, hidratada e protegida com filtro solar\n' +
        '• Evitar manipulação ou qualquer trauma na área tratada\n\n' +
        'REAÇÕES COMUNS\n' +
        '• Leve inchaço, vermelhidão e sensibilidade local\n' +
        '• Pequenos hematomas (manchas roxas) podem aparecer e regridem em poucos dias\n' +
        '• Sensação de repuxamento ou sensibilidade ao toque nos primeiros dias\n\n' +
        'ALERTAS\n' +
        'Procure o profissional imediatamente em caso de:\n' +
        '• Dor intensa e persistente\n' +
        '• Inchaço exagerado ou assimetria acentuada\n' +
        '• Alteração na coloração da pele ou sinais de infecção',
      consents: [
        { name: 'recebeu_orientacoes', label: 'Recebi e compreendi as orientações pós-procedimento', required: true },
      ],
    },
    { kind: 'signature', name: 'assinatura_paciente', label: 'Assinatura do paciente' },
  ],
}
