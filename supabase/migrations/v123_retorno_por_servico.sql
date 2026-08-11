-- v123 · intervalo de retorno POR PROCEDIMENTO (10/08/2026)
--
-- Até aqui o retorno era um número por negócio (message_rules.retorno_dias):
-- "avise quem não volta há X dias". Isso serve salão, não clínica.
--
-- A Dra Elaine descreveu o que ela precisa, e é outra coisa: cada procedimento
-- tem um intervalo MÍNIMO próprio antes de poder repetir —
--   microagulhamento .... 15 a 21 dias (depende da profundidade)
--   peeling ............. 21 a 30 dias (depende da intensidade)
--   toxina botulínica ... mínimo 4 meses
--   preenchimento ....... 6 meses a 1 ano
-- e o aviso tem que dizer a data do último procedimento e que já pode repetir.
--
-- Guardado o piso do intervalo, não o teto: o aviso é "já pode fazer de novo",
-- e é o piso que marca quando isso passa a ser verdade.

alter table services add column if not exists retorno_dias int;

comment on column services.retorno_dias is
  'Dias até o cliente poder REPETIR este procedimento. Alimenta o aviso automático de retorno. Null = este serviço não gera aviso.';

update services s set retorno_dias = 15
  from businesses b where s.business_id = b.id
  and b.slug in ('serenityclinicaintegrada', 'clinica-teste-fichas')
  and s.name ilike '%microagulhamento%';

update services s set retorno_dias = 21
  from businesses b where s.business_id = b.id
  and b.slug in ('serenityclinicaintegrada', 'clinica-teste-fichas')
  and s.name ilike '%peeling%';

update services s set retorno_dias = 120
  from businesses b where s.business_id = b.id
  and b.slug in ('serenityclinicaintegrada', 'clinica-teste-fichas')
  and s.name ilike '%toxina%';

-- Lipoenzimática fica NULL de propósito: ela não informou o intervalo desse,
-- e chutar prazo de procedimento é o tipo de erro que só aparece na paciente.
