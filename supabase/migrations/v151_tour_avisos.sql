-- v151 · marca quem já viu os dois tours da aba Avisos.
--
-- Mesmo desenho do v149/v150 (tours da aba Sumidos): por NEGÓCIO, não por
-- navegador. No localStorage a dona veria o tour de novo a cada troca de
-- celular ou limpeza de cache, e quem opera o salão troca de aparelho.
--
-- Nasceu em 10/09/2026, na véspera de liberar o beta de avisos automáticos
-- pra três negócios. O Eduardo notou que a aba não explicava como o disparo
-- funciona — o número oficial, a cobrança do sinal, e como editar um texto
-- sabendo que ele passa pela aprovação da Meta.
--
--   tour_avisos_em    tour 1 · apresenta a aba (abre sozinho)
--   tour_avisos_2_em  tour 2 · ensina a editar um texto (abre no editor)
--
-- NULL = nunca viu. Timestamp = viu (ou pulou) naquele momento.
-- Aditiva e nullable: nenhum negócio muda de comportamento até abrir a aba.

alter table public.businesses
  add column if not exists tour_avisos_em timestamptz,
  add column if not exists tour_avisos_2_em timestamptz;

comment on column public.businesses.tour_avisos_em is
  'Quando a dona viu (ou pulou) o tour de apresentação da aba Avisos. NULL = ainda não viu.';

comment on column public.businesses.tour_avisos_2_em is
  'Quando a dona viu (ou pulou) o tour de edição de texto da aba Avisos. NULL = ainda não viu.';
