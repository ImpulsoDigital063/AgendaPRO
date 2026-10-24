/* VITRINE DA CLÍNICA (protótipo Ivna Loyola, 22/10/2026) · categorias dos serviços.
   Ainda não existe coluna de categoria em services: por enquanto a categoria sai
   do nome do serviço. Quando a dona revisar, isso vira dado no banco e este
   arquivo some. */

export const CATEGORIAS = [
  'Harmonização facial',
  'Estética facial',
  'Micropigmentação',
  'Alongamento de cílios',
  'Sobrancelhas',
  'Spa e bem-estar',
  'Outros serviços',
] as const

export type Categoria = (typeof CATEGORIAS)[number]

const REGRAS: [Categoria, RegExp][] = [
  ['Harmonização facial', /toxina|preenchimento|harmoniza|blefaro/i],
  ['Micropigmentação', /micropig|combo diva/i],
  ['Alongamento de cílios', /c[ií]lios|lash/i],
  ['Sobrancelhas', /sobrancelha|brow/i],
  ['Estética facial', /limpeza de pele|peeling|microagulhamento facial/i],
  ['Spa e bem-estar', /banho de lua|escalda|massagem/i],
]

export function categoriaDoServico(nome: string): Categoria {
  return REGRAS.find(([, r]) => r.test(nome))?.[0] ?? 'Outros serviços'
}

/* Emoji no nome do serviço ("Combo Diva 🌹") não entra na página. */
export function nomeLimpo(nome: string): string {
  return nome.replace(/\p{Extended_Pictographic}|️/gu, '').replace(/\s+-\s*$/, '').replace(/\s{2,}/g, ' ').trim()
}
