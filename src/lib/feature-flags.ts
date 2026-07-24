/**
 * Flags de feature · fonte única de verdade.
 *
 * PACOTE_ENABLED: o COMBO (serviço+produto, em Produtos) está pronto e no ar.
 * O PACOTE (multi-serviço resgatável) ainda tem o resgate-no-agendamento a
 * VERIFICAR — enquanto isso, a venda de pacote fica travada (botão escondido +
 * rota packages/sell barrada) pra o código não-verificado não rodar em produção.
 * Menu já mostra "em breve" (AdminDesktopSidebar). Virar pra `true` só depois de
 * o resgate ser provado. Ver [[project_agendapro_combos_e_pacotes]].
 */
export const PACOTE_ENABLED = false
