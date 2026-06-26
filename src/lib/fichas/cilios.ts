import type { NicheFicha } from './types'

/**
 * Ficha de cílios (lash) — primeira ficha dedicada por nicho.
 * Espelha a ficha de papel da Rosy + padrão do segmento (pesquisa 26/06).
 * Identidade do cliente (nome/nasc/telefone/CPF) vem do cadastro — não se
 * repete aqui. Conteúdo editável; layout fixo no componente.
 */
export const CILIOS_FICHA: NicheFicha = {
  slug: 'cilios',
  name: 'Cílios · Anamnese',
  sections: [
    {
      kind: 'health',
      title: 'Fale sobre a sua saúde',
      detailLabel: 'Detalhar os itens marcados (qual alergia, medicamento, etc.)',
      items: [
        'Gestante', 'Lactante / amamentando', 'Diabetes', 'Faz uso de medicamento',
        'Disfunção da tireoide', 'Problema circulatório', 'Hipertensão', 'Distúrbio hormonal',
        'Alergia a cosmético / cola / látex', 'Fez procedimento nos olhos recentemente',
        'Glaucoma / blefarite / problema ocular', 'Conjuntivite / terçol / doença ocular ativa',
        'Usa lentes de contato', 'Cirurgia ocular', 'Em tratamento médico',
        'Tratamento oncológico (quimio/radio)', 'Tratamento dermatológico recente',
        'Olhos sensíveis / ressecamento', 'Já fez extensão antes (teve reação)', 'Dorme de lado',
      ],
    },
    {
      kind: 'mapping',
      title: 'Mapping & Estilo',
      drawName: 'mapeamento',
      params: [
        { name: 'efeito', label: 'Efeito', type: 'select', options: ['Fio a fio (clássico)', 'Volume Russo', 'Volume Brasileiro', 'Volume Egípcio', 'Híbrido', 'Megavolume', 'Wispy', 'Outros'] },
        { name: 'tamanho', label: 'Tamanho / comprimento (mm)', type: 'text' },
        { name: 'curvatura', label: 'Curvatura', type: 'select', options: ['B', 'C', 'CC', 'D', 'DD', 'L', 'LU', 'M'] },
        { name: 'espessura', label: 'Espessura (mm)', type: 'select', options: ['0.03', '0.05', '0.07', '0.10', '0.15', '0.20'] },
      ],
    },
    {
      kind: 'fields',
      title: 'Aplicação',
      fields: [
        { name: 'cola_lote', label: 'Cola — marca, lote e validade', type: 'text' },
        { name: 'observacoes', label: 'Observações do atendimento', type: 'textarea' },
      ],
    },
    {
      kind: 'term',
      title: 'Termo de Responsabilidade',
      text: 'Autorizo a realização do procedimento e o registro de antes/depois para documentação. Comprometo-me a seguir os cuidados orientados após o procedimento. Declaro verdadeiras as informações acima, isentando a profissional por dados omitidos nesta avaliação.',
      consents: [
        { name: 'aceite', label: 'Li e concordo com o termo · declaro as informações verdadeiras', required: true },
        { name: 'autoriza_imagem', label: 'Autorizo uso de imagem (antes/depois) para portfólio' },
      ],
    },
    { kind: 'signature', name: 'assinatura', label: 'Assinatura do cliente' },
  ],
}

export const NICHE_FICHAS: Record<string, NicheFicha> = {
  cilios: CILIOS_FICHA,
}
