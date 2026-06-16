/**
 * O link de avaliação do Google é digitado à mão pelo dono (campo único, salvo
 * em businesses.google_place_id). Donos colam de tudo: a URL com o nome junto
 * ("Barbearia X https://g.page/r/.../review"), sem https://, ou só o g.page.
 * Sem normalizar, o href vira texto inválido / caminho relativo → 404 no cliente
 * (bug Olímpio 16/06).
 *
 * extractGoogleReviewUrl devolve uma URL absoluta navegável, ou null se não dá
 * pra extrair nada. Use no RENDER (defensivo p/ dados sujos já salvos) e no SAVE.
 */
export function extractGoogleReviewUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.trim()
  if (!s) return null
  // 1. URL http(s) embutida em qualquer lugar (cobre "Nome https://g.page/...").
  const m = s.match(/https?:\/\/\S+/i)
  if (m) return m[0]
  // 2. Sem protocolo, mas é claramente um link de review/maps → prepend https://.
  if (/^(www\.)?(g\.page|maps\.google|goo\.gl\/maps|search\.google|maps\.app\.goo\.gl)/i.test(s)) {
    return `https://${s.replace(/^\/+/, '')}`
  }
  return null
}
