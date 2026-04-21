-- V19 Profissional pode editar os proprios working_hours
-- v6 ja deu SELECT. Falta INSERT/UPDATE/DELETE limitado ao proprio professional_id.
-- Idempotente.

DROP POLICY IF EXISTS "profissional insere seus horarios" ON working_hours;
CREATE POLICY "profissional insere seus horarios" ON working_hours
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE id = working_hours.professional_id
      AND auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "profissional atualiza seus horarios" ON working_hours;
CREATE POLICY "profissional atualiza seus horarios" ON working_hours
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE id = working_hours.professional_id
      AND auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "profissional deleta seus horarios" ON working_hours;
CREATE POLICY "profissional deleta seus horarios" ON working_hours
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE id = working_hours.professional_id
      AND auth_user_id = auth.uid()
    )
  );
