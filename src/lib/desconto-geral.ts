/**
 * De onde sai o DESCONTO GERAL da comanda (invoices.manual_discount).
 * Eduardo 28/09/2026: "no momento que for adicionar o desconto falar de onde
 * vem, assim se tiver comissão no serviço e não no produto o financeiro sai
 * correto, e vice-versa".
 *
 * invoices.discount_target (v148):
 *  - 'servico'      → só os atendimentos absorvem o desconto
 *  - 'produto'      → só os produtos absorvem
 *  - 'proporcional' → todos, pelo peso do total de cada item (comportamento
 *                     anterior · default das comandas antigas)
 * Se o alvo não tem item com valor na comanda (ex: 'produto' sem produto),
 * cai no proporcional — o desconto nunca some.
 *
 * Única régua pra serviço (getApptDiscountMap → comissão, Hub, Início…) e
 * produto (acertarValorDosProdutosDaComanda → sales.total). As duas partes
 * sempre somam o desconto inteiro.
 */

export type AlvoDesconto = 'proporcional' | 'servico' | 'produto'

export function normalizarAlvo(v: unknown): AlvoDesconto {
  return v === 'servico' || v === 'produto' ? v : 'proporcional'
}

export type ItemRateio = { chave: string; tipo: string; total: number }

/** chave do item → R$ do desconto geral que cabe a ele. */
export function ratearDescontoGeral(
  itens: ItemRateio[],
  desconto: number,
  alvo: AlvoDesconto,
): Map<string, number> {
  const out = new Map<string, number>()
  if (!(desconto > 0) || itens.length === 0) return out

  const doTipo = (t: string) => itens.filter((i) => i.tipo === t && i.total > 0)
  let elegiveis = alvo === 'servico' ? doTipo('appointment') : alvo === 'produto' ? doTipo('product') : itens.filter((i) => i.total > 0)
  if (elegiveis.length === 0) elegiveis = itens.filter((i) => i.total > 0)
  const soma = elegiveis.reduce((s, i) => s + i.total, 0)
  if (!(soma > 0)) return out

  // Arredonda em centavos e joga a sobra no último, pra somar exato.
  let distribuido = 0
  elegiveis.forEach((i, idx) => {
    const parte = idx === elegiveis.length - 1
      ? Math.round((desconto - distribuido) * 100) / 100
      : Math.round(((desconto * i.total) / soma) * 100) / 100
    distribuido += parte
    out.set(i.chave, (out.get(i.chave) ?? 0) + parte)
  })
  return out
}
