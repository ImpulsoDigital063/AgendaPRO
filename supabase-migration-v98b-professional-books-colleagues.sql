-- =================================================================
-- V98b — Profissional pode marcar TAMBÉM na agenda das colegas
-- =================================================================
--
-- ORIGEM: Realli Studio Nails. O pedido original do dono (WhatsApp 29/07,
-- 19:26) era justamente esse — "ou se elas puderem agendar para as amigas
-- tudo bem também · Coloca essa regra por favor". Na noite de 29/07 Eduardo
-- restringiu pra só a própria agenda (v98a); em 30/07 o dono reconfirmou a
-- autorização e a regra aberta volta a valer.
--
-- POR QUE FLAG SEPARADA E NÃO AFROUXAR A v98a:
-- Marcar pra si é um nível de confiança; marcar na agenda da colega é outro.
-- Salão com equipe rotativa vai querer o primeiro e não o segundo. Separando,
-- cada dona escolhe — e nenhum negócio existente muda de comportamento.
--
-- NOTA DE NUMERAÇÃO: a coluna anterior (professionals_can_book_self) foi
-- entregue num arquivo rotulado "v92" por engano — v92 já era da
-- niche-fichas-enabled e a árvore estava na v97. Arquivo renomeado pra v98a;
-- os COMMENT dentro do banco ainda dizem "v92" (cosmético, não vale
-- migration nova pra corrigir texto).
--
-- DEFAULT false → os outros negócios seguem exatamente como estão.
--
-- IDEMPOTENTE.
-- =================================================================

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS professionals_can_book_others boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.businesses.professionals_can_book_others IS
  'v98b · profissional pode criar agendamento na agenda das colegas (exige professionals_can_book_self). Cancelar/remarcar de colega segue exclusivo da dona. Default false.';


-- =================================================================
-- VALIDAÇÃO
-- =================================================================
--   SELECT name, professionals_can_book_self, professionals_can_book_others,
--          professionals_see_team_agenda
--   FROM businesses
--   WHERE professionals_can_book_self OR professionals_see_team_agenda;
-- Esperado depois do script: Realli e Studio Larissa (demo) com as 3 true.
-- =================================================================
