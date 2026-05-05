-- v40b — EXCLUSION CONSTRAINT (passo 2 de 2)
--
-- Pre-requisito: v40a-cleanup-overlaps.sql ja rodou e a query de
-- validacao no fim de v40a retornou overlap_remanescente = 0.
--
-- Se a constraint falhar aqui, NAO houve cleanup completo. Volte pra
-- v40a e investigue.

-- Extension pra `=` operator com gist
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Idempotente: garante coluna existe (caso v40a ainda nao tenha rodado
-- ou erro 42703 anterior tenha revertido). Tem que vir antes da
-- constraint que depende dela.
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS appointment_range tstzrange
  GENERATED ALWAYS AS (
    tstzrange(
      (appointment_date::timestamp + start_time::time) AT TIME ZONE 'America/Sao_Paulo',
      (appointment_date::timestamp + end_time::time)   AT TIME ZONE 'America/Sao_Paulo',
      '[)'
    )
  ) STORED;

-- Constraint atomico — bloqueia overlap futuro no banco.
-- Race condition em booking publico (BookingFlow.tsx) impossivel
-- a partir daqui: SELECT-then-INSERT cliente-side e' substituido
-- pela atomicidade do banco.
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS no_overlap_appointments;

ALTER TABLE appointments
  ADD CONSTRAINT no_overlap_appointments
  EXCLUDE USING gist (
    professional_id WITH =,
    appointment_range WITH &&
  )
  WHERE (status IN ('pending', 'confirmed', 'completed'));

-- Index pra performance em queries por prof + range
CREATE INDEX IF NOT EXISTS idx_appointments_prof_range
  ON appointments USING gist (professional_id, appointment_range)
  WHERE status IN ('pending', 'confirmed', 'completed');

-- Validacao manual:
-- SELECT conname, contype FROM pg_constraint WHERE conname = 'no_overlap_appointments';
-- Deve retornar 1 linha com contype = 'x' (exclusion).
