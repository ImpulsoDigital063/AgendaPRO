/**
 * "Hoje"/"agora" SEMPRE no fuso de Brasília (America/Sao_Paulo),
 * independente de onde o código roda:
 *   - server (Vercel) → o runtime é UTC
 *   - client          → o runtime é o fuso do aparelho (em geral BRT)
 *
 * ⚠️ NUNCA usar `new Date().toISOString().slice(0,10)` pra obter "hoje".
 * Isso devolve a data em UTC e, depois das 21h BRT, já virou o dia
 * seguinte — foi a raiz do bug da agenda do Olímpio (04/06/2026):
 * a grade pulava pro dia seguinte à noite e o botão "Hoje" travava no
 * dia errado. `Intl` com timeZone fixo é determinístico nos dois lados.
 */
const YMD_BR = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Data de hoje em Brasília no formato YYYY-MM-DD (ex: "2026-06-05"). */
export function todayBR(): string {
  // en-CA já emite YYYY-MM-DD; timeZone fixo garante BRT em server e client.
  return YMD_BR.format(new Date())
}
