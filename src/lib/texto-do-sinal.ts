/* Frase do sinal mostrada à cliente antes de agendar ("R$ 30 (R$ 100 para
   atendimentos acima de R$ 700)" ou "10% do valor"). Usada no BookingFlow e na
   escolha de procedimento da vitrine da clínica. */
import type { Business } from '@/lib/types'

export function textoDoSinal(b: Pick<Business, 'sinal_modo' | 'sinal_percent' | 'sinal_valor_fixo' | 'sinal_faixa_acima' | 'sinal_faixa_valor'>): string | null {
  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: Number.isInteger(v) ? 0 : 2 })
  if (b.sinal_modo !== 'fixo') return Number(b.sinal_percent) > 0 ? `${b.sinal_percent}% do valor` : null
  const fixo = Number(b.sinal_valor_fixo ?? 0)
  if (!(fixo > 0)) return null
  const acima = Number(b.sinal_faixa_acima ?? 0)
  const faixa = Number(b.sinal_faixa_valor ?? 0)
  return acima > 0 && faixa > 0 ? `${brl(fixo)} (${brl(faixa)} para atendimentos acima de ${brl(acima)})` : brl(fixo)
}
