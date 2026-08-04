/* ═══════════════════════════════════════════════════════════════
   fetchAll — busca TODAS as linhas, não as primeiras mil

   Eduardo 04/08/2026, trazendo o caso do ComandaPRO: "o Cantinho do Açaí
   caiu nesse bug. O balcão registrava as vendas, mas não mostrava o
   financeiro". A causa é o PostgREST: toda consulta sem `range` devolve no
   máximo 1000 linhas — e devolve com sucesso, sem erro, sem aviso. A tela
   soma o que recebeu e mostra um número menor que a realidade.

   É a pior família de bug que existe aqui: não quebra, mente. Mesma
   assinatura do fuso UTC e do bruto × líquido — dinheiro some sem ninguém
   perceber, e o cliente descobre pelo bolso.

   Onde importa: qualquer leitura que varre a base inteira do negócio —
   histórico do cliente, reativação, análises de período longo, remuneração
   acumulada. Tela filtrada por um dia não chega perto do teto.

   Estado em 04/08/2026: nenhum cliente pagante passou de 1000 ainda
   (Olímpio, o maior, tem 444 e cresce ~158/mês — cruza por volta de
   dezembro). Isso aqui é conserto antes do estrago, não depois.

   ⚠️ `montar` PRECISA devolver um builder NOVO a cada chamada. Builder do
   supabase-js é de uso único: reaproveitar o mesmo entre páginas faz a
   segunda chamada falhar ou repetir a primeira página.

   ✅ const linhas = await fetchAll(() => sb.from('appointments')
        .select('id, total_price').eq('business_id', id))

   ❌ const q = sb.from('appointments').select('...')
      const linhas = await fetchAll(() => q)   // builder reaproveitado
   ═══════════════════════════════════════════════════════════════ */

const TAMANHO_PAGINA = 1000

/** Trava de segurança: 200 páginas = 200 mil linhas. Passou disso, a tela
 *  está lendo o que devia ser agregado em SQL, não paginado no Node. */
const MAX_PAGINAS = 200

type Resultado<T> = { data: T[] | null; error: { message: string } | null }

export async function fetchAll<T>(
  montar: () => { range: (de: number, ate: number) => PromiseLike<Resultado<T>> },
  tamanhoPagina = TAMANHO_PAGINA,
): Promise<T[]> {
  const todas: T[] = []

  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const inicio = pagina * tamanhoPagina
    const { data, error } = await montar().range(inicio, inicio + tamanhoPagina - 1)

    if (error) throw new Error(`fetchAll: ${error.message}`)

    const lote = data ?? []
    todas.push(...lote)

    // Lote menor que a página = acabou. Evita uma requisição extra vazia.
    if (lote.length < tamanhoPagina) return todas
  }

  console.error(
    `fetchAll: parou em ${MAX_PAGINAS} páginas (${todas.length} linhas). ` +
    `Essa consulta precisa virar agregação em SQL.`,
  )
  return todas
}
