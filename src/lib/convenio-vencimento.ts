/**
 * Vencimento da fatura de convênio.
 *
 * A empresa paga a competência do mês fechado no dia combinado do mês
 * SEGUINTE — julho vence em agosto. O Gustavo (CAF) descreveu assim no áudio
 * de 25/08: "a prefeitura vai me pagar todo dia 10; eu jogo uns 2, 3 dias pra
 * frente e pago a equipe dia 12".
 *
 * Sem `dia_vencimento` cadastrado o sistema NÃO afirma atraso — antes disso os
 * avisos usavam um limiar de 20 dias inventado, que gritava dentro do prazo e
 * calava fora dele.
 */

/** '2026-07' + dia 10 → '2026-08-10'. Dia maior que o mês tem cai no último. */
export function vencimentoDaCompetencia(competencia: string, dia: number | null): string | null {
  if (!dia || !/^\d{4}-\d{2}$/.test(competencia)) return null
  const ano = parseInt(competencia.slice(0, 4), 10)
  const mes = parseInt(competencia.slice(5, 7), 10) // 1-based
  const anoV = mes === 12 ? ano + 1 : ano
  const mesV = mes === 12 ? 1 : mes + 1
  // Dia 31 em mês de 30: cai no último dia, não vira o mês seguinte.
  const ultimo = new Date(Date.UTC(anoV, mesV, 0)).getUTCDate()
  const diaV = Math.min(dia, ultimo)
  return `${anoV}-${String(mesV).padStart(2, '0')}-${String(diaV).padStart(2, '0')}`
}

/** Dias de atraso (0 = em dia ou ainda não venceu). */
export function diasDeAtraso(vencimento: string | null, hoje: string): number {
  if (!vencimento) return 0
  const d = Math.round(
    (new Date(hoje + 'T12:00:00').getTime() - new Date(vencimento + 'T12:00:00').getTime()) / 86400000,
  )
  return d > 0 ? d : 0
}

/** Texto curto pro card: o que dizer sobre o prazo daquela competência. */
export function textoVencimento(
  competencia: string,
  dia: number | null,
  hoje: string,
): { texto: string; atrasada: boolean } | null {
  const venc = vencimentoDaCompetencia(competencia, dia)
  if (!venc) return null
  const atraso = diasDeAtraso(venc, hoje)
  const [, m, d] = venc.split('-')
  if (atraso > 0) return { texto: `venceu ${d}/${m} · ${atraso} dia${atraso !== 1 ? 's' : ''} de atraso`, atrasada: true }
  return { texto: `vence ${d}/${m}`, atrasada: false }
}
