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
export const LIBERADOS: string[] = [
  /* Studio Marcela Hair — conta de TESTE, não é receita. */
  'cd3c7f5a-e657-4ddb-96c7-0a4ff45b63eb',

  /* ── BETA · 3 negócios, liberados em 10/09/2026 ────────────────
     Pacote Padrão (200 msgs) de cortesia até 07/11, ativado em 08/09 com
     confirmação e lembrete de véspera ligados. Aniversário NASCE DESLIGADO
     (decisão do Eduardo, 08/09): custa ~9x um lembrete e consome 7 da
     franquia — quem quiser, liga sabendo.

     As três foram avisadas por WhatsApp antes deste deploy. Ninguém descobre
     que o sistema fala com a cliente dela depois do fato.

     Rosy Borges ficou FORA desta leva (Eduardo, 10/09): sem chave PIX e com
     as regras todas desligadas. O pacote dela está ativo no banco, mas sem
     estar nesta lista nada sai. */
  'b446e158-8aef-4a1f-a0e3-6332c8ef3be0', // Viva Cacheada · salão · sinal 30%
  '645733a0-9902-4858-ab24-17bdec9b5571', // Wanessa Silva Estética · clínica · sinal 30%
  '3ad534b4-a74a-4e5f-aec3-736f73dcd19a', // Gessica Batista Nails · nail · sinal 20%
]

/** A pergunta que a tela e as rotas fazem. */
export function canalLiberado(businessId: string | null | undefined): boolean {
  if (CANAL_LIBERADO) return true
  return !!businessId && LIBERADOS.includes(businessId)
}
