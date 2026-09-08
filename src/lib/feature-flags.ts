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
