/**
 * Combo com material ALTERNATIVO (v120 · "qual cor saiu?") pronto pra cair
 * numa venda/comanda. Usado pelo PDV e pelo Editar atendimento · a escolha de
 * cor e o rateio saem iguais nos dois (o AgendarModal tem a mesma regra).
 *
 * Itens com o mesmo `option_group` são o mesmo material em cores diferentes:
 * entra UM só. Sem isso um combo de 3 cores cobraria e baixaria as 3.
 */
import { ratearCombo, type ComboItemInput } from '@/lib/combo-rateio'

export type ComboItem = ComboItemInput & {
  option_group: string | null
  products?: (NonNullable<ComboItemInput['products']> & { quantity: number | null; track_stock: boolean | null }) | null
}
export type Combo = { id: string; name: string; price: number | null; package_items: ComboItem[] | null }

/** Select do Supabase com tudo que o rateio e a escolha de cor precisam. */
export const COMBO_SELECT =
  'id, name, price, package_items (service_id, product_id, quantity, unit_price, option_group, services (id, name, price, duration_minutes), products (id, name, variant, price, quantity, track_stock, commission_type, commission_value))'

export type MaterialCombo = { product_id: string; nome: string; quantity: number; unit_price: number; estoque: number | null }
export type ComboMontado = {
  nome: string
  servicos: { service_id: string; price: number }[]
  produtos: MaterialCombo[]
  /** Soma do que a comanda vai gravar (sem 1 centavo de diferença do arredondamento). */
  preco: number
}

/** Um material por grupo de cor: o escolhido, senão o primeiro com saldo, senão o primeiro. */
export function resolverItens(combo: Combo, escolhas: Record<string, string>): ComboItem[] {
  const itens = combo.package_items ?? []
  const out: ComboItem[] = []
  const vistos = new Set<string>()
  for (const it of itens) {
    const g = it.option_group
    if (!g) { out.push(it); continue }
    if (vistos.has(g)) continue
    vistos.add(g)
    const opcoes = itens.filter((x) => x.option_group === g)
    const escolhido = escolhas[g] ? opcoes.find((x) => x.product_id === escolhas[g]) : undefined
    const comSaldo = opcoes.find((x) => x.products?.track_stock === false || Number(x.products?.quantity ?? 0) > 0)
    out.push(escolhido ?? comSaldo ?? opcoes[0])
  }
  return out
}

export function gruposDeCor(combo: Combo): { group: string; opcoes: ComboItem[] }[] {
  const itens = combo.package_items ?? []
  const ordem: string[] = []
  for (const it of itens) if (it.option_group && !ordem.includes(it.option_group)) ordem.push(it.option_group)
  return ordem.map((g) => ({ group: g, opcoes: itens.filter((x) => x.option_group === g) })).filter((x) => x.opcoes.length > 1)
}

/** Escolhas que entrariam por padrão (pra o seletor nascer marcado). */
export function escolhasPadrao(combo: Combo): Record<string, string> {
  const out: Record<string, string> = {}
  for (const it of resolverItens(combo, {})) if (it.option_group && it.product_id) out[it.option_group] = it.product_id
  return out
}

export function nomeProduto(p: { name: string; variant: string | null } | null | undefined) {
  return p ? (p.variant ? `${p.name} · ${p.variant}` : p.name) : ''
}

/** Serviço pelo valor cheio + material com o resto (ratearCombo), na cor escolhida. */
export function montarCombo(combo: Combo, escolhas: Record<string, string>): ComboMontado {
  const itens = resolverItens(combo, escolhas)
  const { servicos, produtos } = ratearCombo(Number(combo.price ?? 0), itens)
  const porId = new Map(itens.filter((i) => i.products).map((i) => [i.product_id as string, i.products!]))
  const mat: MaterialCombo[] = produtos.map((x) => {
    const pr = porId.get(x.product_id)
    return { product_id: x.product_id, nome: x.product_name, quantity: x.quantity, unit_price: x.unit_price, estoque: pr?.track_stock === false ? null : Number(pr?.quantity ?? 0) }
  })
  const svc = servicos.map((x) => ({ service_id: x.service_id, price: x.price }))
  const preco = Math.round((svc.reduce((t, x) => t + x.price, 0) + mat.reduce((t, x) => t + x.quantity * x.unit_price, 0)) * 100) / 100
  const cores = gruposDeCor(combo).length > 0 ? mat.map((x) => x.nome).join(' + ') : ''
  return { nome: cores ? `${combo.name} · ${cores}` : combo.name, servicos: svc, produtos: mat, preco }
}

/** Material sem saldo pra `vezes` combos (só produto com controle ligado). */
export function faltaMaterial(produtos: MaterialCombo[], vezes: number): MaterialCombo | null {
  return produtos.find((p) => p.estoque != null && p.quantity * vezes > p.estoque) ?? null
}
