-- v60 — Override manual de overlap pelo profissional/admin
--
-- Pedido cravado por Eduardo em 19/05/2026:
-- "profissional na hora do atendimento tem liberdade de adicionar/remover
-- servicos · se causar conflito de horario, avisa · se ele decidir mesmo
-- assim, que assim seja"
--
-- Como funciona:
-- 1. Adiciona coluna `manual_overlap_accepted` (default false) em appointments
-- 2. Recria a constraint v40b incluindo essa coluna no WHERE
-- 3. Quando o profissional clica "Salvar mesmo assim" em /admin, a API seta
--    manual_overlap_accepted=true no appointment editado · constraint
--    nao bloqueia mais o par
-- 4. Race condition do booking publico continua protegida porque o
--    BookingFlow.tsx NUNCA seta essa flag · default false sempre
--
-- Idempotente.

-- 1. Coluna
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS manual_overlap_accepted boolean NOT NULL DEFAULT false;

-- 2. Recria constraint com WHERE condicional
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS no_overlap_appointments;

ALTER TABLE appointments
  ADD CONSTRAINT no_overlap_appointments
  EXCLUDE USING gist (
    professional_id WITH =,
    appointment_range WITH &&
  )
  WHERE (
    status IN ('pending', 'confirmed', 'completed')
    AND manual_overlap_accepted = false
  );

-- 3. Atualiza index pra refletir nova condicao (performance)
DROP INDEX IF EXISTS idx_appointments_prof_range;
CREATE INDEX IF NOT EXISTS idx_appointments_prof_range
  ON appointments USING gist (professional_id, appointment_range)
  WHERE status IN ('pending', 'confirmed', 'completed')
    AND manual_overlap_accepted = false;

-- Validacao manual:
-- SELECT conname, contype FROM pg_constraint WHERE conname = 'no_overlap_appointments';
--   Deve retornar 1 linha com contype = 'x'
-- SELECT column_name, data_type, column_default FROM information_schema.columns
--   WHERE table_name='appointments' AND column_name='manual_overlap_accepted';
--   Deve retornar 1 linha · default false · not null
