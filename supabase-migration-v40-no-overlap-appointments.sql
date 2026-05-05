-- v40 — Anti-overlap atomico no banco (race condition em booking publico)
--
-- CONTEXTO
-- BookingFlow.tsx fazia: SELECT conflict → if empty INSERT.
-- Em concorrencia (2 clientes mesmo slot, mesmo prof), AMBOS passam
-- no SELECT (ainda sem registros) e AMBOS conseguem INSERT. Resultado:
-- prof tem 2 clientes no mesmo horario (overbooking).
--
-- SOLUCAO
-- EXCLUSION CONSTRAINT no Postgres garante atomicamente que nao existam
-- 2 appointments com o MESMO professional_id e ranges de tempo
-- sobrepostos. Bloqueio acontece no banco — race condition impossivel.
--
-- IMPORTANTE: se ja existem overlaps no banco (vindos de seed antigo
-- ou bookings pre-fix), a constraint nao pode ser criada ate limpar.
-- Esta migration tem 3 etapas: (1) habilita extension, (2) cancela
-- overlaps existentes mantendo o mais antigo, (3) cria a constraint.

-- ============================================================
-- 1. Extension necessaria pra `=` operator com gist
-- ============================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- 2. Coluna gerada com o range completo do appointment
-- ============================================================
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS appointment_range tstzrange
  GENERATED ALWAYS AS (
    tstzrange(
      (appointment_date::timestamp + start_time::time) AT TIME ZONE 'America/Sao_Paulo',
      (appointment_date::timestamp + end_time::time)   AT TIME ZONE 'America/Sao_Paulo',
      '[)'
    )
  ) STORED;

-- ============================================================
-- 3. LIMPEZA — cancela overlaps existentes pra constraint poder
--    ser criada. Mantem o appointment de ID MENOR (criado antes).
--    Marca duplicatas como 'cancelled' (auditavel — nao apaga).
-- ============================================================
UPDATE appointments AS a
SET status = 'cancelled'
WHERE status IN ('pending', 'confirmed', 'completed')
  AND EXISTS (
    SELECT 1
    FROM appointments AS b
    WHERE b.id <> a.id
      AND b.id < a.id  -- "b" e mais antigo, "a" e duplicata
      AND b.status IN ('pending', 'confirmed', 'completed')
      AND b.professional_id = a.professional_id
      AND b.appointment_date = a.appointment_date
      AND tstzrange(
            (b.appointment_date::timestamp + b.start_time::time) AT TIME ZONE 'America/Sao_Paulo',
            (b.appointment_date::timestamp + b.end_time::time)   AT TIME ZONE 'America/Sao_Paulo',
            '[)'
          ) && tstzrange(
            (a.appointment_date::timestamp + a.start_time::time) AT TIME ZONE 'America/Sao_Paulo',
            (a.appointment_date::timestamp + a.end_time::time)   AT TIME ZONE 'America/Sao_Paulo',
            '[)'
          )
  );

-- Diagnostico: quantos foram cancelados pela limpeza acima.
-- Roda essa query separada apos aplicar pra ver o impacto:
--   SELECT COUNT(*) FROM appointments WHERE status='cancelled'
--    AND updated_at::date = CURRENT_DATE;

-- ============================================================
-- 4. Constraint atomico — bloqueia overlap futuro no banco
-- ============================================================
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS no_overlap_appointments;

ALTER TABLE appointments
  ADD CONSTRAINT no_overlap_appointments
  EXCLUDE USING gist (
    professional_id WITH =,
    appointment_range WITH &&
  )
  WHERE (status IN ('pending', 'confirmed', 'completed'));

-- ============================================================
-- 5. Index pra performance em queries por prof + range
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_appointments_prof_range
  ON appointments USING gist (professional_id, appointment_range)
  WHERE status IN ('pending', 'confirmed', 'completed');

-- Validacao manual pos-aplicacao:
-- 1. Tente inserir 2 appointments simultaneos no mesmo slot/prof
--    via SQL. O segundo deve falhar com 23P01.
-- 2. SELECT * FROM pg_constraint WHERE conname = 'no_overlap_appointments';
--    Deve retornar 1 linha com contype = 'x' (exclusion).
