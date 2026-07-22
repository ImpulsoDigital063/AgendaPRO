/**
 * Rateio do preço de um COMBO (packages) entre serviço e produto.
 *
 * Regra cravada por Eduardo em 21/07/2026, caso Studio Mood (Izanara):
 *
 *   O SERVIÇO entra pelo valor CHEIO · o PRODUTO absorve a diferença.
 *
 * Por quê: a comissão da profissional sai sobre o valor do atendimento
 * (`remuneracoes/[professionalId]/page.tsx`: base × pct). Se o combo entrasse
 * como um serviço de R$290, a comissão incidiria sobre material também — com
 * as duas profissionais da Izanara a 60%, R$57 a mais por atendimento,
 * invisível no relatório. Mantendo o serviço no valor cheio (R$195) e jogando
 * o restante no produto, a base da comissão fica correta e o total da comanda
 * fecha no preço do combo.
 *
 * Exemplo real:
 *   combo R$290 = Gypsy Braids Cintura (R$195) + 0,5 pacote de cabelo
 *   -> serviço: R$195      (base da comissão · 60% = R$117)
 *   -> cabelo:  0,5 × R$190 = R$95
 *   -> comanda: R$290
 *
 * Puro de propósito: sem React, sem fetch. Serve o AgendarModal (desktop) e,
 * quando chegar a vez, o fluxo do mobile — o cálculo tem que ser o MESMO nos
 * dois fronts, senão a comissão diverge por onde a pessoa agendou.
 */

export type ComboItemInput = {
  service_id: string | null
  product_id: string | null
  quantity: number
  unit_price: number | null
  services?: { id: string; name: string; price: number | null; duration_minutes: number | null } | null
  products?: { id: string; name: string; variant: string | null; price: number | null; commission_type: string | null; commission_value: number | null } | null
}

export type RateioServico = {
  service_id: string
  duration: number
  price: number
}

export type RateioProduto = {
  product_id: string
  product_name: string
  quantity: number
  /** Preço POR UNIDADE · a comanda multiplica por quantity. */
  unit_price: number
  commission_type: string | null
  commission_value: number | null
}

export type ResultadoRateio = {
  servicos: RateioServico[]
  produtos: RateioProduto[]
  /** Soma dos serviços (base da comissão). */
  somaServicos: number
  /** Quanto sobrou pro material. Negativo = serviços passaram do preço do combo. */
  restoBruto: number
  /** Serviços custam mais que o combo · material entrou zerado. */
  excedeu: boolean
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function ratearCombo(comboPrice: number, itens: ComboItemInput[]): ResultadoRateio {
  const preco = Math.max(0, num(comboPrice))
  const svcItens = itens.filter((it) => it.service_id && it.services)
  const prodItens = itens.filter((it) => it.product_id && it.products)

  // 1) Serviços · valor cheio. quantity > 1 vira N entradas: um atendimento não
  //    tem "quantidade" por linha, tem uma linha por execução.
  const servicos: RateioServico[] = []
  for (const it of svcItens) {
    const price = num(it.unit_price ?? it.services?.price ?? 0)
    const vezes = Math.max(1, Math.round(num(it.quantity, 1)))
    for (let i = 0; i < vezes; i++) {
      servicos.push({
        service_id: it.service_id as string,
        duration: it.services?.duration_minutes ?? 60,
        price,
      })
    }
  }
  const somaServicos = servicos.reduce((s, l) => s + l.price, 0)

  // 2) Produtos · absorvem (preço do combo − serviços), rateado por peso.
  const restoBruto = preco - somaServicos
  const resto = Math.max(0, restoBruto)
  const pesos = prodItens.map((it) => Math.max(0, num(it.unit_price ?? it.products?.price ?? 0) * num(it.quantity)))
  const somaPesos = pesos.reduce((s, p) => s + p, 0)

  const produtos: RateioProduto[] = prodItens.map((it, i) => {
    const qtd = num(it.quantity)
    // Sem base de rateio (produtos sem preço de tabela) → divide igualmente.
    const fatia = somaPesos > 0
      ? resto * (pesos[i] / somaPesos)
      : (prodItens.length > 0 ? resto / prodItens.length : 0)
    const p = it.products!
    return {
      product_id: p.id,
      product_name: p.variant ? `${p.name} · ${p.variant}` : p.name,
      quantity: qtd,
      unit_price: qtd > 0 ? Number((fatia / qtd).toFixed(2)) : 0,
      commission_type: p.commission_type,
      commission_value: p.commission_value,
    }
  })

  return { servicos, produtos, somaServicos, restoBruto, excedeu: restoBruto < 0 }
}
