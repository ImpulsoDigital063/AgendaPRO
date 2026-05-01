/**
 * Templates de mensagem "Oi sumido" personalizados por categoria
 * de negócio. Tom: autêntico, divertido, sem guru. Cliente final
 * recebe via WhatsApp do dono (deep link wa.me).
 *
 * Princípios:
 * - Dado real (faz tempo, nome do cliente, nome do negócio)
 * - Tom da categoria (barbearia mais tropa, salão mais carinhoso)
 * - 1-2 emojis máx (sem virar caricatura)
 * - CTA clara com link
 * - Curto (cabe em preview do WhatsApp)
 *
 * Placeholders disponíveis:
 *   {nome}    — primeiro nome do cliente
 *   {negocio} — nome do business
 *   {desconto}— ex "R$ 20" ou "15%"
 *   {validade}— ex "7 dias" ou "até 15/05"
 *   {link}    — URL com cupom embutido
 */

export type CategoryKey =
  | 'barbearia'
  | 'salao'
  | 'estetica'
  | 'nail'
  | 'tatuagem'
  | 'psicologo'
  | 'personal'
  | 'manicure'
  | 'generic'

const TEMPLATES: Record<CategoryKey, string[]> = {
  barbearia: [
    'Fala {nome}! Faz tempo que você não aparece aqui na {negocio}. Separei {desconto} de desconto na próxima visita. Vale {validade}: {link}',
    '{nome}, sentimos sua falta na {negocio}. Pra te trazer de volta, tem {desconto} de desconto te esperando — vale {validade}: {link}',
    'Oi {nome}, tudo bem? Notei que faz um tempo desde sua última visita. Separei {desconto} de desconto pra você voltar na {negocio}. Vale {validade}: {link}',
  ],
  salao: [
    'Oi {nome}! Faz tempo que você não aparece aqui no {negocio}. Separei {desconto} de desconto na próxima sessão. Vale {validade}: {link}',
    '{nome}, sentimos saudade aqui no {negocio}. Pra te receber de volta com carinho, tem {desconto} de desconto esperando — vale {validade}: {link}',
    'Oi {nome}, tudo bem? Notei que faz um tempinho desde nossa última sessão. Separei {desconto} de desconto na próxima visita ao {negocio}. Vale {validade}: {link}',
  ],
  estetica: [
    'Oi {nome}! Faz tempo que você não aparece na {negocio}. Separei {desconto} de desconto na próxima sessão. Vale {validade}: {link}',
    '{nome}, sua pele agradece o cuidado contínuo. Tem {desconto} de desconto na próxima visita à {negocio}, vale {validade}: {link}',
    'Oi {nome}, tudo bem? Notei que faz um tempo desde sua última sessão. Pra retomar, separei {desconto} de desconto na próxima — vale {validade}: {link}',
  ],
  nail: [
    'Oi {nome}! Faz tempo que você não aparece aqui na {negocio}. Tem {desconto} de desconto na próxima nail. Vale {validade}: {link}',
    '{nome}, sentimos saudade na {negocio}. Pra te receber de volta, separei {desconto} de desconto — vale {validade}: {link}',
    'Oi {nome}! Notei que faz um tempo desde a última manutenção. Tem {desconto} de desconto te esperando na {negocio}, vale {validade}: {link}',
  ],
  tatuagem: [
    'Fala {nome}! Pensando em fechar mais uma? Separei {desconto} de desconto na próxima sessão na {negocio}. Vale {validade}: {link}',
    '{nome}, faz tempo desde a última. Pra te trazer de volta, tem {desconto} de desconto na próxima sessão na {negocio} — vale {validade}: {link}',
    'Oi {nome}, tudo bem? Tem {desconto} de desconto te esperando na {negocio} pra próxima sessão. Vale {validade}: {link}',
  ],
  psicologo: [
    'Oi {nome}, tudo bem? Quando se sentir pronto pra retomar, separei {desconto} de desconto na próxima sessão. Vale {validade}: {link}',
    '{nome}, cuidar de si é um processo. Sem pressão — quando quiser voltar, tem {desconto} de desconto na próxima sessão, válido por {validade}: {link}',
  ],
  personal: [
    'Fala {nome}! Hora de voltar pros treinos. Separei {desconto} de desconto na próxima sessão. Vale {validade}: {link}',
    '{nome}, faz tempo desde o último treino. Pra retomar com gás, tem {desconto} de desconto na próxima sessão — vale {validade}: {link}',
    'Oi {nome}, tudo bem? Bora voltar à rotina? Tem {desconto} de desconto na próxima sessão te esperando. Vale {validade}: {link}',
  ],
  manicure: [
    'Oi {nome}! Faz tempo que você não aparece aqui na {negocio}. Tem {desconto} de desconto na próxima manutenção. Vale {validade}: {link}',
    '{nome}, sentimos sua falta na {negocio}. Separei {desconto} de desconto pra você voltar — vale {validade}: {link}',
  ],
  generic: [
    'Oi {nome}! Faz tempo que você não aparece na {negocio}. Tenho {desconto} de desconto pra você voltar. Vale {validade}: {link}',
    '{nome}, sentimos sua falta. Separei {desconto} de desconto na próxima visita à {negocio} — vale {validade}: {link}',
  ],
}

/**
 * Mapa de palavras-chave da `business.description` (categoria do
 * negócio cadastrada) pra CategoryKey. Match case-insensitive,
 * primeiro acerto vence.
 */
function detectCategory(description: string | null | undefined): CategoryKey {
  if (!description) return 'generic'
  const d = description.toLowerCase()
  if (d.includes('barbearia') || d.includes('barber')) return 'barbearia'
  if (d.includes('salão') || d.includes('salao') || d.includes('cabelo') || d.includes('cabelei')) return 'salao'
  if (d.includes('estética') || d.includes('estetica') || d.includes('clínica')) return 'estetica'
  if (d.includes('nail') || d.includes('nail designer')) return 'nail'
  if (d.includes('manicure') || d.includes('pedicure')) return 'manicure'
  if (d.includes('tatua') || d.includes('tattoo') || d.includes('tatto')) return 'tatuagem'
  if (d.includes('psicó') || d.includes('psico') || d.includes('terape')) return 'psicologo'
  if (d.includes('personal') || d.includes('treino') || d.includes('academia')) return 'personal'
  return 'generic'
}

/**
 * Nome de exemplo coerente com o nicho. Barbearia tem clientela
 * majoritariamente masculina, salão/estética/nail majoritariamente
 * feminina. Tatuagem/personal/psicólogo é misto.
 *
 * Usado no preview da campanha pra dono ver mensagem com nome
 * que faria sentido pra cliente típico dele (não "Maria" em
 * barbearia).
 */
const SAMPLE_NAMES: Record<CategoryKey, string> = {
  barbearia: 'Lucas',
  salao:     'Camila',
  estetica:  'Júlia',
  nail:      'Bianca',
  manicure:  'Letícia',
  tatuagem:  'Lucas',
  psicologo: 'Marina',
  personal:  'Rafael',
  generic:   'Cliente',
}

export function sampleNameFor(description: string | null | undefined): string {
  return SAMPLE_NAMES[detectCategory(description)]
}

/**
 * Sugere mensagens pra uma categoria (3 variações pra dono escolher
 * ou editar). Sempre retorna pelo menos 1 (generic).
 */
export function suggestTemplates(description: string | null | undefined): string[] {
  const cat = detectCategory(description)
  return TEMPLATES[cat] || TEMPLATES.generic
}

/**
 * Substitui placeholders do template por valores reais.
 */
export function fillTemplate(
  template: string,
  vars: {
    nome: string
    negocio: string
    desconto: string
    validade: string
    link: string
  }
): string {
  return template
    .replace(/\{nome\}/g, firstName(vars.nome))
    .replace(/\{negocio\}/g, vars.negocio)
    .replace(/\{desconto\}/g, vars.desconto)
    .replace(/\{validade\}/g, vars.validade)
    .replace(/\{link\}/g, vars.link)
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || full
}

/**
 * Formata "X dias" ou "até DD/MM" baseado em quantos dias.
 */
export function formatValidity(expiresAt: Date): string {
  const now = new Date()
  const diffMs = expiresAt.getTime() - now.getTime()
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (days <= 14) return `${days} dia${days === 1 ? '' : 's'}`
  return `até ${expiresAt.getDate().toString().padStart(2, '0')}/${(expiresAt.getMonth() + 1).toString().padStart(2, '0')}`
}

export function formatDiscount(type: 'fixed' | 'percent', value: number): string {
  // Sem sufixo "off" — templates já dizem "de desconto" explicitamente.
  // Retorna apenas o valor formatado: "15%" ou "R$ 10,00".
  if (type === 'percent') return `${value.toFixed(0)}%`
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}
