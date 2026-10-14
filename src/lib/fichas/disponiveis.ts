import type { NicheFicha } from './types'
import { NICHE_FICHAS } from './registry'

/**
 * QUAIS FICHAS UM NEGÓCIO PODE VER.
 *
 * Fonte única da regra. Antes ela vivia duplicada na rota
 * (/api/admin/niche-fichas) e no FichasTab — e duplicata de regra de
 * visibilidade é como ficha aparecer num lugar e sumir no outro.
 *
 * Duas travas, nesta ordem:
 *
 * 1. `businessSlugs` — exclusividade. Se a ficha declara os negócios dela, só
 *    eles enxergam, e o segmento nem é consultado. É o que permite atender
 *    pedido de um cliente sem mudar o padrão de todo mundo.
 *
 * 2. `segments` — categoria do negócio. Vazio/ausente = todos.
 *
 * "Disponível" NÃO é "ligada": o dono ainda escolhe quais quer em
 * `businesses.enabled_niche_fichas`. Esta função responde só a primeira
 * pergunta.
 */
export function fichaVisivelPara(
  ficha: NicheFicha,
  opts: { categoria: string | null; slug: string | null },
): boolean {
  if (ficha.businessSlugs?.length) {
    return opts.slug ? ficha.businessSlugs.includes(opts.slug) : false
  }
  if (!ficha.segments || ficha.segments.length === 0) return true
  const cat = (opts.categoria ?? '').toLowerCase()
  return ficha.segments.some((s) => s.toLowerCase() === cat)
}

/* As exclusivas do negócio vêm primeiro (14/10/2026): são o papel do próprio
   cliente, a ficha que ele mais abre. No fim de uma lista de 18 ela sumia
   atrás dos modelos genéricos. Fora isso a ordem segue a do registry. */
export function fichasDisponiveis(opts: { categoria: string | null; slug: string | null }): NicheFicha[] {
  const visiveis = Object.values(NICHE_FICHAS).filter((f) => fichaVisivelPara(f, opts))
  return [...visiveis.filter((f) => f.businessSlugs?.length), ...visiveis.filter((f) => !f.businessSlugs?.length)]
}
