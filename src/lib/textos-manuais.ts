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

/* FICHA PRA CLIENTE PREENCHER (v158, 14/10/2026). Sai no "Mandar pra cliente
   preencher" da ficha. Nome do negócio logo no começo: a cliente identifica
   quem manda antes de ver o link (regra dos textos de aviso). Sem prazo de
   validade no texto — é atrito; quem abrir depois de 7 dias vê a página de
   "peça um novo link". */
export const DEFAULT_FICHA_TEMPLATE =
  'Oi {nome}, tudo bem? Aqui é {negocio}.\n\n' +
  'Pra deixar tudo pronto pro seu atendimento, preencha sua ficha por este link. ' +
  'Leva poucos minutos e você assina pelo próprio celular:\n\n' +
  '{link}\n\n' +
  'Qualquer dúvida, é só me chamar por aqui.'

/** Preenche o texto da ficha. Se a dona apagar o {link} do texto, o link vai no fim mesmo assim. */
export function textoFichaCliente(
  modelo: string | null | undefined,
  vars: { nome: string; negocio: string; ficha: string; link: string },
): string {
  let t = (modelo?.trim() || DEFAULT_FICHA_TEMPLATE)
    .replace(/\{nome\}/g, vars.nome.trim().split(/\s+/)[0] || vars.nome)
    .replace(/\{negocio\}/g, vars.negocio)
    .replace(/\{ficha\}/g, vars.ficha)
  if (t.includes('{link}')) t = t.replace(/\{link\}/g, vars.link)
  else t = `${t}\n\n${vars.link}`
  return t
}
