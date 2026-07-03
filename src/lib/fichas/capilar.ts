import type { NicheFicha } from './types'

/**
 * Ficha de anamnese capilar (salão · tranças/mega hair/fibras/química) — 3ª
 * ficha de nicho. Espelha a ficha real da Izanara (Studio Mood). Genérica: o
 * termo fala "o salão", não hardcoda a marca. Identidade vem do cadastro.
 */
export const CAPILAR_FICHA: NicheFicha = {
  slug: 'capilar',
  name: 'Capilar · Anamnese',
  segments: ['Salão de beleza'],
  sections: [
    {
      kind: 'fields',
      title: 'Cabelo',
      fields: [
        { name: 'tipo_cabelo', label: 'Tipo de cabelo', type: 'select', options: ['Liso', 'Ondulado', 'Cacheado', 'Crespo'] },
        { name: 'tipo_couro', label: 'Tipo de couro cabeludo', type: 'select', options: ['Oleoso', 'Normal', 'Seco', 'Sensível'] },
      ],
    },
    {
      kind: 'health',
      title: 'Saúde / histórico capilar — marque o que se aplica',
      detailLabel: 'Especifique os itens marcados (qual química, qual reação alérgica, etc.)',
      items: [
        'Possui química no cabelo',
        'Já teve reação alérgica a química ou produtos capilares',
        'Caspa',
        'Seborreia',
        'Queda excessiva',
        'Feridas no couro cabeludo',
        'Dor de cabeça / enxaqueca com frequência',
        'Já usou tranças / entrelace / crochê braids / mega hair / fibras antes',
      ],
    },
    {
      kind: 'fields',
      title: 'Procedimento',
      fields: [
        { name: 'preocupacao', label: 'Principal preocupação com o procedimento', type: 'textarea' },
        { name: 'experiencia_negativa', label: 'Se já usou tranças/fibras: teve experiência negativa? (dor, coceira, quebra, alergia)', type: 'textarea' },
      ],
    },
    {
      kind: 'term',
      title: 'Termo de Consentimento e Uso de Imagem',
      text: 'Declaro que: estou ciente de que o tempo de uso recomendado para tranças/fibras é de até 6 semanas; sei da importância da manutenção para preservar a saúde do meu cabelo e couro cabeludo; estou informada de que o uso prolongado além do tempo recomendado pode causar danos, pelos quais o salão não se responsabiliza; declaro que as informações acima são verdadeiras sobre meu histórico capilar e possíveis alergias/problemas de saúde, não cabendo à profissional qualquer responsabilidade por informações omitidas; autorizo o procedimento sabendo que eventuais desconfortos iniciais podem ocorrer (sensibilidade, coceira leve, dor temporária).',
      consents: [
        { name: 'aceite', label: 'Li e concordo com o termo e declaro que as informações são verdadeiras', required: true },
        { name: 'autoriza_imagem', label: 'Autorizo o uso da minha imagem (fotos/vídeos) para divulgação, sem bônus financeiro' },
      ],
    },
    { kind: 'signature', name: 'assinatura', label: 'Assinatura da cliente' },
  ],
}
