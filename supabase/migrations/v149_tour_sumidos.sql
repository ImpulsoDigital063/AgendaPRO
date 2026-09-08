-- v149 · marca quem já viu o tour da aba Sumidos.
--
-- Por NEGÓCIO, não por navegador (Eduardo, 08/09/2026). No localStorage a
-- dona veria o tour de novo a cada troca de celular ou limpeza de cache —
-- e a Rosy trabalha no celular.
--
-- NULL = nunca viu. Timestamp = viu (ou pulou) naquele momento.
-- Aditiva e nullable: nenhum negócio existente muda de comportamento até
-- abrir a aba pela primeira vez.

alter table public.businesses
  add column if not exists tour_sumidos_em timestamptz;

comment on column public.businesses.tour_sumidos_em is
  'Quando a dona viu (ou pulou) o tour da aba Sumidos. NULL = ainda não viu.';
