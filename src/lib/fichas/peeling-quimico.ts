import type { NicheFicha } from './types'

/**
 * PEELING QUÍMICO — protocolo completo.
 *
 * Montada a partir do serviço que a clínica já vende ("Rejuvenescimento com
 * Peeling Químico"), no mesmo esqueleto dos protocolos transcritos do kit dela.
 * O texto do termo é escrito daqui; quando ela mandar a folha dela deste
 * procedimento, é pra trocar por ela.
 *
 * O REGISTRO QUE DECIDE A PRÓXIMA SESSÃO é o trio ácido + concentração + tempo
 * de permanência, junto do FROST observado. Peeling é procedimento de escada:
 * a próxima sessão sobe a partir do que a pele aguentou nesta. Sem esses quatro
 * dados a profissional recomeça do degrau mais baixo toda vez — ou sobe no
 * escuro, que é pior.
 *
 * FOTOTIPO é campo obrigatório na prática: é o principal preditor de
 * hiperpigmentação pós-inflamatória, o efeito adverso mais comum aqui.
 */
export const PEELING_QUIMICO_FICHA: NicheFicha = {
  slug: 'peeling-quimico',
  name: 'Peeling Químico · Protocolo',
  segments: ['Clínica estética', 'Clínica', 'Estética', 'Estética avançada', 'Biomedicina'],
  sections: [
    {
      kind: 'fields',
      title: 'Avaliação da pele',
      fields: [
        { name: 'fototipo', label: 'Fototipo (Fitzpatrick)', type: 'select', options: ['I', 'II', 'III', 'IV', 'V', 'VI'] },
        { name: 'indicacao', label: 'Indicação (melasma, acne, textura, manchas…)', type: 'text' },
        { name: 'preparo_previo', label: 'Preparo prévio realizado (quais ativos, por quanto tempo)', type: 'textarea' },
      ],
    },
    {
      kind: 'health',
      title: 'Contraindicações específicas',
      detailLabel: 'Detalhe os itens marcados',
      items: [
        'Herpes ativo ou recorrente na região',
        'Infecção, ferida ou dermatite ativa na área',
        'Uso de isotretinoína (Roacutan) nos últimos 6 meses',
        'Exposição solar intensa nos últimos 15 dias',
        'Gestante ou amamentando',
        'Tendência a queloide ou cicatriz hipertrófica',
        'Histórico de hiperpigmentação pós-inflamatória',
        'Alergia a algum dos ácidos ou componentes',
        'Procedimento estético ou depilação na área nos últimos 7 dias',
        'Uso de ácidos em casa sem pausa antes da sessão',
      ],
    },
    {
      kind: 'fields',
      title: 'Dados do produto e aplicação',
      fields: [
        { name: 'acido_nome', label: 'Ácido / associação utilizada', type: 'text' },
        { name: 'acido_concentracao', label: 'Concentração (%)', type: 'text' },
        { name: 'acido_ph', label: 'pH', type: 'text' },
        { name: 'acido_lote', label: 'Nº do lote', type: 'text' },
        { name: 'acido_validade', label: 'Validade', type: 'text' },
        { name: 'camadas', label: 'Nº de camadas aplicadas', type: 'text' },
        { name: 'tempo_permanencia', label: 'Tempo de permanência', type: 'text' },
        { name: 'neutralizacao', label: 'Neutralização (produto e tempo) ou autoneutralizante', type: 'text' },
        { name: 'sessao_numero', label: 'Nº da sessão do plano', type: 'text' },
      ],
    },
    {
      kind: 'mapping',
      title: 'Áreas tratadas e resposta',
      drawName: 'mapa_peeling',
      background: 'rosto',
      params: [
        {
          name: 'frost',
          label: 'Frost observado',
          type: 'select',
          options: ['Sem frost', 'Frost nível I (eritema)', 'Frost nível II (pontilhado)', 'Frost nível III (branco uniforme)'],
        },
        {
          name: 'eritema',
          label: 'Eritema',
          type: 'select',
          options: ['Ausente', 'Leve', 'Moderado', 'Intenso'],
        },
        { name: 'ardencia', label: 'Ardência relatada (0 a 10)', type: 'text' },
        { name: 'areas_tratadas', label: 'Áreas tratadas', type: 'textarea' },
      ],
    },
    {
      kind: 'fields',
      title: 'Observações do atendimento',
      fields: [
        { name: 'observacoes', label: 'Intercorrências, conduta e observações', type: 'textarea' },
        { name: 'home_care', label: 'Home care prescrito', type: 'textarea' },
        { name: 'proxima_sessao', label: 'Conduta para a próxima sessão (manter / subir concentração / subir tempo)', type: 'textarea' },
      ],
    },
    {
      kind: 'term',
      title: 'Termo de consentimento livre e esclarecido — peeling químico',
      text:
        'PEELING QUÍMICO\n' +
        'O peeling químico consiste na aplicação de substâncias ácidas sobre a pele com o ' +
        'objetivo de promover renovação celular controlada, melhorando textura, manchas, ' +
        'cicatrizes de acne, oleosidade e sinais de envelhecimento.\n' +
        'A profundidade e a intensidade do peeling variam conforme o ativo utilizado, a ' +
        'concentração, o tempo de permanência e a resposta individual da pele. O tratamento ' +
        'costuma exigir múltiplas sessões, realizadas em intervalos definidos pela profissional.\n\n' +
        'ORIENTAÇÕES E CUIDADOS PÓS PROCEDIMENTO PEELING QUÍMICO\n' +
        'As reações esperadas são ardência durante a aplicação, vermelhidão, sensação de ' +
        'repuxamento, ressecamento e descamação nos dias seguintes.\n' +
        'A resposta ao tratamento é individual, não sendo possível garantir percentual exato de ' +
        'melhora.\n' +
        'PODE OCORRER HIPERPIGMENTAÇÃO PÓS-INFLAMATÓRIA, ou seja, o surgimento de manchas ' +
        'escuras após o procedimento, especialmente em fototipos mais altos, em pessoas com ' +
        'histórico prévio de manchas e principalmente quando não há fotoproteção rigorosa após ' +
        'a sessão. A fotoproteção é parte do tratamento, não uma recomendação opcional.\n' +
        'Pode ocorrer reativação de herpes em pessoas predispostas, razão pela qual a ' +
        'profissional deve ser informada sobre histórico de herpes antes do procedimento.\n' +
        'Em peelings mais profundos podem ocorrer bolhas, crostas, alteração de cor da pele e, ' +
        'raramente, cicatrizes.\n' +
        'Pacientes com infecção ativa na área, uso recente de isotretinoína, gestantes, ' +
        'lactantes ou com alergia aos componentes não devem realizar o procedimento.\n' +
        'A exposição solar sem proteção adequada nos dias seguintes compromete o resultado e ' +
        'aumenta o risco de manchas.\n\n' +
        'TERMO DE CONSENTIMENTO\n' +
        'Autorizo o(a) profissional acima identificado(a) a realizar o procedimento de peeling ' +
        'químico.\n' +
        'Declaro que fui devidamente informado(a) sobre o procedimento, sua finalidade, ' +
        'benefícios, limitações, riscos e possíveis complicações, tendo compreendido todas as ' +
        'informações prestadas e recebido esclarecimento adequado para todas as minhas dúvidas.\n' +
        'Declaro que respondi com veracidade todas as informações relacionadas ao meu estado de ' +
        'saúde, incluindo histórico médico, uso de medicamentos, alergias, histórico de herpes, ' +
        'histórico de manchas e condições pré-existentes.\n' +
        'Estou ciente de que o resultado depende diretamente dos cuidados pós-procedimento, em ' +
        'especial do uso rigoroso de protetor solar, e assumo a responsabilidade por seguir as ' +
        'orientações recebidas.\n' +
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
        { name: 'ciente_mancha', label: 'Estou ciente do risco de manchas e do meu papel na fotoproteção', required: true },
        { name: 'autoriza_procedimento', label: 'Autorizo a realização do procedimento', required: true },
        { name: 'autoriza_dados', label: 'Autorizo o tratamento dos meus dados para registro clínico (LGPD)', required: true },
      ],
    },
    {
      kind: 'term',
      title: 'Orientações pós-cuidados',
      text:
        'PRIMEIRAS 24 HORAS\n' +
        '• Não lavar o rosto antes do tempo orientado pela profissional.\n' +
        '• Não aplicar maquiagem, ácidos, esfoliantes ou cosméticos não liberados.\n' +
        '• Evitar exercícios físicos, sauna, piscina, banho quente e vapor.\n' +
        '• Não coçar, esfregar ou manipular a pele.\n\n' +
        'DURANTE TODA A DESCAMAÇÃO\n' +
        '• Usar protetor solar FPS 50 ou superior, reaplicando a cada 3 horas.\n' +
        '• Evitar exposição solar direta, mesmo em dias nublados, e usar chapéu ou boné.\n' +
        '• NÃO PUXAR NEM ARRANCAR A PELE que estiver descamando — deixe soltar sozinha. Puxar é ' +
        'a causa mais comum de mancha e cicatriz depois do peeling.\n' +
        '• Manter a pele hidratada com o produto indicado.\n' +
        '• Não realizar depilação, laser ou outro procedimento na área.\n\n' +
        'REAÇÕES ESPERADAS\n' +
        '• Vermelhidão e sensação de repuxamento nas primeiras horas.\n' +
        '• Escurecimento temporário da área tratada antes da descamação.\n' +
        '• Descamação a partir do 2º ao 4º dia, durando de 3 a 7 dias.\n\n' +
        'PROCURE O PROFISSIONAL CASO OCORRA\n' +
        '• Dor intensa e persistente.\n' +
        '• Bolhas, feridas abertas ou crostas espessas.\n' +
        '• Lesões parecidas com herpes.\n' +
        '• Inchaço exagerado, calor local, secreção ou febre.\n' +
        '• Manchas escuras surgindo após a descamação.',
      consents: [
        { name: 'recebeu_orientacoes', label: 'Recebi e compreendi as orientações pós-procedimento', required: true },
      ],
    },
    { kind: 'signature', name: 'assinatura_paciente', label: 'Assinatura do paciente' },
  ],
}
