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
        'A toxina botulínica do tipo A é produzida pela bactéria Clostridium botulinum e, ' +
        'industrializada e purificada, é utilizada em doses que não causam doença. Promove ' +
        'efeito tensor sobre a pele e é usada, em geral, para suavizar rugas e linhas de ' +
        'expressão da face.\n\n' +
        'Fui informado(a) de que: a resposta ao tratamento é individual e não é possível ' +
        'garantir percentual de melhora; podem ser necessárias mais de uma aplicação; a ' +
        'duração média do efeito é de 3 a 6 meses; podem ocorrer sensação de corpo estranho, ' +
        'coceira, inchaço, vermelhidão, equimose, dor de cabeça e hematomas; e que o resultado ' +
        'pode ser influenciado por vacinas, medicamentos e características individuais.\n\n' +
        'Declaro que respondi com veracidade às perguntas sobre minha saúde, que tive ' +
        'oportunidade de tirar dúvidas e que fui esclarecido(a) sobre riscos, benefícios e ' +
        'alternativas. Autorizo a realização do procedimento de forma livre e voluntária, e ' +
        'compreendo que posso revogar este consentimento antes de sua realização.',
      consents: [
        { name: 'ciente_riscos', label: 'Fui esclarecido(a) sobre riscos, benefícios e alternativas', required: true },
        { name: 'autoriza_procedimento', label: 'Autorizo a realização do procedimento', required: true },
      ],
    },
    {
      kind: 'term',
      title: 'Orientações pós-procedimento',
      text:
        'NAS PRIMEIRAS 4 HORAS: não massagear, friccionar ou coçar as áreas tratadas; evitar ' +
        'deitar-se ou inclinar a cabeça para frente; evitar bonés, faixas e óculos apertados; ' +
        'evitar maquiagem na região.\n\n' +
        'NAS PRIMEIRAS 24 HORAS: não realizar atividade física; não ingerir bebida alcoólica; ' +
        'evitar sol, calor excessivo, sauna e banho quente prolongado; evitar outros ' +
        'tratamentos estéticos no rosto.\n\n' +
        'NAS PRIMEIRAS 48 A 72 HORAS: evitar procedimentos que gerem calor ou estimulação ' +
        'elétrica no rosto; avisar o profissional antes de procedimento odontológico.\n\n' +
        'O efeito começa entre 3 e 7 dias, com resultado completo em até 15 dias. Pode haver ' +
        'dor leve, vermelhidão, inchaço ou pequenos hematomas, que desaparecem sozinhos. ' +
        'O RETORNO PARA AVALIAÇÃO DEVE SER FEITO ENTRE 15 E 21 DIAS APÓS A APLICAÇÃO. ' +
        'Em caso de dor intensa, assimetria acentuada ou efeito adverso incomum, entre em ' +
        'contato imediatamente.',
      consents: [
        { name: 'recebeu_orientacoes', label: 'Recebi e compreendi as orientações pós-procedimento', required: true },
      ],
    },
    { kind: 'signature', name: 'assinatura_paciente', label: 'Assinatura do paciente' },
  ],
}
