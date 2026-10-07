/**
 * Textos do WhatsApp manual que a dona edita em /admin/avisos-manuais (v154).
 *
 * Cada mensagem tem um padrão do código; NULL no banco = usa o padrão. O
 * lembrete mora em message-templates.ts (variáveis {cliente}, {data}...). Os
 * de aniversário e sumidos seguem as variáveis de coupon-templates.ts
 * ({nome}, {negocio}, {desconto}, {validade}, {link}) porque é por lá que
 * eles são preenchidos na hora de enviar.
 */
import { suggestBirthdayTemplates, suggestTemplates } from './coupon-templates'

/* Era o TEXTO_CHAMAR fixo do SumidosPanel (aprovado pelo Eduardo em 06/09). */
export const DEFAULT_SUMIDOS_TEMPLATE =
  'Oi {nome}, aqui é do {negocio}. Faz {dias} dias desde seu último horário — quer que eu reserve um pra você?'

export function padraoAniversario(descricao: string | null | undefined): string {
  return suggestBirthdayTemplates(descricao)[0]
}

export function padraoSumidosCupom(descricao: string | null | undefined): string {
  return suggestTemplates(descricao)[0]
}

/**
 * Lista de modelos da campanha com o texto salvo da dona na frente. É ele que
 * abre selecionado; os modelos do nicho continuam como alternativa.
 */
export function comTextoSalvo(salvo: string | null | undefined, modelos: string[]): string[] {
  const t = salvo?.trim()
  if (!t) return modelos
  return [t, ...modelos.filter((m) => m !== t)]
}

/** Preenche o texto do "Chamar" dos sumidos. */
export function textoChamarSumido(
  modelo: string | null | undefined,
  vars: { nome: string; dias: number; negocio: string },
): string {
  return (modelo?.trim() || DEFAULT_SUMIDOS_TEMPLATE)
    .replace(/\{nome\}/g, vars.nome.trim().split(/\s+/)[0] || vars.nome)
    .replace(/\{dias\}/g, String(vars.dias))
    .replace(/\{negocio\}/g, vars.negocio)
}
