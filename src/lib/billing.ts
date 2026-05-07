/**
 * Helpers de billing — utilitários genéricos.
 * Lógica específica de provider (Asaas) está em src/lib/asaas.ts.
 */

/**
 * Calcula dias entre hoje e uma data — retorna negativo se data passada.
 * Ex: pago_ate = amanhã → retorna 1
 *     pago_ate = ontem  → retorna -1
 */
export function diasAteVencer(pagoAte: string | Date): number {
  const ate = pagoAte instanceof Date ? pagoAte : new Date(pagoAte)
  const agora = new Date()
  // Normaliza pra meia-noite pra não considerar horas
  ate.setHours(0, 0, 0, 0)
  agora.setHours(0, 0, 0, 0)
  return Math.ceil((ate.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))
}
