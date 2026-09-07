-- v148 · desfaz a v147.
--
-- A coluna businesses.sumidos_template nasceu em 06/09/2026 pra um editor de
-- texto proprio da aba Sumidos. No mesmo dia o Eduardo cortou a ideia: "quero
-- utilizar o sistema de criacao de texto e link que ja existe, nao precisamos
-- reinventar". A aba passou a usar coupon-templates.ts + a rota de campanha,
-- e a coluna ficou orfa — nenhum codigo le nem escreve, nenhuma linha tem
-- valor (todas NULL desde a criacao).
--
-- Fica o registro em vez de apagar a v147: o banco de producao chegou a ter
-- essa coluna por algumas horas.

alter table public.businesses
  drop column if exists sumidos_template;
