/**
 * Selo "novo" no menu · fonte única (Eduardo, 08/09/2026).
 *
 * A dona abre o painel todo dia e não repara em item que apareceu — foi o que
 * aconteceu com o Reativar sumidos, que existia há meses escondido dentro de
 * Clientes e ninguém usava. O selo dura um tempo e some sozinho: ninguém
 * precisa lembrar de tirar, que é como esse tipo de marcação morre suja.
 *
 * Pra marcar uma aba nova: acrescente a rota com a data em que ela entrou.
 * Data no fuso do Brasil, formato YYYY-MM-DD.
 */

/** Quantos dias o selo fica visível depois da data de estreia. */
export const DIAS_COM_SELO = 30

export const NOVIDADES: Readonly<Record<string, string>> = {
  '/admin/sumidos': '2026-09-08',
  /* Sinal não é tela nova — existe há meses. O selo entrou em 08/09 a pedido
     do Eduardo pra chamar atenção de quem ainda não usa: é a tela que segura
     dinheiro de horário furado. Some sozinha em 30 dias, como as outras. */
  '/admin/financeiro/sinal': '2026-09-08',
  '/admin/cartao-presente': '2026-08-26',
}

/**
 * `true` enquanto a rota estiver dentro da janela do selo.
 * Compara só a parte de data — sem hora, sem fuso, sem surpresa às 21h.
 */
export function ehNovidade(href: string, hojeYmd?: string): boolean {
  const estreia = NOVIDADES[href.split('?')[0]]
  if (!estreia) return false
  const hoje = hojeYmd ?? new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const fim = new Date(estreia + 'T00:00:00Z')
  fim.setUTCDate(fim.getUTCDate() + DIAS_COM_SELO)
  return hoje >= estreia && hoje < fim.toISOString().slice(0, 10)
}
