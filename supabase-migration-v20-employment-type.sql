-- V20 employment_type: comissionado (default) vs contratado
-- comissionado controla a propria agenda; contratado nao.
-- Idempotente.

-- 1. Coluna employment_type
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS employment_type text NOT NULL DEFAULT 'commissioned';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'professionals_employment_type_check'
  ) THEN
    ALTER TABLE professionals
      ADD CONSTRAINT professionals_employment_type_check
      CHECK (employment_type IN ('commissioned', 'employed'));
  END IF;
END $$;

-- 2. RLS: so comissionado edita working_hours
DROP POLICY IF EXISTS "profissional insere seus horarios" ON working_hours;
CREATE POLICY "profissional insere seus horarios" ON working_hours
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE id = working_hours.professional_id
      AND auth_user_id = auth.uid()
      AND employment_type = 'commissioned'
    )
  );

DROP POLICY IF EXISTS "profissional atualiza seus horarios" ON working_hours;
CREATE POLICY "profissional atualiza seus horarios" ON working_hours
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE id = working_hours.professional_id
      AND auth_user_id = auth.uid()
      AND employment_type = 'commissioned'
    )
  );

DROP POLICY IF EXISTS "profissional deleta seus horarios" ON working_hours;
CREATE POLICY "profissional deleta seus horarios" ON working_hours
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE id = working_hours.professional_id
      AND auth_user_id = auth.uid()
      AND employment_type = 'commissioned'
    )
  );
