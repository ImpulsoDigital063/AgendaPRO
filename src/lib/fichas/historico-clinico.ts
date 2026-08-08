import type { NicheFicha } from './types'

/**
 * HISTÓRICO CLÍNICO — anamnese geral de clínica de estética.
 *
 * Modelada sobre a ficha de papel da Dra Elaine Rebolo (Serenity Clínica
 * Integrada, 08/08/2026), mas escrita GENÉRICA de propósito: sem marca, sem
 * nome de profissional, sem procedimento específico. É a ficha que qualquer
 * clínica preenche UMA VEZ por paciente, antes de qualquer procedimento — e
 * que os protocolos (toxina, preenchimento, bioestimulador, fios) pressupõem
 * já preenchida em vez de repetir as mesmas 30 perguntas.
 *
 * Dados pessoais (nome, telefone, nascimento) não entram: vêm do cadastro da
 * paciente. Repetir aqui é pedir pra divergir.
 */
export const HISTORICO_CLINICO_FICHA: NicheFicha = {
  slug: 'historico-clinico',
  name: 'Histórico Clínico',
  segments: ['Clínica estética', 'Clínica', 'Estética', 'Estética avançada', 'Biomedicina'],
  sections: [
    {
      kind: 'fields',
      title: 'Expectativa',
      fields: [
        { name: 'expectativa', label: 'O que espera do tratamento', type: 'textarea' },
        { name: 'tipo_sanguineo', label: 'Tipo sanguíneo', type: 'text' },
      ],
    },
    {
      kind: 'health',
      title: 'Condições e histórico de saúde',
      detailLabel: 'Detalhe os itens marcados (qual medicamento, qual alergia, quando foi, etc.)',
      items: [
        'Está sob tratamento médico',
        'Toma algum medicamento (anti-inflamatório, antibiótico, corticoide…)',
        'É doador(a) de sangue',
        'Tem alergia a algum medicamento',
        'Possui outra alergia',
        'Tomou vacina nos últimos 30 dias',
        'Usa anticoagulante (AAS, aspirina, outros)',
        'Tem crises de enxaqueca',
        'É portador(a) de marca-passo',
        'Tem pressão alterada (alta ou baixa)',
        'Faz uso de drogas endovenosas',
        'Já tomou anestesia odontológica',
        'Já passou mal com anestesia',
        'Fuma',
        'Consome bebida alcoólica com frequência',
        'Usa antidepressivo ou ansiolítico',
        'Está grávida ou com suspeita de gestação',
        'Está amamentando',
        'Usa anticoncepcional, testosterona ou análogos',
      ],
    },
    {
      kind: 'health',
      title: 'Pele e procedimentos anteriores',
      detailLabel: 'Detalhe os itens marcados (qual procedimento, quando, qual resultado)',
      items: [
        'Já fez preenchimento facial',
        'Já aplicou toxina botulínica',
        'Já fez outro tratamento estético ou dermatológico',
        'Usa ou já usou ácidos na pele',
        'Usa protetor solar diariamente',
        'Tem dificuldade de cicatrização ou tendência a queloide',
        'Forma hematoma com facilidade',
        'Faz cuidados estéticos diários (skin care)',
        'Usou Roacutan nos últimos 6 meses',
        'Tem ou já teve herpes',
        'Consome açúcar ou doces com frequência',
        /* Enunciado da ficha de papel, mantido na positiva ("no mínimo") em vez
           de invertido pra "menos de 2 litros": a profissional lê a linha em voz
           alta pra paciente, e quem inverte a pergunta na hora colhe a resposta
           trocada. */
        'Ingere no mínimo 2 litros de água por dia',
      ],
    },
    {
      kind: 'health',
      title: 'Patologias existentes',
      detailLabel: 'Outras condições de saúde não listadas acima',
      items: [
        'Tireoide', 'Diabetes', 'Cardiopatia', 'Psoríase', 'Dermatite', 'Lúpus',
        'Osteoporose', 'Vitiligo', 'Epilepsia', 'Doença autoimune',
        'Doença infectocontagiosa', 'Intolerância à lactose', 'Doença metabólica',
        'Doença imunossupressora', 'Alergia à lactose', 'Bronquite ou asma',
        'Reumatismo ou febre reumática', 'Anemia', 'Doença renal', 'Doença hepática',
        'Tuberculose', 'Disfunção hormonal', 'Estresse',
      ],
    },
    {
      kind: 'term',
      title: 'Declaração e autorização',
      text:
        'Declaro que todas as informações prestadas nesta ficha são verdadeiras e que ' +
        'não omiti nenhuma informação relevante sobre meu histórico de saúde, uso de ' +
        'medicamentos ou condições que possam interferir na segurança e na eficácia dos ' +
        'procedimentos.\n\n' +
        'Comprometo-me a informar o(a) profissional sobre qualquer alteração no meu estado ' +
        'de saúde ao longo do acompanhamento.',
      consents: [
        {
          name: 'veracidade',
          label: 'Responsabilizo-me pela veracidade de todas as respostas acima',
          required: true,
        },
        {
          name: 'autoriza_fotos',
          label: 'Autorizo o registro fotográfico de antes e depois para acompanhamento clínico',
        },
      ],
    },
    { kind: 'signature', name: 'assinatura_paciente', label: 'Assinatura do paciente' },
  ],
}
