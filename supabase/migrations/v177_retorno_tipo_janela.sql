-- v177 · retorno de cada procedimento: tipo, janela e serviço de volta (25/10/2026)
--
-- A v123 guardou só o piso ("já pode repetir"). Pra clínica de micro e cílios
-- (Ivna) o retorno é outra coisa: retoque incluso na micro entre 30 e 60 dias,
-- manutenção de cílios a cada 15 a 20. E aviso de "hora de voltar" pelo
-- WhatsApp é MARKETING na Meta (~7× mais caro). Desenho aprovado pelo Eduardo:
--
--   camada 1 · a recepção marca o retorno na saída (cartão "Retornos pra
--              marcar"); dali em diante só saem confirmação e lembrete, que
--              são utilidade e já estão aprovados
--   camada 2 · quem saiu sem marcar recebe aviso de utilidade SÓ quando o
--              retorno faz parte do que ela já comprou (retoque incluso)
--
--   retorno_tipo         'retoque'    retoque incluso no procedimento
--                        'manutencao' manutenção (venda nova)
--                        'sessao'     próxima sessão / pode repetir
--                        null = sem retorno (o retorno_dias da v123 segue
--                        valendo sozinho pra quem já usava)
--   retorno_janela_dias  fim da janela, em dias depois do procedimento
--                        (micro: piso 30, fim 60). Null = sem fim.
--   retorno_servico_id   o serviço que a cliente marca na volta (micro labial
--                        → "Retoque de micropigmentação"). Null = o mesmo.
--
-- Toda automação nasce desligada: sem retorno_tipo nada muda pra ninguém.

alter table services add column if not exists retorno_tipo text
  check (retorno_tipo in ('retoque', 'manutencao', 'sessao'));
alter table services add column if not exists retorno_janela_dias int
  check (retorno_janela_dias is null or retorno_janela_dias > 0);
alter table services add column if not exists retorno_servico_id uuid
  references services(id) on delete set null;

comment on column services.retorno_tipo is
  'Tipo do retorno: retoque (incluso), manutencao, sessao. Null = sem retorno. v177';
comment on column services.retorno_janela_dias is
  'Fim da janela do retorno, em dias depois do procedimento. Null = sem fim. v177';
comment on column services.retorno_servico_id is
  'Serviço marcado na volta (ex.: retoque da micro). Null = o mesmo serviço. v177';
