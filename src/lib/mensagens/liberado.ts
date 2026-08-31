/* ═══════════════════════════════════════════════════════════════
   O CANAL ESTÁ LIBERADO PARA AS DONAS?

   Governa tudo que a tela promete: o chip "Beta", o botão de contratar
   valer ou não, e a frase de estado do canal.

   Existe porque em 29/08 a tela dizia as duas coisas ao mesmo tempo:
   "ainda não use com suas clientes" no topo e "enviamos pela API oficial,
   a mensagem chega mesmo em quem nunca conversou" logo abaixo. As duas
   vinham de condições diferentes — uma do estado do lançamento, outra da
   saúde do número — e ninguém garantia que concordassem.

   ─── Por que virou lista, e não mais uma chave só (31/08) ─────

   Eduardo quis fazer a compra de verdade numa conta de teste antes de
   soltar pra base. Com uma chave global, ligar pra ele ligaria pros 29
   negócios ao mesmo tempo — e cinco deles são pagantes de verdade que hoje
   recebem aviso de graça pela W-API. A lista deixa provar o fluxo inteiro
   (cobrança, webhook, ativação, envio) com dinheiro real, sem tocar em
   ninguém.

   🔴 `CANAL_LIBERADO = true` (todo mundo) só DEPOIS da prova em cliente
   real: mandar do número de produção pra alguém que nunca falou com ele e
   ver o `entregue_em` gravado. Foi a pressa nisso que criou o caso da
   Priscila em 24/08.
   ═══════════════════════════════════════════════════════════════ */

/** Chave mestra. `true` libera para TODOS os negócios. */
export const CANAL_LIBERADO = false

/**
 * Liberados individualmente, mesmo com a chave mestra desligada.
 *
 * `cd3c7f5a…` = Studio Marcela Hair — conta de TESTE, não é receita
 * (assinatura ativa até 2030, dono edubchaves6@gmail.com). É a conta onde
 * a compra é feita de verdade para provar as rotas.
 */
export const LIBERADOS: string[] = ['cd3c7f5a-e657-4ddb-96c7-0a4ff45b63eb']

/** A pergunta que a tela e as rotas fazem. */
export function canalLiberado(businessId: string | null | undefined): boolean {
  if (CANAL_LIBERADO) return true
  return !!businessId && LIBERADOS.includes(businessId)
}
