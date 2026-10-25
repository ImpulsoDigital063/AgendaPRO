-- v178 · regra de mensagem "retoque" (camada 2 do retorno, 25/10/2026)
--
-- Aviso de UTILIDADE pra quem saiu sem marcar o retoque que faz parte do
-- procedimento (services.retorno_tipo = 'retoque', v177). Tipo separado do
-- 'retorno' de propósito: aquele é marketing na Meta (~7× mais caro) e este
-- não, então são dois interruptores. Nasce desligado, como toda regra.
--
-- A lista abaixo é a que estava NO BANCO em 25/10 (lida em pg_constraint),
-- mais 'retoque'. 'sinal_pendente' não está nela e segue assim: não tem
-- linha própria em message_rules.

alter table message_rules drop constraint if exists message_rules_tipo_check;
alter table message_rules add constraint message_rules_tipo_check check (tipo in (
  'confirmacao',
  'lembrete_vespera',
  'lembrete_dia',
  'aniversario',
  'retorno',
  'retoque',
  'dono_novo_agendamento',
  'dono_cancelamento'
));
