-- v127 — botão de confirmar é escolha do negócio
--
-- POR QUE
-- O lembrete pode sair com dois botões ("Confirmo" / "Preciso remarcar").
-- Para quem opera com agenda cheia e falta cara, isso é o ganho principal:
-- a cliente confirma num toque e a agenda atualiza sozinha.
--
-- Mas não serve pra todo mundo (Eduardo, 21/08). Consultório que já liga
-- confirmando, negócio que atende por ordem de chegada, ou quem simplesmente
-- não quer que a cliente responda — pra esses o botão convida a uma interação
-- que ninguém vai tratar do outro lado, e o número passa a receber resposta
-- que não é lida.
--
-- Default TRUE porque quem liga lembrete quer reduzir falta, e o botão é o
-- que mais faz por isso; quem não quiser desliga num toque.

alter table message_rules
  add column if not exists com_botao boolean not null default true;

comment on column message_rules.com_botao is
  'Lembretes saem com os botões Confirmo/Preciso remarcar. Só afeta lembrete_vespera e lembrete_dia — os outros tipos ignoram.';
