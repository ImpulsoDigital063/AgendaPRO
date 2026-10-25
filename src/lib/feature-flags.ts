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
export const GOOGLE_AGENDA_LIBERADOS: string[] = ['ivna-loyola-beauty-clinic', 'studio-marcela'] // studio-marcela = conta de teste (E2E)

/**
 * GOOGLE_AGENDA_BLOQUEIO_LIBERADOS · a VOLTA do Google Agenda (v176):
 * compromisso marcado no Google da dona bloqueia o horário dela no AgendaPRO.
 *
 * Ivna entra junto com o sistema novo (Eduardo 25/10: "se a Ivna precisa da
 * volta então deixamos configurado pra ela"). Pros próximos negócios segue
 * como adicional.
 */
export const GOOGLE_AGENDA_BLOQUEIO_LIBERADOS: string[] = ['ivna-loyola-beauty-clinic', 'studio-marcela'] // studio-marcela = conta de teste (E2E)

/**
 * SEMANA_NEGOCIOS · "A semana" no lugar dos cartões grandes (25/10/2026).
 *
 * Eduardo: o cartão antigo ("Atendi e recebi", lembrete, pontualidade) não é
 * mais o modelo; vira a lista compacta "A semana" que abre a MESMA gaveta da
 * grade, e a gaveta ganha o que só o cartão tinha: "Não compareceu" (com a
 * devolução dos pontos) e o aviso pra lista de espera ao cancelar.
 *
 * Por business_id porque a gaveta é client e só conhece o id. Começa só na
 * Ivna ("isole só pra Ivna, os outros e os futuros continuam como estão");
 * depois de aprovada vira o padrão do sistema todo e esta lista some.
 */
export const SEMANA_NEGOCIOS: string[] = ['571797bd-ed99-4937-b528-994d451b8953'] // Ivna Loyola Beauty Clinic
