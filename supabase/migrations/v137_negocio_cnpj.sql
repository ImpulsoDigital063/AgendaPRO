-- v137 · CNPJ/CPF do negócio (26/08/2026)
--
-- O extrato de convênio em PDF vai pro RH de uma empresa cliente, e saía sem
-- identificar quem está cobrando. Nome e telefone o sistema já tinha; o
-- documento fiscal, não — e num papel de cobrança que circula entre PJ, é o
-- que o financeiro do outro lado procura primeiro.
--
-- Texto livre, sem máscara no banco: aceita CNPJ de clínica constituída e CPF
-- de autônomo, que é metade da base (salão de uma pessoa só). Validar formato
-- aqui só criaria migração travando cadastro legítimo.
--
-- Nulo em todo mundo depois desta migração: quem não preencher não imprime
-- nada, e nenhuma tela existente muda de comportamento.

alter table businesses
  add column if not exists cnpj text;

comment on column businesses.cnpj is
  'CNPJ ou CPF do negócio, texto livre. Usado pra identificar quem cobra em documento que sai pra terceiro (extrato/fatura de convênio). Nulo = não imprime.';
