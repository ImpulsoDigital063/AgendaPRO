-- v141 · Venda de balcão por negócio (27/08/2026)
--
-- Pedido do Eduardo depois de rever a grade do CAF: "no CAF pode remover o
-- botão registrar venda, pois ele não trabalha com vendas de produtos".
--
-- Por que chave e não regra automática: 25 dos 29 negócios da base não têm
-- nenhum produto cadastrado. Esconder o botão por ausência de produto tiraria
-- a venda de balcão de quase todo mundo — inclusive de quem vende item avulso
-- sem cadastrar catálogo, que é o uso comum em salão. A decisão é do dono, não
-- do estado da tabela.
--
-- Default TRUE: ninguém perde o botão por causa desta migração. Só some pra
-- quem for desligado explicitamente.
--
-- "Resgatar pacote" segue fora desta chave. O Gustavo não usa pacote hoje, mas
-- pode passar a usar — e esse botão já tem gate próprio (PACOTE_ENABLED).

alter table businesses
  add column if not exists vendas_balcao_enabled boolean not null default true;

comment on column businesses.vendas_balcao_enabled is
  'Mostra o botão "Registrar venda" na grade. FALSE pra negócio que só presta serviço e não vende produto (ex: CAF, fisioterapia). Default TRUE: o comportamento de todo mundo continua igual.';
