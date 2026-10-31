import type { MerchantDeviceFee } from '@/lib/types'

type TaxasDaBandeira = Pick<
  MerchantDeviceFee,
  'rate_percent' | 'installment_rate_percent' | 'installment_rates'
>

// Taxa que a maquininha cobra para aquele número de parcelas.
// Sem linha na tabela (cadastro antigo), vale a taxa única de parcelado.
export function taxaDaParcela(fee: TaxasDaBandeira, parcelas: number): number {
  if (parcelas <= 1) return fee.rate_percent
  const daTabela = fee.installment_rates?.[String(parcelas)]
  if (typeof daTabela === 'number') return daTabela
  return fee.installment_rate_percent ?? fee.rate_percent
}

export function formatarTaxa(taxa: number): string {
  return taxa.toString().replace('.', ',')
}

// Texto digitado ("5,39") para número com 2 casas. Inválido devolve null.
export function lerTaxaDigitada(texto: string): number | null {
  const valor = parseFloat(texto.trim().replace(',', '.'))
  if (isNaN(valor) || valor < 0 || valor >= 100) return null
  return Math.round(valor * 100) / 100
}

export type TabelaDigitada = Record<string, string>

// Monta a tabela de 2x até o máximo. Toda parcela liberada precisa de taxa:
// em branco o líquido sairia errado sem ninguém perceber.
export function lerTabelaDeParcelas(
  maximo: number,
  textos: TabelaDigitada,
): { taxas: Record<string, number> } | { erro: string } {
  const taxas: Record<string, number> = {}
  for (let n = 2; n <= maximo; n++) {
    const taxa = lerTaxaDigitada(textos[String(n)] ?? '')
    if (taxa == null) return { erro: `Preencha a taxa de ${n}x (entre 0 e 99,99%)` }
    taxas[String(n)] = taxa
  }
  return { taxas }
}

// Preenche o formulário de edição. Cadastro antigo entra com a taxa única
// nas parcelas que já estavam liberadas, para o dono só ajustar.
export function tabelaParaDigitar(fee: MerchantDeviceFee): TabelaDigitada {
  const textos: TabelaDigitada = {}
  const liberadas = fee.allows_installments ? (fee.installments_max ?? 1) : 1
  for (let n = 2; n <= 12; n++) {
    const salva = fee.installment_rates?.[String(n)]
    if (typeof salva === 'number') textos[String(n)] = formatarTaxa(salva)
    else if (n <= liberadas && fee.installment_rate_percent != null) {
      textos[String(n)] = formatarTaxa(fee.installment_rate_percent)
    }
  }
  return textos
}
