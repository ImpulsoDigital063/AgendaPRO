import type { NicheFicha } from './types'

/**
 * MICROAGULHAMENTO (indução percutânea de colágeno) — protocolo completo.
 *
 * Não veio de folha de papel: foi montada a partir do serviço que a clínica já
 * vende ("Regeneração & Rejuvenescimento microagulhamento GHK-Cu") no mesmo
 * esqueleto dos protocolos transcritos do kit dela — contraindicações → produto
 * → mapeamento → termo → pós-cuidados → assinatura. O texto do termo é escrito
 * daqui, não transcrito; quando ela mandar a folha dela deste procedimento, é
 * pra trocar por ela.
 *
 * O QUE ESTA FICHA REGISTRA E O PAPEL COSTUMA PERDER: a PROFUNDIDADE por
 * região. Microagulhamento em pálpebra e em cicatriz de acne não usam a mesma
 * agulha, e é a profundidade que explica por que uma área descamou mais que a
 * outra na semana seguinte. Sem esse registro, a sessão seguinte é chute.
 */
export const MICROAGULHAMENTO_FICHA: NicheFicha = {
  slug: 'microagulhamento',
  name: 'Microagulhamento · Protocolo',
  segments: ['Clínica estética', 'Clínica', 'Estética', 'Estética avançada', 'Biomedicina'],
  sections: [
    {
      kind: 'health',
      title: 'Contraindicações específicas',
      detailLabel: 'Detalhe os itens marcados',
      items: [
        'Herpes ativo ou recorrente na região',
        'Acne inflamatória ativa (grau III ou IV) na área',
        'Infecção, ferida ou dermatite ativa na área',
        'Uso de isotretinoína (Roacutan) nos últimos 6 meses',
        'Tendência a queloide ou cicatriz hipertrófica',
        'Gestante ou amamentando',
        'Doença autoimune não controlada',
        'Distúrbio de coagulação ou uso de anticoagulante',
        'Exposição solar intensa nos últimos 15 dias',
        'Uso de ácidos na área nos últimos 7 dias',
        'Diabetes descompensada',
      ],
    },
    {
      kind: 'fields',
      title: 'Dados do procedimento',
      fields: [
        { name: 'ativo_nome', label: 'Ativo aplicado (ex.: GHK-Cu, ácido hialurônico, vitamina C)', type: 'text' },
        { name: 'ativo_lote', label: 'Nº do lote do ativo', type: 'text' },
        { name: 'ativo_validade', label: 'Validade', type: 'text' },
        { name: 'dispositivo', label: 'Dispositivo (caneta elétrica / dermaroller)', type: 'text' },
        { name: 'ponteira_lote', label: 'Lote da ponteira / cartucho', type: 'text' },
        { name: 'anestesico', label: 'Anestésico tópico e tempo de pausa', type: 'text' },
        { name: 'sessao_numero', label: 'Nº da sessão do plano', type: 'text' },
      ],
    },
    {
      kind: 'mapping',
      title: 'Áreas tratadas e profundidade',
      drawName: 'mapa_microagulhamento',
      background: 'rosto',
      params: [
        { name: 'prof_fronte', label: 'Fronte (mm)', type: 'text' },
        { name: 'prof_periorbital', label: 'Periorbital (mm)', type: 'text' },
        { name: 'prof_malar', label: 'Malar (mm)', type: 'text' },
        { name: 'prof_nariz', label: 'Nariz (mm)', type: 'text' },
        { name: 'prof_perioral', label: 'Perioral (mm)', type: 'text' },
        { name: 'prof_mento', label: 'Mento (mm)', type: 'text' },
        { name: 'prof_mandibula', label: 'Mandíbula (mm)', type: 'text' },
        { name: 'prof_pescoco', label: 'Pescoço (mm)', type: 'text' },
        { name: 'passadas', label: 'Nº de passadas por área', type: 'text' },
        { name: 'endpoint', label: 'Endpoint clínico (eritema leve / moderado / petéquias)', type: 'select', options: ['Eritema leve', 'Eritema moderado', 'Eritema intenso', 'Petéquias puntiformes'] },
      ],
    },
    {
      kind: 'fields',
      title: 'Observações do atendimento',
      fields: [
        { name: 'observacoes', label: 'Intercorrências, conduta e observações', type: 'textarea' },
        { name: 'home_care', label: 'Home care prescrito', type: 'textarea' },
      ],
    },
    {
      kind: 'term',
      title: 'Termo de consentimento livre e esclarecido — microagulhamento',
      text:
        'MICROAGULHAMENTO\n' +
        'O microagulhamento, também chamado de indução percutânea de colágeno, consiste na ' +
        'aplicação de microagulhas na pele com o objetivo de estimular a produção natural de ' +
        'colágeno e elastina, além de favorecer a permeação de ativos. É indicado para melhora ' +
        'da qualidade e textura da pele, cicatrizes de acne, rugas finas, flacidez leve, estrias ' +
        'e manchas.\n' +
        'O efeito ocorre de forma gradual, com resultados progressivos ao longo das semanas, não ' +
        'sendo imediato. Normalmente são necessárias múltiplas sessões, com intervalo definido ' +
        'pela profissional conforme a resposta da pele.\n\n' +
        'ORIENTAÇÕES E CUIDADOS PÓS PROCEDIMENTO MICROAGULHAMENTO\n' +
        'As reações esperadas são vermelhidão, sensação de calor, leve inchaço, sensibilidade e ' +
        'descamação nos dias seguintes. Na ocorrência de qualquer complicação mais grave, o ' +
        'profissional deverá ser comunicado imediatamente.\n' +
        'A resposta ao tratamento é individual, não sendo possível garantir percentual exato de ' +
        'melhora.\n' +
        'Pode ocorrer reativação de herpes em pessoas predispostas, razão pela qual a profissional ' +
        'deve ser informada sobre histórico de herpes antes do procedimento.\n' +
        'Pode ocorrer hiperpigmentação pós-inflamatória, especialmente em fototipos mais altos e ' +
        'em caso de exposição solar sem proteção adequada após a sessão.\n' +
        'Pacientes com infecção ativa na área, acne inflamatória em atividade, uso recente de ' +
        'isotretinoína, doenças autoimunes não controladas, distúrbios de coagulação, gestantes ' +
        'ou lactantes não devem realizar o procedimento.\n' +
        'Pequenos sangramentos puntiformes durante a sessão são esperados e autolimitados.\n\n' +
        'TERMO DE CONSENTIMENTO\n' +
        'Autorizo o(a) profissional acima identificado(a) a realizar o procedimento de ' +
        'microagulhamento.\n' +
        'Declaro que fui devidamente informado(a) sobre o procedimento, sua finalidade, ' +
        'benefícios, limitações, riscos e possíveis complicações, tendo compreendido todas as ' +
        'informações prestadas e recebido esclarecimento adequado para todas as minhas dúvidas.\n' +
        'Declaro que respondi com veracidade todas as informações relacionadas ao meu estado de ' +
        'saúde, incluindo histórico médico, uso de medicamentos, alergias, histórico de herpes e ' +
        'condições pré-existentes, assumindo responsabilidade pelas informações fornecidas.\n' +
        'Confirmo que estou ciente de que os resultados podem variar de acordo com meu organismo, ' +
        'não sendo garantido resultado específico, caracterizando obrigação de meio e não de ' +
        'resultado.\n' +
        'Compreendo que poderão ser necessárias sessões adicionais e que os cuidados ' +
        'pós-procedimento, especialmente a fotoproteção, influenciam diretamente no resultado.\n' +
        'Declaro que minha decisão é voluntária e que posso revogar este consentimento a qualquer ' +
        'momento antes da realização do procedimento.\n' +
        'Autorizo o tratamento dos meus dados pessoais e sensíveis para fins de registro clínico ' +
        'e cumprimento das obrigações legais, conforme a Lei Geral de Proteção de Dados Lei nº ' +
        '13.709/2018.',
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
        'PRIMEIRAS 24 HORAS\n' +
        '• Não lavar o rosto nas primeiras horas conforme orientação da profissional.\n' +
        '• Não aplicar maquiagem, ácidos, esfoliantes ou cosméticos não liberados.\n' +
        '• Evitar exercícios físicos, sauna, piscina, banho quente e vapor.\n' +
        '• Não tocar ou coçar a área tratada.\n' +
        '• Usar apenas os produtos indicados pela profissional.\n\n' +
        'PRIMEIROS 3 A 7 DIAS\n' +
        '• Usar protetor solar FPS 50 ou superior, reaplicando ao longo do dia.\n' +
        '• Evitar exposição solar direta, mesmo em dias nublados.\n' +
        '• Manter a pele bem hidratada.\n' +
        '• Não retirar a descamação com as mãos — deixe soltar sozinha.\n' +
        '• Não realizar outros procedimentos estéticos na área.\n\n' +
        'REAÇÕES ESPERADAS\n' +
        '• Vermelhidão e sensação de calor nas primeiras 24 a 48 horas.\n' +
        '• Leve inchaço e sensibilidade ao toque.\n' +
        '• Ressecamento e descamação a partir do 2º ou 3º dia.\n\n' +
        'PROCURE O PROFISSIONAL CASO OCORRA\n' +
        '• Dor intensa e persistente.\n' +
        '• Inchaço exagerado, calor local, secreção ou febre.\n' +
        '• Bolhas, feridas ou lesões parecidas com herpes.\n' +
        '• Manchas escuras surgindo após a sessão.',
      consents: [
        { name: 'recebeu_orientacoes', label: 'Recebi e compreendi as orientações pós-procedimento', required: true },
      ],
    },
    { kind: 'signature', name: 'assinatura_paciente', label: 'Assinatura do paciente' },
  ],
}
