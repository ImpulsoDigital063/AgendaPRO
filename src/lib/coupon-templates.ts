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
    'E aí {nome}, sumiu hein! 👀 Tô segurando um cupom de {desconto} pra próxima passada na {negocio}. Vale {validade}: {link}',
    '{nome}, faz tempo demais que você não aparece. Bora desenrolar essa? Cupom de {desconto} válido por {validade}: {link}',
    'Fala {nome}! Cabelo crescendo aí? 😅 {desconto} off pra você voltar na {negocio}. Vale {validade}: {link}',
  ],
  salao: [
    'Oi {nome}, sumida! Tô com saudade aqui na {negocio} 💜 Separei {desconto} de desconto pra te receber de novo. Vale {validade}: {link}',
    '{nome}, faz um tempinho. Que tal voltar com {desconto} off? Vale {validade} aqui na {negocio}: {link}',
    'Oi linda! Notei que você sumiu. Tenho um agrado de {desconto} esperando — vale {validade}: {link}',
  ],
  estetica: [
    'Oi {nome}! Faz tempo que não te vejo aqui na {negocio}. Sua pele tá pedindo. {desconto} off na próxima sessão, vale {validade}: {link}',
    '{nome}, separei um cupom especial pra você voltar: {desconto} de desconto, válido por {validade}. {link}',
    'Oi querida! Tô lembrando que faz tempo que você não aparece. Que tal {desconto} off na próxima? Vale {validade}: {link}',
  ],
  nail: [
    '{nome}, sumiu! 💅 Saudade do nail. Cupom de {desconto} pra você voltar — vale {validade}: {link}',
    'Oi {nome}! Faz tempo demais. Separei {desconto} off na próxima nail aqui na {negocio}. Vale {validade}: {link}',
    'Ei, faz tempo hein! Vamos atualizar essa nail? {desconto} off, válido por {validade}: {link}',
  ],
  tatuagem: [
    'Fala {nome}! Pensando naquela tattoo? 🖋 Tô com {desconto} off pra você fechar. Vale {validade}: {link}',
    '{nome}, faz tempo. Cupom de {desconto} pra fechar a próxima sessão na {negocio}. Vale {validade}: {link}',
    'E aí, ficou só na ideia? Cupom de {desconto} off pra concretizar. Vale {validade}: {link}',
  ],
  psicologo: [
    'Oi {nome}, tudo bem? Faz um tempo desde nossa última sessão. Quando estiver pronto pra retomar, separei {desconto} de desconto na próxima — vale {validade}: {link}',
    '{nome}, cuidar de si é um processo contínuo. Sem pressão — quando quiser voltar, tem {desconto} off válido por {validade}: {link}',
  ],
  personal: [
    'E aí {nome}, parou? 💪 Hora de voltar! Cupom de {desconto} off na próxima sessão. Vale {validade}: {link}',
    '{nome}, faz tempo desde o último treino. Bora retomar com {desconto} off — vale {validade}: {link}',
    'Fala campeão/campeã! Os músculos pedem você de volta 😄 {desconto} off na próxima. Vale {validade}: {link}',
  ],
  manicure: [
    '{nome}, sumiu! 💅 Suas mãos pedindo manutenção. {desconto} off pra você voltar — vale {validade}: {link}',
    'Oi {nome}! Faz um tempinho hein. Cupom de {desconto} esperando você na {negocio}. Vale {validade}: {link}',
  ],
  generic: [
    'Oi {nome}! Faz tempo que não te vejo aqui na {negocio}. Tenho um cupom de {desconto} de desconto pra você voltar. Vale {validade}: {link}',
    '{nome}, faz tempo desde nosso último encontro. Separei {desconto} off na próxima — vale {validade}: {link}',
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
  if (type === 'percent') return `${value.toFixed(0)}% off`
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}
