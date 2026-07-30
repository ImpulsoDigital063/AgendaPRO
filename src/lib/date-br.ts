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

/**
 * Soma (ou subtrai, com n negativo) dias a uma data YYYY-MM-DD, no fuso de
 * Brasília. Ancora ao meio-dia UTC pra nunca cruzar a fronteira do dia por
 * arredondamento. Retorna YYYY-MM-DD. Ex: addDaysBR('2026-07-03', 1) → '2026-07-04'.
 */
export function addDaysBR(ymd: string, n: number): string {
  const d = new Date(ymd.slice(0, 10) + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * Início do dia (00:00) de uma data YYYY-MM-DD, como instante com offset de
 * Brasília (−03:00). Use como fronteira de janela em colunas timestamptz
 * (paid_at, closed_at, occurred_at):
 *   .gte(col, startOfDayBR(dia)).lt(col, startOfDayBR(addDaysBR(dia, 1)))
 * Sem o offset, `dia+'T00:00:00'` vira meia-noite UTC = 21h BRT → a janela
 * pega 21h→21h em vez de 00h→00h local (bug do caixa · Palace/Studio MOOD).
 */
export function startOfDayBR(ymd: string): string {
  return ymd.slice(0, 10) + 'T00:00:00-03:00'
}

/**
 * Primeiro e último dia de um mês `YYYY-MM`, em YYYY-MM-DD.
 * Ex: monthBoundsBR('2026-07') → { start: '2026-07-01', end: '2026-07-31' }.
 *
 * Existe pra matar o padrão `new Date(y, m, 0).toISOString().slice(0,10)`, que
 * era repetido em cada tela financeira: `new Date(ano, mes, 0)` monta meia-noite
 * no fuso do RUNTIME e o toISOString converte pra UTC — no servidor (UTC) passa,
 * mas em qualquer runtime a leste de Greenwich o último dia do mês volta 1 dia.
 * Aqui é aritmética de string: sem Date de calendário, sem fuso envolvido.
 */
export function monthBoundsBR(ym: string): { start: string; end: string } {
  const y = Number(ym.slice(0, 4))
  const m = Number(ym.slice(5, 7))
  const nextFirst =
    m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
  return { start: `${ym}-01`, end: addDaysBR(nextFirst, -1) }
}

/**
 * Formata uma data YYYY-MM-DD (ou ISO) como DD/MM/AAAA (formato brasileiro),
 * SEM criar um Date — evita pular 1 dia por fuso (ex: aniversário 1994-09-18
 * com `new Date()` em BRT vira 17/09). Manipula a string direto.
 * Retorna '' se vazio.
 */
export function formatDateBR(value?: string | null): string {
  if (!value) return ''
  const ymd = value.slice(0, 10) // pega YYYY-MM-DD mesmo se vier "...T00:00:00"
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value
}
