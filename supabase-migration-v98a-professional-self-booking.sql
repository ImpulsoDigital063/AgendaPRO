-- =================================================================
-- V92 — Autonomia da profissional: marcar pra si + ver agenda da equipe
-- =================================================================
--
-- ORIGEM: Realli Studio Nails (Renata Tertuliano · Maringá/PR · 28/07/2026).
-- 5 profissionais, sem recepcionista. As profissionais precisam marcar as
-- clientes delas sem depender da dona, e precisam VER a agenda das colegas
-- porque atendem em dupla ("preciso saber se a amiga tem horário livre").
--
-- REGRA CRAVADA POR EDUARDO 29/07/2026:
--   · profissional VÊ a agenda das colegas (cliente + serviço + horário)
--   · profissional CRIA agendamento SÓ pra si mesma
--   · profissional NÃO cria nem cancela nada de colega — isso segue da dona
--
-- POR QUE SÓ 2 COLUNAS E NENHUMA POLICY:
-- A v81 criou "appointments_business_access" como FOR ALL TO authenticated,
-- e o USING já cobre qualquer profissional ativo do business (no INSERT o
-- Postgres reusa esse USING como WITH CHECK). Ou seja: no nível de RLS a
-- permissão JÁ ESTAVA ABERTA — a trava sempre foi de UI. Esta migration não
-- afrouxa nada no banco; ela dá ao dono o controle de quando a UI aparece.
--
-- DEFAULT false NAS DUAS → os 25 negócios existentes não mudam de
-- comportamento. Só quem a dona ligar (ou a Impulso ligar por script) vê
-- as telas novas.
--
-- IDEMPOTENTE.
-- =================================================================

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS professionals_can_book_self boolean NOT NULL DEFAULT false;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS professionals_see_team_agenda boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.businesses.professionals_can_book_self IS
  'v92 · profissional pode criar agendamento na própria agenda (nunca na da colega). Default false.';

COMMENT ON COLUMN public.businesses.professionals_see_team_agenda IS
  'v92 · profissional pode ver a agenda das colegas em modo leitura. Default false.';


-- =================================================================
-- VALIDAÇÃO
-- =================================================================
-- Esperado: 2 linhas, ambas com default false
--   SELECT column_name, column_default, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'businesses'
--     AND column_name IN ('professionals_can_book_self','professionals_see_team_agenda');
--
-- Esperado: só Realli Studio Nails com true (depois de rodar o script)
--   SELECT name, professionals_can_book_self, professionals_see_team_agenda
--   FROM businesses WHERE professionals_can_book_self OR professionals_see_team_agenda;
-- =================================================================
