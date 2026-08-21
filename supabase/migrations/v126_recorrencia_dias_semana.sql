-- v126 · recorrência por dias da semana (21/08/2026)
--
-- Resposta do Gustavo (áudio 20/08 18:08): "vou marcar pra ele segunda, quarta
-- e sexta às quatro da tarde... são dez sessões, eu marco as dez de uma vez".
--
-- Hoje a recorrência repete UM dia da semana. Isso liga a escolha de vários
-- dias + total de sessões. Chave própria porque o Eduardo cravou que os outros
-- negócios (e os futuros) seguem como estão, a menos que peçam.
alter table businesses add column if not exists recorrencia_dias_semana boolean not null default false;

comment on column businesses.recorrencia_dias_semana is
  'Permite escolher VÁRIOS dias da semana na mesma série de agendamentos (ex: seg/qua/sex, 10 sessões). Default false: a recorrência segue repetindo só o dia da semana da primeira data.';

update businesses set recorrencia_dias_semana = true
where slug = 'caf-centro-avancado-de-fisioterapia';

select count(*) filter (where recorrencia_dias_semana) as com_dias_semana, count(*) as total from businesses;
