-- =================================================================
-- V31 — MÚLTIPLOS PERÍODOS POR DIA (PAUSA DE ALMOÇO)
-- =================================================================
--
-- Antes: working_hours tinha 1 row por (professional_id, day_of_week),
-- representando um único período contínuo de atendimento por dia.
-- Barbearia/salão/estética que fecha pra almoço (12-13 ou 13-14)
-- não conseguia configurar — só tinha abertura/fechamento únicos.
--
-- Agora: a tabela aceita N rows por (prof, dia), cada uma com seu
-- start_time/end_time. Frontend (HorariosTab + BookingFlow) sabe
-- agrupar e gerar slots considerando todos os períodos.
--
-- Esta migration:
--   1. Remove qualquer UNIQUE constraint que limite (prof, dia)
--      a 1 row — busca dinâmica em pg_constraint pra ser idempotente
--   2. Adiciona índice ordenado por start_time pra busca eficiente
--
-- IDEMPOTENTE.
-- =================================================================

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.working_hours'::regclass
      AND contype = 'u'
  LOOP
    EXECUTE 'ALTER TABLE public.working_hours DROP CONSTRAINT ' || quote_ident(r.conname);
    RAISE NOTICE 'Dropped unique constraint: %', r.conname;
  END LOOP;
END $$;

-- Índice composto pra busca rápida ordenada por horário de início
-- (BookingFlow itera períodos do mesmo dia em ordem cronológica)
CREATE INDEX IF NOT EXISTS working_hours_prof_day_start_idx
  ON public.working_hours (professional_id, day_of_week, start_time);
