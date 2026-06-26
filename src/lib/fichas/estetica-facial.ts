import type { NicheFicha } from './types'

/**
 * Ficha de anamnese de estética facial (limpeza de pele) — 2ª ficha de nicho.
 * Espelha a ficha de papel da Rosy. Sem mapeamento/assinatura (a folha não
 * tem) e sem dados pessoais (vêm do cadastro · pedido da Rosy no áudio 26/06).
 */
export const ESTETICA_FACIAL_FICHA: NicheFicha = {
  slug: 'estetica-facial',
  name: 'Estética Facial · Anamnese',
  segments: ['Salão de beleza', 'Clínica estética', 'Nail designer', 'Manicure'],
  sections: [
    {
      kind: 'health',
      title: 'Saúde / histórico',
      detailLabel: 'Informação adicional · detalhar os marcados (qual medicamento, alergia, fator do filtro, etc.)',
      items: [
        'Fez tratamento estético anterior',
        'Alérgico a algum medicamento',
        'Faz uso de algum medicamento',
        'Faz uso regular de filtro solar',
        'Usa ácido ou peeling químico',
        'Já teve câncer de pele',
        'Casos de câncer de pele na família',
        'Grávida ou amamentando',
      ],
    },
    {
      kind: 'fields',
      title: 'Análise visual',
      fields: [
        { name: 'cor_pele', label: 'Cor da pele', type: 'select', options: ['Branca', 'Parda', 'Preta'] },
        { name: 'biotipo', label: 'Biótipo', type: 'select', options: ['Normal', 'Mista', 'Oleosa', 'Seca'] },
        { name: 'hidratacao', label: 'Grau de hidratação', type: 'select', options: ['Hidratada', 'Semi-hidratada', 'Desidratada'] },
        { name: 'acne', label: 'Acne', type: 'select', options: ['Não', 'Grau I', 'Grau II', 'Grau III'] },
        { name: 'textura', label: 'Textura da pele', type: 'select', options: ['Fina', 'Áspera', 'Normal', 'Com rugas', 'Espessa', 'Flácida'] },
        { name: 'glogau', label: 'Grau de envelhecimento (Glogau)', type: 'select', options: ['Leve', 'Moderado', 'Avançado', 'Severo'] },
        { name: 'rugas', label: 'Rugas', type: 'select', options: ['Superficiais', 'Médias', 'Profundas'] },
        { name: 'rugas_onde', label: 'Rugas — onde?', type: 'text' },
      ],
    },
    {
      kind: 'fields',
      title: 'Tratamento realizado',
      fields: [
        { name: 'tratamento', label: 'Tratamento realizado', type: 'textarea' },
      ],
    },
  ],
}
