-- v159 · Oferecer a ficha pra cliente nova em poucos toques (14/10/2026)
--
-- Depois da v157 (link pra cliente preencher), o Eduardo pediu que a ficha
-- seja oferecida sem a dona precisar abrir Fichas: na tela de "agendamento
-- confirmado" do link público, no cadastro da cliente e no agendamento feito
-- pelo painel.
--
--   businesses.fichas_oferecer  quais fichas (slug) oferecer pra cliente que
--                               ainda não respondeu. VAZIO = desligado — toda
--                               automação nasce desligada. A Wanessa marca a
--                               Feminina e a Masculina e a cliente escolhe.
--
--   ficha_convites.grupo        convites criados juntos (Feminina + Masculina
--                               no mesmo agendamento). Quando a cliente envia
--                               um, os outros do grupo são cancelados — senão
--                               o painel mostraria "aguardando" pra sempre.
--   ficha_convites.origem       'painel' (dona mandou) | 'agendamento' (tela
--                               de confirmação do link público).

alter table public.businesses
  add column if not exists fichas_oferecer text[] not null default '{}';

alter table public.ficha_convites
  add column if not exists grupo uuid,
  add column if not exists origem text not null default 'painel';
