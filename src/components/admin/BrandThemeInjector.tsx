/**
 * BrandThemeInjector
 *
 * DECISÃO DE PRODUTO (Eduardo, 31/08/2026): a marca do cliente saiu do
 * painel. O painel usa a cor do AgendaPRO; a marca do cliente vive onde
 * ela vende — página pública de agendamento, comprovante, PDF.
 *
 * Por que: o accent não é decoração, é o sinal de "aqui dá pra clicar".
 * Medição de 31/08 no banco: 6 dos 29 negócios têm brand_primary quase
 * preto, e três deles são pagantes (Olímpio #374151, Studio Isis #883050,
 * Viva Cacheada #a80000). Nesses, tudo que era pintado com o accent ficava
 * preto sobre branco — o item ativo do menu não se distinguia do inativo.
 * Uma variável que muda por cliente não consegue carregar significado fixo.
 *
 * A página pública NÃO depende deste componente: `[slug]/agendar/page.tsx`
 * lê `brand_primary` do negócio e injeta `--brand-primary` no próprio
 * wrapper. Por isso desligar aqui não apaga a marca de lugar nenhum.
 *
 * O componente continua montado (admin/profissional/recepcao) de propósito:
 * é a costura onde a decisão está registrada, e o fork SystemPalace pode
 * querer o comportamento oposto sem ter que redescobrir por quê.
 */

type BrandColors = {
  brand_primary?: string | null
  brand_secondary?: string | null
  brand_accent?: string | null
  brand_neutral?: string | null
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function BrandThemeInjector({ brand }: { brand: BrandColors }) {
  /* Desligado de propósito — ver o cabeçalho.
     O que era injetado aqui e por que saiu:
       --admin-accent / -bg / -border  → viravam a cor do cliente e matavam
                                          o sinal de interação
       --admin-accent-strong            → idem
       --brand-primary                  → 51 componentes do admin leem essa
                                          variável; deixá-la viva mantinha a
                                          marca do cliente no painel pela
                                          porta dos fundos
       --admin-bg-orb-1/2/3             → os orbs foram desligados no token em
                                          31/08, mas este injector os
                                          RESSUSCITAVA pra todo negócio com
                                          marca: `[data-admin-theme]` casa o
                                          mesmo elemento que `.admin-shell`,
                                          com a mesma especificidade, e vinha
                                          depois no documento. A limpeza de
                                          fundo só valia pra quem não tinha
                                          cor cadastrada. */
  return null
}
