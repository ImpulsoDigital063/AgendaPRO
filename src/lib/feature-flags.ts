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
 * SUMIDOS_ENVIO_AUTOMATICO · disparo de reativação pelo canal oficial.
 *
 * Desligado por decisão do Eduardo em 08/09/2026: "o envio de sumidos vamos
 * dar preferência por envio manual por enquanto, enquanto encaixamos mais o
 * sistema de envios".
 *
 * O código fica pronto — rota, travas e o card com o custo à vista. Enquanto
 * estiver `false`, a aba mostra só o caminho manual (Chamar e Cupom, que saem
 * do WhatsApp da própria dona, custam zero e não passam pela Meta).
 *
 * Vale lembrar do número quando for ligar: reativação é template MARKETING e
 * consome 7 unidades por pessoa. A Rosy tem 46 sumidos — 322 unidades, mais
 * que o pacote Padrão inteiro que cobre a régua mensal dela.
 */
export const SUMIDOS_ENVIO_AUTOMATICO = false

/**
 * GOOGLE_AGENDA_LIBERADOS · quem vê o cartão "Conectar Google Agenda" (v175).
 *
 * Começa só com a Ivna (Eduardo 24/10/2026: "vamos começar conectando só a
 * dela"). O app do Google ainda não é verificado: quem conecta vê a tela de
 * aviso e o limite é 100 contas. Abrir pra mais negócios só depois da
 * verificação sair.
 */
// ivna-loyola-beauty-clinic entra quando o Google aprovar a verificação (Eduardo 25/10: sem a tela de "app não verificado" pra cliente)
export const GOOGLE_AGENDA_LIBERADOS: string[] = ['studio-marcela'] // conta de teste: vídeo da verificação

/**
 * GOOGLE_AGENDA_BLOQUEIO_LIBERADOS · a VOLTA do Google Agenda (v176):
 * compromisso marcado no Google da dona bloqueia o horário dela no AgendaPRO.
 *
 * Adicional PAGO (Eduardo 24/10: "podemos vender isso pra ela"). Fica vazio
 * até a Ivna contratar; aí entra o slug dela aqui.
 */
export const GOOGLE_AGENDA_BLOQUEIO_LIBERADOS: string[] = ['studio-marcela'] // só a conta de teste até a Ivna comprar
