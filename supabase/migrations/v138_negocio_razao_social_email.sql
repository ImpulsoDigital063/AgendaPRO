-- v138 · Razão social e e-mail do negócio (27/08/2026)
--
-- Continuação da v137 (CNPJ). O extrato de convênio sai da clínica e entra no
-- financeiro de outra empresa, e lá o documento é conferido contra o cartão
-- CNPJ. No caso do CAF os dois nomes são diferentes: a marca é "CAF - Centro
-- Avançado de Fisioterapia" e a razão social é "G.M.E. Saúde Ltda". Sem a
-- razão social impressa, o RH tem um papel que não bate com o CNPJ dele.
--
-- O e-mail é a via de resposta: o RH recebe o extrato e precisa saber pra onde
-- mandar dúvida ou comprovante. O sistema guardava telefone e não guardava
-- e-mail do negócio.
--
-- Ambos nulos depois da migração: só imprime quem preencher, e nenhuma tela
-- existente muda de comportamento.

alter table businesses
  add column if not exists razao_social text,
  add column if not exists email text;

comment on column businesses.razao_social is
  'Razão social, quando difere do nome fantasia. Impressa embaixo do nome em documento que sai pra terceiro (extrato/fatura de convênio). Nulo = imprime só o nome.';

comment on column businesses.email is
  'E-mail de contato do negócio. Via de resposta no documento que vai pro cliente PJ. Nulo = não imprime.';
