/**
 * Converte valor digitado em reais pra número. Auditoria de produtos 28/09.
 *
 * Os campos de preço eram `type="number"`: "1.450,00" (como se escreve
 * dinheiro no Brasil) virava '' no navegador, o código gravava null e o
 * preço sumia com "Salvo!". Agora o campo é texto e a conversão é aqui.
 *
 * Aceita: "150", "150,5", "150,50", "1.450,00", "1450.50", "R$ 1.450".
 * Devolve null quando está vazio, e NaN quando não dá pra entender — a
 * tela avisa em vez de apagar o valor.
 */
export function parseValorBR(texto: string | null | undefined): number | null {
  const t = (texto ?? '').replace(/R\$\s?/i, '').replace(/\s/g, '').trim()
  if (!t) return null
  let limpo: string
  if (t.includes(',')) {
    // vírgula = decimal · pontos = milhar
    limpo = t.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    // "1.450" ou "1.450.000" · só milhar
    limpo = t.replace(/\./g, '')
  } else {
    // "1450.50" · ponto decimal
    limpo = t
  }
  if (!/^\d+(\.\d+)?$/.test(limpo)) return NaN
  const n = Number(limpo)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN
}

/** Número → texto de campo ("1450.5" → "1450,50"). */
export function valorParaCampo(n: number | null | undefined): string {
  return n == null ? '' : n.toFixed(2).replace('.', ',')
}
