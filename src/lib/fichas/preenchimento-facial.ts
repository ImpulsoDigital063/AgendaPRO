import type { NicheFicha } from './types'

/**
 * PREENCHIMENTO FACIAL (ácido hialurônico) — protocolo completo em uma ficha.
 *
 * Anamnese, termo e pós-cuidados transcritos LITERALMENTE da ficha de papel de
 * uma clínica de estética em uso real (08/08/2026). O texto jurídico não foi
 * resumido nem reescrito de propósito: o que a paciente assina no sistema tem
 * que ser o mesmo que ela assinava no papel, senão a ficha digital vira um
 * documento novo — e aí a clínica perde o histórico de padrão do que ela vinha
 * colhendo assinatura há anos.
 *
 * As regiões vêm das três tabelas da ficha original (face, nariz, lábios). No
 * papel cada região tem DUAS colunas de volume, porque a folha atravessa mais
 * de uma sessão; aqui cada atendimento gera sua própria ficha, então uma coluna
 * basta e o histórico fica na linha do tempo da paciente.
 *
 * Não repete o histórico clínico: as 30 perguntas de saúde ficam na ficha de
 * Histórico Clínico, preenchida uma vez por paciente.
 */
export const PREENCHIMENTO_FACIAL_FICHA: NicheFicha = {
  slug: 'preenchimento-facial',
  name: 'Preenchimento Facial · Protocolo',
  segments: ['Clínica estética', 'Clínica', 'Estética', 'Estética avançada', 'Biomedicina'],
  sections: [
    {
      kind: 'health',
      title: 'Contraindicações específicas',
      detailLabel: 'Detalhe os itens marcados',
      items: [
        'Infecção ativa ou lesão de pele na área a tratar',
        'Herpes ativo ou recorrente na região',
        'Gestante ou amamentando',
        'Doença autoimune não controlada',
        'Distúrbio de coagulação',
        'Uso de anticoagulante',
        'Alergia à lidocaína ou a componente da fórmula',
        'Preenchedor definitivo ou de origem desconhecida na região',
        'Procedimento odontológico agendado nos próximos 15 dias',
      ],
    },
    {
      kind: 'fields',
      title: 'Dados do produto',
      fields: [
        { name: 'produto_nome', label: 'Produto / marca', type: 'text' },
        { name: 'produto_lote', label: 'Nº do lote', type: 'text' },
        { name: 'produto_validade', label: 'Validade', type: 'text' },
        { name: 'anestesico', label: 'Anestésico utilizado', type: 'text' },
      ],
    },
    {
      kind: 'mapping',
      title: 'Área de tratamento — face',
      drawName: 'mapa_face',
      background: 'rosto',
      params: [
        { name: 'vol_malar', label: 'Malar (ml)', type: 'text' },
        { name: 'vol_sulco_nasogeniano', label: 'Sulco nasogeniano (ml)', type: 'text' },
        { name: 'vol_contorno_mandibula', label: 'Contorno da mandíbula (ml)', type: 'text' },
        { name: 'vol_angulo_mandibula', label: 'Ângulo da mandíbula (ml)', type: 'text' },
        { name: 'vol_mento', label: 'Mento (ml)', type: 'text' },
        { name: 'vol_queixo', label: 'Queixo (ml)', type: 'text' },
        { name: 'vol_olheira', label: 'Olheira (ml)', type: 'text' },
        { name: 'vol_marionete', label: 'Linha da marionete (ml)', type: 'text' },
      ],
    },
    {
      kind: 'fields',
      title: 'Área de tratamento — nariz',
      fields: [
        { name: 'vol_dorso_nariz', label: 'Dorso do nariz (ml)', type: 'text' },
        { name: 'vol_ponta_nariz', label: 'Ponta do nariz (ml)', type: 'text' },
        { name: 'vol_columela', label: 'Columela (ml)', type: 'text' },
        { name: 'vol_radix', label: 'Radix (ml)', type: 'text' },
      ],
    },
    {
      kind: 'fields',
      title: 'Área de tratamento — lábios',
      fields: [
        { name: 'vol_arco_cupido', label: 'Arco do cupido (ml)', type: 'text' },
        { name: 'vol_tuberculo_sup', label: 'Tubérculo superior (ml)', type: 'text' },
        { name: 'vol_tuberculo_inf', label: 'Tubérculo inferior (ml)', type: 'text' },
        { name: 'vol_comissura', label: 'Comissura D/E (ml)', type: 'text' },
        { name: 'vol_contorno_inferior', label: 'Contorno inferior (ml)', type: 'text' },
      ],
    },
    {
      kind: 'fields',
      title: 'Informações do tratamento',
      fields: [
        { name: 'volume_total', label: 'Volume total aplicado (ml)', type: 'text' },
        { name: 'observacoes', label: 'Intercorrências, conduta e observações', type: 'textarea' },
      ],
    },
    {
      kind: 'term',
      title: 'Termo de consentimento livre e esclarecido — preenchedores faciais',
      text:
        'O Ácido Hialurônico (substância utilizada para o preenchimento injetável) é uma ' +
        'substância naturalmente presente no organismo. Procedimento realizado sob anestesia ' +
        'local injetável ou gel anestésico. Com efeito imediato e sem risco de efeito vacina ' +
        '(quando o produto não é eficaz).\n\n' +
        'CUIDADOS\n' +
        'Compressas geladas para diminuir o processo inflamatório (por até 24 horas), não ' +
        'massagear área tratada dentro de 12 horas não maquiar, dentro de 48 horas não realizar ' +
        'exercícios físicos e dormir com a cabeça mais elevada que o corpo, evitando comprimir ' +
        'área tratada, dentro de 2 semanas é necessário evitar exposição prolongada ao sol e ' +
        'raios infravermelhos, exposição à temperaturas muito baixas e saunas ou salas de ' +
        'vapor.\n\n' +
        'RISCOS\n' +
        'Pode ocorrer perda da expressão facial, linhas e rugas, queda ou flacidez (ptose) da ' +
        'boca, sobrancelha e/ou pálpebra, cegueira, equimose, edema, dor, hematoma, ' +
        'sangramento, dor de cabeça, necrose, vermelhidão no local da injeção, reações ' +
        'alérgicas, infecções, herpes, parada cardíaca, dormência, formigamento, paralisia ou ' +
        'paralisia parcial, hipersensibilidade, cicatrizes. Pode haver riscos não especificados ' +
        'e riscos desconhecidos a longo prazo.\n' +
        'Pode ocorrer disfagia (dificuldade de deglutição), disfonia (dificuldade de falar), ' +
        'fraqueza, dispneia (dificuldade de respirar). Assimetria pode ocorrer durante 7 dias ou ' +
        'mais. Em pacientes de hipo ou hipertireodismo o material pode ser absorvido mais ' +
        'rapidamente.\n\n' +
        'Estou ciente de que durante o procedimento outras conjunções podem ocorrer e ' +
        'necessitam ser tratadas, e portanto, autorizo qualquer procedimento adicional. Estou ' +
        'ciente de que o tratamento pode ser sem efeito ou duração menor que o planejado. Para ' +
        'obter um material adicional, será necessário um novo pagamento. Estou ciente que ' +
        'nenhuma correção pode ser feita antes de 7 dias. Se caso eu desejar, posso escolher ' +
        'interromper o procedimento em qualquer momento. Eu li, compreendi e concordei com o ' +
        'afirmado acima.\n\n' +
        'Autorizo o(a) profissional acima identificado(a) a realizar o procedimento ' +
        'supramencionado. O(a) profissional explicou-me a utilização do tratamento, compreendi e ' +
        'foram-me dadas oportunidades suficientes para tirar quaisquer dúvidas e/ou ' +
        'preocupações, que confirmo terem sido satisfatoriamente abordadas.\n\n' +
        'O(a) profissional DECLARA que explicou detalhadamente para o paciente e/ou responsável ' +
        'o propósito, os benefícios, os riscos e as alternativas para o procedimento acima ' +
        'descrito, bem como que existiu tempo hábil para o cliente esclarecer suas dúvidas ou ' +
        'procurar outra opinião profissional.',
      consents: [
        { name: 'ciente_riscos', label: 'Li, compreendi e concordei com o afirmado acima', required: true },
        { name: 'autoriza_procedimento', label: 'Autorizo a realização do procedimento', required: true },
      ],
    },
    {
      kind: 'term',
      title: 'Orientações pós-cuidados',
      text:
        'O preenchimento facial é um procedimento estético injetável que visa restaurar ' +
        'volumes, suavizar sulcos e melhorar o contorno do rosto. Para garantir segurança, ' +
        'evitar complicações e potencializar os resultados, siga corretamente as orientações ' +
        'abaixo:\n\n' +
        'NAS PRIMEIRAS 24 A 48 HORAS\n' +
        'Evite tocar, apertar, massagear ou manipular a área tratada.\n' +
        'Não aplicar maquiagem, cremes ou produtos não recomendados pelo(a) profissional.\n' +
        'Evite exposição solar, calor excessivo (sauna, banho quente, academia, piscina).\n' +
        'Não ingerir bebidas alcoólicas.\n' +
        'Prefira dormir com a cabeça levemente elevada, evitando apoiar o rosto sobre o ' +
        'travesseiro.\n\n' +
        'APÓS 48 HORAS\n' +
        'Retorne gradualmente à rotina de atividades físicas, apenas com liberação do(a) ' +
        'profissional.\n' +
        'Continue o uso diário de protetor solar FPS 50 ou superior.\n' +
        'Hidrate a pele com produtos indicados pelo(a) profissional.\n' +
        'Evite procedimentos estéticos agressivos na mesma região por, no mínimo, 15 dias.\n\n' +
        'POSSÍVEIS REAÇÕES NORMAIS\n' +
        'Vermelhidão local\n' +
        'Pequenos hematomas ou inchaço\n' +
        'Sensibilidade leve na área tratada\n' +
        'Esses efeitos costumam regredir em poucos dias.\n\n' +
        'PROCURE O PROFISSIONAL CASO OCORRA\n' +
        'Dor intensa e persistente\n' +
        'Inchaço anormal ou endurecimento excessivo\n' +
        'Assimetria acentuada ou alterações visuais (visão turva, dor ocular)\n' +
        'Qualquer sinal de infecção (calor local, secreção, febre)\n\n' +
        'Observação: O resultado definitivo do preenchimento facial pode ser avaliado somente ' +
        'após a completa integração do produto nos tecidos, o que ocorre em aproximadamente 15 a ' +
        '30 dias.',
      consents: [
        { name: 'recebeu_orientacoes', label: 'Recebi e compreendi as orientações pós-procedimento', required: true },
      ],
    },
    { kind: 'signature', name: 'assinatura_paciente', label: 'Assinatura do paciente' },
  ],
}
