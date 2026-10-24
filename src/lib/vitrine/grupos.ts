/* VITRINE DA CLÍNICA · agrupa variações do mesmo procedimento num item só
   ("Alongamento de cílios - Técnica Fox" → grupo "Alongamento de cílios",
   opção "Técnica Fox"). Sai do nome que a dona já cadastrou, sem recadastro.
   Protótipo Ivna Loyola (22/10/2026); vira dado no banco junto com a categoria. */
import { categoriaDoServico, nomeLimpo, type Categoria } from './categorias'

export type ServicoBase = { id: string; name: string; price: number | null; duration_minutes: number | null; description?: string | null }
export type Opcao = { id: string; rotulo: string; preco: number | null; duracao: number | null; descricao: string | null }
export type Grupo = { chave: string; nome: string; categoria: Categoria; opcoes: Opcao[] }

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const REGRAS: { r: RegExp; grupo: string; opcao: (m: RegExpMatchArray, nome: string) => string }[] = [
  { r: /^Alongamento de c[ií]lios\s*-\s*(.+)$/i, grupo: 'Alongamento de cílios', opcao: (m) => m[1] },
  { r: /^Epila[cç][aã]o\s*(?:-\s*|de\s+)?(.+)$/i, grupo: 'Epilação', opcao: (m) => maiuscula(m[1]) },
  { r: /^Limpeza de pele(?:\s*\+\s*(.+))?$/i, grupo: 'Limpeza de pele', opcao: (m, n) => (m[1] ? `Com ${m[1].toLowerCase()}` : n) },
  { r: /^Banho de lua\s+(.+)$/i, grupo: 'Banho de lua', opcao: (m) => maiuscula(m[1]) },
  { r: /^Avalia[cç][aã]o\s+(?:para\s+(?:a\s+)?|de\s+)?(.+)$/i, grupo: 'Avaliação', opcao: (m) => maiuscula(m[1]) },
]

/* Nome comprido com observação entre parênteses: o resto vira descrição. */
function separarObservacao(nome: string): { nome: string; obs: string | null } {
  const m = nome.match(/^(.+?)\s*\((.{25,})\)?$/)
  return m ? { nome: m[1].trim(), obs: m[2].replace(/\)$/, '').trim() } : { nome, obs: null }
}

export function agrupar(servicos: ServicoBase[]): Grupo[] {
  const grupos = new Map<string, Grupo>()
  for (const s of servicos) {
    const limpo = nomeLimpo(s.name)
    const { nome, obs } = separarObservacao(limpo)
    const regra = REGRAS.map((x) => ({ x, m: nome.match(x.r) })).find((y) => y.m)
    const nomeGrupo = regra ? regra.x.grupo : nome
    const categoria = categoriaDoServico(s.name)
    const chave = `${categoria}|${nomeGrupo}`
    if (!grupos.has(chave)) grupos.set(chave, { chave, nome: nomeGrupo, categoria, opcoes: [] })
    grupos.get(chave)!.opcoes.push({
      id: s.id,
      rotulo: regra ? regra.x.opcao(regra.m!, nome) : nome,
      preco: s.price ? Number(s.price) : null,
      duracao: s.duration_minutes,
      descricao: obs ?? s.description ?? null,
    })
  }
  for (const g of grupos.values()) g.opcoes.sort((a, b) => (a.preco ?? Infinity) - (b.preco ?? Infinity))
  return [...grupos.values()]
}

/* "lábio" acha "Micropigmentação labial": sem acento e sem caixa. */
export const normalizar = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
