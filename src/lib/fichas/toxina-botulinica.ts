import type { NicheFicha } from './types'

/**
 * TOXINA BOTULÍNICA — protocolo completo em uma ficha.
 *
 * Modelada sobre a ficha de papel da Dra Elaine Rebolo (08/08/2026), escrita
 * genérica: sem marca, sem nome de profissional. No papel dela isso são QUATRO
 * folhas (anamnese, aplicação, termo, pós-cuidados); aqui é uma ficha só, com
 * as quatro partes na ordem do atendimento. Assinou, congela.
 *
 * Três decisões que valem pra todos os protocolos deste pacote:
 *
 * 1. NÃO REPETE O HISTÓRICO CLÍNICO. As 30 perguntas de saúde ficam na ficha
 *    de Histórico Clínico, preenchida uma vez por paciente. Aqui entram só as
 *    contraindicações específicas da toxina — perguntar tudo de novo a cada
 *    aplicação é o que faz a profissional abandonar a ficha digital e voltar
 *    pro papel.
 *
 * 2. DADOS DO PRODUTO SÃO OBRIGATÓRIOS NA PRÁTICA. Lote e validade são
 *    rastreabilidade sanitária: se houver intercorrência, é o que responde
 *    "qual lote foi aplicado em quem". No papel ela cola a etiqueta do frasco;
 *    aqui os campos ficam registrados e pesquisáveis, o que a etiqueta colada
 *    nunca permitiu.
 *
 * 3. O PÓS-CUIDADO CARREGA O PRAZO DE RETORNO. "Retorno entre 15 e 21 dias"
 *    está no texto porque está na ficha dela — e é dele que o aviso automático
 *    de retorno vai nascer, em vez de uma configuração separada que alguém
 *    teria que lembrar de preencher.
 */
export const TOXINA_BOTULINICA_FICHA: NicheFicha = {
  slug: 'toxina-botulinica',
  name: 'Toxina Botulínica · Protocolo',
  segments: ['Clínica estética', 'Clínica', 'Estética', 'Estética avançada', 'Biomedicina'],
  sections: [
    {
      kind: 'health',
      title: 'Contraindicações específicas',
      detailLabel: 'Detalhe os itens marcados',
      items: [
        'Doença neuromuscular (miastenia, Eaton-Lambert, ELA)',
        'Uso de aminoglicosídeo ou espectinomicina',
        'Infecção ativa no local da aplicação',
        'Gestante ou amamentando',
        'Alergia à albumina (ovo) ou a componente da fórmula',
        'Uso de anticoagulante',
        'Coagulopatia',
        'Aplicação de toxina nos últimos 3 meses',
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
      title: 'Pontos de aplicação',
      drawName: 'mapa_aplicacao',
      background: 'rosto',
      params: [
        { name: 'un_frontal', label: 'Frontal (U)', type: 'text' },
        { name: 'un_procero', label: 'Prócero (U)', type: 'text' },
        { name: 'un_corrugador_esq', label: 'Corrugador esq. (U)', type: 'text' },
        { name: 'un_corrugador_dir', label: 'Corrugador dir. (U)', type: 'text' },
        { name: 'un_orbicular_olho_esq', label: 'Orbicular do olho esq. (U)', type: 'text' },
        { name: 'un_orbicular_olho_dir', label: 'Orbicular do olho dir. (U)', type: 'text' },
        { name: 'un_nasal', label: 'Nasal (U)', type: 'text' },
        { name: 'un_depressor_septo', label: 'Depressor do septo nasal (U)', type: 'text' },
        { name: 'un_orbicular_boca', label: 'Orbicular da boca (U)', type: 'text' },
        { name: 'un_depressor_angulo', label: 'Depressor do ângulo da boca (U)', type: 'text' },
        { name: 'un_mentoniano', label: 'Mentoniano (U)', type: 'text' },
        { name: 'un_platisma', label: 'Platisma (U)', type: 'text' },
        { name: 'un_masseter', label: 'Masseter (U)', type: 'text' },
        { name: 'un_temporal', label: 'Temporal (U)', type: 'text' },
        { name: 'un_lev_labio', label: 'Levantador do lábio superior (U)', type: 'text' },
        { name: 'un_total', label: 'TOTAL DE UNIDADES', type: 'text' },
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
      title: 'Termo de consentimento livre e esclarecido',
      text:
        'A toxina botulínica do tipo A (TBA) é uma toxina produzida por uma bactéria chamada ' +
        'Clostridium botulinum. É a mesma bactéria causadora da doença botulismo, mas a toxina ' +
        'botulínica industrializada é purificada e utilizada em pequenas doses que não causam ' +
        'a doença.\n\n' +
        'As toxinas botulínicas industrializadas têm pequenas diferenças entre si e recebem ' +
        'subnomes como: OnabotulinumtoxinA (Botox®), AbobotulinumtoxinA (Dysport®), ' +
        'RimabotulinumtoxinB (Myobloc® - não disponível no Brasil), IncobotulinumtoxinA ' +
        '(Xeomin®). É importante destacar que a toxina possui subtipos como A, B, C, sendo que ' +
        'a utilizada na medicina e biomedicina é a do tipo A.\n\n' +
        'A toxina promove o efeito tensor sob a pele, e seu uso estético se dá, em geral, para ' +
        'suavizar rugas e linhas de expressão na região da face. Entre as linhas tratadas estão ' +
        'as rugas da testa, a glabela (espaço entre as sobrancelhas), os pés de galinha (rugas ' +
        'que se formam na região dos olhos), sorriso gengival e arqueamento de sobrancelhas.\n\n' +
        'ORIENTAÇÕES E CUIDADOS PÓS PROCEDIMENTO TOXINA BOTULÍNICA TIPO A:\n' +
        'As complicações mais frequentes são:\n' +
        '• Sensação de corpo estranho, coceira, inchaço, vermelhidão e equimoses. Na ocorrência ' +
        'de qualquer complicação mais grave, informe imediatamente ao profissional.\n' +
        '• A resposta ao tratamento é individual. Não é possível garantir um percentual de ' +
        'melhora.\n' +
        '• Após o procedimento, pelo período de 24 (vinte e quatro) horas não é permitido pegar ' +
        'sol e tampouco massagear o local de aplicação.\n' +
        '• Sensações como dores de cabeça ou dores locais também podem ocorrer após a aplicação ' +
        'da toxina botulínica, devido a tensão ocorrida durante a realização do procedimento, ' +
        'desaparecendo em no máximo 24 horas. Evitar a ingestão de medicamentos para dores de ' +
        'cabeça e/ou relaxantes musculares.\n' +
        '• Poderão ser necessárias mais de uma aplicação, que será realizada no retorno agendado ' +
        'no prazo de 15 (quinze) a 21 (vinte e um) dias da primeira aplicação.\n' +
        '• A duração dos resultados do procedimento com a toxina botulínica é variável, ' +
        'dependendo do metabolismo e hábitos de cada cliente, com duração média do efeito entre ' +
        '3 (três) meses a 6 (seis) meses.\n' +
        '• Níveis altos de hormônios masculinos (testosterona) e o uso de antiflamatórios e ' +
        'antibióticos antes 7 dias da aplicação e 15 dias após podem afetar no efeito da toxina ' +
        'botulínica.\n' +
        '• Interferências no efeito por causa das vacinas contra o COVID, podendo diminuição do ' +
        'efeito.\n\n' +
        'Clientes em tratamento com antibióticos do tipo espectinomicina ou amino glicosídeos e ' +
        'que possuem enfermidades neuromusculares, imunológicas e coagulopatias (ou ainda ' +
        'pessoas que utilizem anticoagulantes, amino glicosídeos e drogas que interfiram na ' +
        'transmissão neuromuscular), grávidas ou em fase de amamentação, com infecção ou sinais ' +
        'de inflamação nos locais de aplicação não devem ser submetidos ao tratamento com a ' +
        'toxina botulínica tipo A.\n\n' +
        'A toxina botulínica tipo A, assim como todo medicamento, é contraindicado para clientes ' +
        'que apresentam alergia a albumina (ovo) a qualquer componente de sua formulação.\n\n' +
        'Hematomas (roxo) podem ocorrer naturalmente pela própria introdução da agulha que, em ' +
        'seu trajeto, poderá perfurar vasos sanguíneos e promover pequenos e autolimitados ' +
        'sangramentos locais.\n\n' +
        'TERMO DE CONSENTIMENTO:\n' +
        'Autorizo o(a) profissional acima identificado(a) a realizar o procedimento ' +
        'supramencionado. O profissional explicou-me a utilização do tratamento, compreendi e ' +
        'foram-me dadas oportunidades suficientes para tirar quaisquer dúvidas e/ou ' +
        'preocupações, que confirmo terem sido satisfatoriamente abordadas.\n\n' +
        'Declaro por este meio que respondi rigorosamente a todas as perguntas sobre a minha ' +
        'saúde e quaisquer problemas médicos que me afetam. Confirmo que o meu estado físico e ' +
        'mental é saudável e conducente ao prosseguimento do tratamento e que sou um(a) ' +
        'candidato(a) adequado(a) para a realização do procedimento. Aceito inteiramente que o ' +
        'meu pedido para realizar este tratamento é voluntário. Compreendo que a finalidade do ' +
        'tratamento é melhorar a aparência e que há a possibilidade de os resultados não ' +
        'corresponderem às minhas expectativas. Estou ciente que podem ocorrer complicações ' +
        'gerais no procedimento como hiperpigmentação pós inflamatória, eritema, edema, infecção ' +
        'ou reação alérgica, ptose da região.\n\n' +
        'Foi explicado que os resultados do tratamento não são permanentes e também compreendo ' +
        'que o tratamento poderá me afetar de forma diferente e que os resultados poderão durar ' +
        'mais ou menos tempo do que o normal de acordo com a resposta do meu organismo e minha ' +
        'colaboração como paciente pós procedimento.\n\n' +
        'Reservo-me o direito de revogar minha assinatura abaixo apenas antes que o procedimento ' +
        'se realize.\n\n' +
        'O(a) profissional DECLARA que explicou detalhadamente para o cliente e/ou responsável o ' +
        'propósito, os benefícios, os riscos e as alternativas para o procedimento acima ' +
        'descrito, bem como que existiu tempo hábil para o cliente esclarecer suas dúvidas ou ' +
        'procurar outra opinião profissional.',
      consents: [
        { name: 'ciente_riscos', label: 'Fui esclarecido(a) sobre riscos, benefícios e alternativas', required: true },
        { name: 'autoriza_procedimento', label: 'Autorizo a realização do procedimento', required: true },
      ],
    },
    {
      kind: 'term',
      title: 'Orientações pós-cuidados',
      text:
        'Para garantir a eficácia do tratamento e evitar possíveis intercorrências, siga ' +
        'atentamente as orientações abaixo:\n\n' +
        'NAS PRIMEIRAS 4 HORAS APÓS APLICAÇÃO\n' +
        'Não massagear, friccionar ou coçar as áreas tratadas.\n' +
        'Evitar deitar-se ou inclinar a cabeça para frente.\n' +
        'Evitar uso de bonés, faixas, óculos de grau ou sol muito apertados (no caso de ' +
        'aplicação na testa ou região glabelar).\n' +
        'Evitar maquiagem na região aplicada.\n\n' +
        'NAS PRIMEIRAS 24 HORAS\n' +
        'Não realizar atividades físicas.\n' +
        'Não ingerir bebidas alcoólicas.\n' +
        'Evitar exposição ao sol, calor excessivo, sauna ou banho quente prolongado.\n' +
        'Evitar tratamentos estéticos no rosto (como limpeza de pele, laser, peeling etc.).\n\n' +
        'NAS PRIMEIRAS 48 A 72 HORAS\n' +
        'Evitar qualquer procedimento que gere calor ou estimulação elétrica no rosto.\n' +
        'Evitar procedimentos odontológicos (caso necessário, avisar o profissional que aplicou ' +
        'a toxina).\n\n' +
        'RECOMENDAÇÕES GERAIS\n' +
        'O efeito da toxina começa a ser percebido entre 3 a 7 dias, com resultado completo em ' +
        'até 15 dias.\n' +
        'Pode haver dor leve, vermelhidão, inchaço ou pequenos hematomas nos pontos de ' +
        'aplicação, que geralmente desaparecem espontaneamente.\n' +
        'Evite comparar o resultado com outras pessoas, pois a resposta à toxina é individual.\n' +
        'O retorno para avaliação deverá ser feito entre 15 e 21 dias após a aplicação.\n' +
        'Em caso de dor intensa, assimetria acentuada ou qualquer efeito adverso incomum, entre ' +
        'em contato imediatamente.',
      consents: [
        { name: 'recebeu_orientacoes', label: 'Recebi e compreendi as orientações pós-procedimento', required: true },
      ],
    },
    { kind: 'signature', name: 'assinatura_paciente', label: 'Assinatura do paciente' },
  ],
}
