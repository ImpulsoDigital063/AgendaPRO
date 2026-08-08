import type { NicheFicha } from './types'

/**
 * BIOESTIMULADOR DE COLÁGENO — protocolo completo em uma ficha.
 *
 * Termo e pós-cuidados transcritos LITERALMENTE da ficha de papel de uma
 * clínica de estética em uso real (08/08/2026).
 *
 * O QUE DISTINGUE ESTA FICHA das outras três do pacote é a ANÁLISE DA PELE:
 * na folha original ela ocupa metade da página, com fototipo, textura, estado
 * cutâneo, óstios, acne, sequelas, manchas, flacidez, as "7 quedas do
 * envelhecimento" e classificação de rugas. É o exame clínico que justifica a
 * indicação — e é o único bloco do pacote que a clínica repete a cada sessão
 * pra medir evolução. Por isso vira campo estruturado (select), não texto
 * livre: assim dá pra comparar a análise de hoje com a de três meses atrás.
 */
export const BIOESTIMULADOR_COLAGENO_FICHA: NicheFicha = {
  slug: 'bioestimulador-colageno',
  name: 'Bioestimulador de Colágeno · Protocolo',
  segments: ['Clínica estética', 'Clínica', 'Estética', 'Estética avançada', 'Biomedicina'],
  sections: [
    {
      kind: 'fields',
      title: 'Análise da pele',
      fields: [
        { name: 'fototipo', label: 'Fototipo', type: 'select', options: ['I', 'II', 'III', 'IV', 'V', 'VI'] },
        { name: 'tocar_pele', label: 'Ao tocar a pele', type: 'select', options: ['Lisa', 'Áspera', 'Fina', 'Espessa', 'Rugosa'] },
        { name: 'tipo_pele', label: 'Tipo de pele', type: 'select', options: ['Normal', 'Mista', 'Lipídica', 'Eudérmica', 'Alípica'] },
        { name: 'estado_cutaneo', label: 'Estado cutâneo', type: 'select', options: ['Normal', 'Desidratado', 'Sensibilizado', 'Acneico', 'Seborreico'] },
        { name: 'ostios', label: 'Óstios', type: 'select', options: ['Dilatados na zona T', 'Dilatados em toda face', 'Contraídos'] },
        { name: 'acne', label: 'Acne', type: 'select', options: ['Não possui', 'Grau 1', 'Grau 2', 'Grau 3', 'Grau 4', 'Grau 5'] },
        { name: 'sequelas', label: 'Sequelas', type: 'select', options: ['Não possui', 'Atrófica', 'Hipertrófica', 'Contrátil', 'Queloide'] },
        { name: 'rosacea', label: 'Tem rosácea', type: 'select', options: ['Não', 'Sim'] },
        { name: 'flacidez_grau', label: 'Flacidez de pele', type: 'select', options: ['Não possui', 'Leve', 'Moderada', 'Intensa', 'Grave'] },
        { name: 'flacidez_tipo', label: 'Tipo de flacidez', type: 'select', options: ['Tissular', 'Muscular', 'Tissular e muscular'] },
        { name: 'rugas_grau', label: 'Rugas', type: 'select', options: ['Discretas', 'Moderadas', 'Avançadas'] },
        { name: 'rugas_tipo', label: 'Tipo de rugas', type: 'select', options: ['Dinâmicas', 'Estáticas', 'Dinâmicas e estáticas'] },
      ],
    },
    {
      kind: 'health',
      title: 'Manchas pigmentares relacionadas à melanina',
      detailLabel: 'Localização e observações',
      items: ['Acromia', 'Cloasma', 'Efélides', 'Hipercromia', 'Hipocromia'],
    },
    {
      kind: 'health',
      title: 'Manchas por alterações vasculares',
      detailLabel: 'Localização e observações',
      items: ['Angioma', 'Cianose', 'Eritema', 'Hemangioma', 'Hematoma', 'Petéquias', 'Telangiectasias'],
    },
    {
      /* As "7 quedas do envelhecimento" da ficha original. Ficam como checklist
         e não como select porque a paciente costuma apresentar várias ao mesmo
         tempo — e é o conjunto delas que define o plano de tratamento. */
      kind: 'health',
      title: 'Involução cutânea — 7 quedas do envelhecimento',
      detailLabel: 'Observações da avaliação',
      items: [
        'Queda da sobrancelha',
        'Queda da pálpebra superior',
        'Queda da pálpebra inferior',
        'Formação do sulco nasogeniano (bigode chinês)',
        'Queda do canto da boca (marionete)',
        'Queda da linha da mandíbula',
        'Queda da ponta do nariz',
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
        'Tendência a queloide',
      ],
    },
    {
      kind: 'fields',
      title: 'Dados do produto',
      fields: [
        { name: 'produto_nome', label: 'Produto / marca', type: 'text' },
        { name: 'produto_lote', label: 'Nº do lote', type: 'text' },
        { name: 'produto_validade', label: 'Validade', type: 'text' },
        { name: 'produto_diluicao', label: 'Volume de diluição', type: 'text' },
      ],
    },
    {
      kind: 'mapping',
      title: 'Áreas de aplicação',
      drawName: 'mapa_aplicacao',
      background: 'rosto',
      params: [
        { name: 'vol_frontal', label: 'Frontal', type: 'text' },
        { name: 'vol_glabela', label: 'Glabela', type: 'text' },
        { name: 'vol_tempora', label: 'Têmpora', type: 'text' },
        { name: 'vol_orbicular', label: 'Orbicular', type: 'text' },
        { name: 'vol_malar', label: 'Malar', type: 'text' },
        { name: 'vol_mentos', label: 'Mentos', type: 'text' },
        { name: 'vol_zigomatico', label: 'Zigomático', type: 'text' },
        { name: 'vol_pre_jowls', label: 'Pré jowls', type: 'text' },
        { name: 'vol_arco_mandibula', label: 'Arco mandíbula', type: 'text' },
        { name: 'vol_mandibula', label: 'Mandíbula', type: 'text' },
        { name: 'vol_nariz', label: 'Nariz', type: 'text' },
        { name: 'vol_sulco_nasogeniano', label: 'Sulco nasogeniano', type: 'text' },
        { name: 'vol_mentoniano', label: 'Mentoniano', type: 'text' },
      ],
    },
    {
      kind: 'fields',
      title: 'Observações do atendimento',
      fields: [
        { name: 'sessao_numero', label: 'Nº da sessão do plano', type: 'text' },
        { name: 'observacoes', label: 'Intercorrências, conduta e observações', type: 'textarea' },
      ],
    },
    {
      kind: 'term',
      title: 'Termo de consentimento livre e esclarecido — bioestimulador de colágeno',
      text:
        'BIOESTIMULADOR DE COLÁGENO\n' +
        'O bioestimulador de colágeno consiste na aplicação de substâncias como ácido ' +
        'polilático, hidroxiapatita de cálcio ou policaprolactona, que estimulam a produção ' +
        'natural de colágeno pelo organismo. Trata-se de um procedimento estético minimamente ' +
        'invasivo indicado para melhora da flacidez, qualidade da pele, contorno facial e ' +
        'corporal.\n' +
        'Os produtos utilizados são regularizados pela ANVISA e aplicados em doses seguras, ' +
        'conforme protocolos técnicos e normas do Ministério da Saúde. O efeito do bioestimulador ' +
        'ocorre de forma gradual, com resultados progressivos ao longo das semanas, não sendo ' +
        'imediato.\n' +
        'O tratamento promove melhora da firmeza da pele, estímulo dérmico profundo e efeito ' +
        'rejuvenescedor. As áreas mais tratadas incluem face, mandíbula, pescoço, colo, braços, ' +
        'abdômen e glúteos.\n\n' +
        'ORIENTAÇÕES E CUIDADOS PÓS PROCEDIMENTO BIOESTIMULADOR DE COLÁGENO\n' +
        'As complicações mais frequentes são sensação de dor local, inchaço, vermelhidão, ' +
        'hematomas, sensibilidade, prurido ou pequenos nódulos transitórios. Na ocorrência de ' +
        'qualquer complicação mais grave, o profissional deverá ser comunicado imediatamente.\n' +
        'A resposta ao tratamento é individual, não sendo possível garantir um percentual exato ' +
        'de melhora.\n' +
        'Após o procedimento, pelo período de 24 horas, não é permitido realizar atividades ' +
        'físicas intensas, exposição solar direta ou manipulação excessiva da área tratada, salvo ' +
        'orientação profissional.\n' +
        'Em alguns casos, poderá ser necessário realizar massagens locais conforme orientação ' +
        'técnica específica.\n' +
        'Sensações como dor leve ou desconforto podem ocorrer após a aplicação, sendo geralmente ' +
        'autolimitadas.\n' +
        'Poderão ser necessárias mais de uma sessão para atingir o resultado desejado, ' +
        'respeitando o plano de tratamento individualizado.\n' +
        'A duração dos resultados é variável, dependendo do metabolismo, idade, estilo de vida e ' +
        'cuidados do paciente, podendo durar em média de 12 a 24 meses.\n' +
        'O uso de medicamentos anti-inflamatórios, imunossupressores ou condições clínicas ' +
        'específicas podem interferir na resposta ao tratamento.\n' +
        'Pacientes com infecção ativa na área, doenças autoimunes não controladas, distúrbios de ' +
        'coagulação, gestantes, lactantes ou com hipersensibilidade aos componentes da fórmula ' +
        'não devem realizar o procedimento.\n' +
        'Hematomas podem ocorrer devido à perfuração de pequenos vasos durante a aplicação, ' +
        'sendo geralmente transitórios.\n\n' +
        'TERMO DE CONSENTIMENTO\n' +
        'Autorizo o(a) profissional acima identificado(a) a realizar o procedimento de ' +
        'bioestimulação de colágeno.\n' +
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
        'nódulos, assimetrias, infecção, reações inflamatórias ou alérgicas, entre outros, sendo ' +
        'devidamente orientado(a) sobre como proceder em caso de intercorrências.\n' +
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
        'Os bioestimuladores de colágeno atuam de forma progressiva e exigem cuidados especiais ' +
        'para garantir a eficácia e segurança do tratamento. Siga atentamente as orientações ' +
        'abaixo:\n\n' +
        'PRIMEIRAS 24 HORAS\n' +
        '• Realizar massagens na região de aplicação conforme orientação\n' +
        '• Evitar exercícios físicos intensos e esforços exagerados.\n' +
        '• Não utilizar maquiagem, cremes ou cosméticos sobre a área aplicada.\n' +
        '• Evitar exposição solar, calor intenso, sauna e banhos quentes.\n' +
        '• Manter a cabeça levemente elevada ao dormir, evitando compressão direta sobre a área ' +
        'tratada.\n\n' +
        'DE 48 A 72 HORAS\n' +
        '• Caso indicado pelo profissional, realizar massagens na região de aplicação conforme ' +
        'orientação específica (número de vezes e duração).\n' +
        '• Utilizar protetor solar FPS 50 ou superior sempre que houver exposição à luz ' +
        'natural.\n' +
        '• Evitar procedimentos estéticos no local (como laser, limpeza de pele ou peeling).\n\n' +
        'PRIMEIRA SEMANA\n' +
        '• Pequenos hematomas e inchaços podem ocorrer; compressas frias ajudam nas primeiras ' +
        '24-48 horas.\n' +
        '• Não realizar tratamentos odontológicos eletivos sem liberação prévia.\n' +
        '• Hidratar-se bem para potencializar os resultados do bioestimulador.\n\n' +
        'SINAIS DE ALERTA\n' +
        'Entre em contato imediatamente com o profissional caso apresente:\n' +
        '• Dor intensa e persistente.\n' +
        '• Vermelhidão exagerada, calor local, secreção ou sinais de infecção.\n' +
        '• Nódulos endurecidos, assimetrias ou desconforto significativo.',
      consents: [
        { name: 'recebeu_orientacoes', label: 'Recebi e compreendi as orientações pós-procedimento', required: true },
      ],
    },
    { kind: 'signature', name: 'assinatura_paciente', label: 'Assinatura do paciente' },
  ],
}
