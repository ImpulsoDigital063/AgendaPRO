/**
 * Flags de feature · fonte única de verdade.
 *
 * PACOTE_ENABLED: interruptor único do PACOTE (multi-serviço resgatável). Quando
 * `true`, liga junto: menu (desktop/mobile/recepção), botão de venda de pacote e
 * rota packages/sell. Quando `false`, tudo fica "em breve"/barrado.
 *
 * Ligado na branch (preview) em 24/07/2026 depois do modelo de dinheiro ser
 * PROVADO no sandbox (resgate consome sessão + gera comissão base=price_paid÷nº
 * sessões + NÃO vaza pro "Recebido"). Falta o click-test da UI no preview antes
 * de mergear pra produção. Ver [[project_agendapro_combos_e_pacotes]].
 */
export const PACOTE_ENABLED = true

/**
 * SUMIDOS_ABA · liberação por negócio (Eduardo, 08/09/2026).
 *
 * A aba própria de Sumidos, o prazo em faixas e a aba dentro de Consultas
 * saem primeiro só pra estes quatro. Os outros continuam chegando pelo
 * caminho de sempre (Clientes → Reativar sumidos), sem item novo no menu.
 *
 * O que NÃO é travado: a correção do desconto do cupom em booking/submit.
 * Ela conserta dinheiro saindo errado — a cliente via o abatimento na tela e
 * a comanda abria com o valor cheio — e vale pros nove igualmente.
 *
 * Marcela é a conta de TESTE do Eduardo; entra pra ele conseguir validar.
 * Tirar daqui quando a liberação for geral.
 */
export const SUMIDOS_ABA_LIBERADA: readonly string[] = [
  '717fd0c2-8387-41bb-befb-f45f258ea51f', // Rosy Borges Beauty Studio
  '3ad534b4-a74a-4e5f-aec3-736f73dcd19a', // Gessica Batista Nails designer
  '645733a0-9902-4858-ab24-17bdec9b5571', // Wanessa Silva Estética
  'b446e158-8aef-4a1f-a0e3-6332c8ef3be0', // Viva Cacheada
  'cd3c7f5a-e657-4ddb-96c7-0a4ff45b63eb', // Studio Marcela Hair · conta de teste
]

export function temAbaSumidos(businessId: string | null | undefined): boolean {
  return !!businessId && SUMIDOS_ABA_LIBERADA.includes(businessId)
}
