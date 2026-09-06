/**
 * Texto do WhatsApp da aba Sumidos.
 *
 * Quem fala aqui é a DONA falando com a cliente dela — não é o AgendaPRO
 * falando. Por isso o texto não leva o prefixo de marca "AgendaPRO · assunto",
 * que é o padrão das notificações do produto.
 *
 * O texto padrão foi aprovado pelo Eduardo em 06/09/2026. Trocar o padrão
 * muda a mensagem de todos os negócios que nunca editaram — não mexer sem
 * aprovação explícita.
 *
 * Nada dispara sozinho: o link abre a conversa com o texto preenchido e a
 * dona ainda revisa e aperta enviar.
 */

export const SUMIDOS_TEMPLATE_PADRAO =
  'Oi {nome}, aqui é do {negocio}. Faz {dias} dias desde seu último horário — quer que eu reserve um pra você?'

/** Só o primeiro nome: "Katiany Cristo" vira "Katiany". */
function primeiroNome(completo: string): string {
  return completo.trim().split(/\s+/)[0] || completo
}

export function preencherSumidos(
  template: string,
  vars: { nome: string; dias: number; negocio: string },
): string {
  return template
    .replace(/\{nome\}/g, primeiroNome(vars.nome))
    .replace(/\{dias\}/g, String(vars.dias))
    .replace(/\{negocio\}/g, vars.negocio)
}

/** Monta o deep link. Telefone já salvo com DDI não vira 5555… */
export function linkWhatsappSumidos(phone: string, texto: string): string {
  const digits = phone.replace(/\D/g, '')
  const comDDI = digits.startsWith('55') ? digits : `55${digits}`
  const base = `https://wa.me/${comDDI}`
  return texto.trim() ? `${base}?text=${encodeURIComponent(texto)}` : base
}
