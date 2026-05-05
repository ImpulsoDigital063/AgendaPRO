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
-- Usa btree_gist + tstzrange. Mesma data + start/end_time formam o
-- range. Operador && (overlap) garante exclusao mutual.

-- Habilita extension necessaria pra usar `=` operator com gist
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Coluna gerada com o range completo do appointment.
-- - Se appointment_date = '2026-05-04', start_time = '14:00', end_time = '14:30'
--   → range = ['2026-05-04 14:00', '2026-05-04 14:30')
-- - Inclusivo no inicio, exclusivo no fim — slots adjacentes (14:00-14:30
--   e 14:30-15:00) NAO overlapam.
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS appointment_range tstzrange
  GENERATED ALWAYS AS (
    tstzrange(
      (appointment_date::timestamp + start_time::time) AT TIME ZONE 'America/Sao_Paulo',
      (appointment_date::timestamp + end_time::time)   AT TIME ZONE 'America/Sao_Paulo',
      '[)'
    )
  ) STORED;

-- Constraint: 2 appointments com mesmo prof + ranges sobrepostos =
-- erro 23P01 (exclusion_violation). So aplica a status ativos —
-- cancelados/no_show podem coexistir com novos no mesmo slot.
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS no_overlap_appointments;

ALTER TABLE appointments
  ADD CONSTRAINT no_overlap_appointments
  EXCLUDE USING gist (
    professional_id WITH =,
    appointment_range WITH &&
  )
  WHERE (status IN ('pending', 'confirmed', 'completed'));

-- Index pra performance em queries por professional_id + range
-- (lookup de slots disponiveis usa esse padrao).
CREATE INDEX IF NOT EXISTS idx_appointments_prof_range
  ON appointments USING gist (professional_id, appointment_range)
  WHERE status IN ('pending', 'confirmed', 'completed');

-- Validacao manual pos-aplicacao:
-- 1. Tente inserir 2 appointments simultaneos no mesmo slot/prof
--    via SQL. O segundo deve falhar com 23P01.
-- 2. SELECT * FROM pg_constraint WHERE conname = 'no_overlap_appointments';
--    Deve retornar 1 linha com contype = 'x' (exclusion).
