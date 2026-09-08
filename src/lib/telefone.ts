/**
 * CHAVE CANÔNICA DE TELEFONE — uma só, pra base inteira.
 *
 * Por que existe (08/09/2026): o painel gravava "(91) 98338-0203" e o
 * importador gravava "+5591983380203". O `unique (business_id, phone)` compara
 * texto puro, então as duas formas passavam como pessoas diferentes. A Wanessa
 * terminou com 17 clientes duplicados — 10% da base dela — e continuava
 * duplicando a cada atendimento, porque a busca do painel também só procurava
 * no formato brasileiro.
 *
 * A regra: comparação de telefone NUNCA é feita sobre a string gravada. Sempre
 * sobre `chaveTelefone()`. Pra achar no banco sem varrer tudo, `variantesTelefone()`
 * devolve os formatos que existem na base, pra usar com `.in('phone', ...)`.
 */

/**
 * Reduz qualquer telefone brasileiro a só dígitos, sem o 55 do país.
 * "(91) 98338-0203" · "+5591983380203" · "91983380203" → "91983380203"
 * Retorna null se não sobrar um telefone plausível (10 ou 11 dígitos).
 */
export function chaveTelefone(raw: string | null | undefined): string | null {
  if (!raw) return null
  let d = String(raw).replace(/\D/g, '')
  if (!d) return null
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2)
  if (d.length !== 10 && d.length !== 11) return null
  if (parseInt(d.slice(0, 2), 10) < 11) return null
  return d
}

/**
 * Todos os formatos em que ESTE telefone pode estar gravado na base.
 * Serve pra `.in('phone', variantesTelefone(x))` — usa índice, não varre tabela.
 */
export function variantesTelefone(raw: string | null | undefined): string[] {
  const d = chaveTelefone(raw)
  if (!d) return raw ? [String(raw)] : []
  const formatado =
    d.length === 11
      ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
      : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return [...new Set([formatado, `+55${d}`, d, `55${d}`, raw ? String(raw) : ''].filter(Boolean))]
}

/** Dois telefones são a mesma linha, escritos de formas diferentes? */
export function mesmoTelefone(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = chaveTelefone(a)
  const kb = chaveTelefone(b)
  return !!ka && ka === kb
}
