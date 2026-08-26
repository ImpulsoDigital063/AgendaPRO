-- v132 · Horário: quem define passa a ser decisão do negócio (item 1 · Studio Isis Melo)
--
-- A v19 deu INSERT/UPDATE/DELETE de working_hours à própria profissional, em
-- TODO negócio. Aqui essas três policies passam a consultar
-- businesses.prof_edita_horario (v131, default `true`).
--
-- Negócio sem a chave mexida: `true` → comportamento IDÊNTICO ao de hoje.
-- Studio Isis Melo: `false` → só dono e recepção definem horário.
--
-- Esconder a tela não bastava: sem isto a permissão continuaria viva no banco
-- e uma chamada direta ainda gravaria.
--
-- As policies do DONO ficam intactas — são outras, por owner do business.
-- Idempotente.

DROP POLICY IF EXISTS "profissional insere seus horarios" ON working_hours;
CREATE POLICY "profissional insere seus horarios" ON working_hours
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM professionals p
      JOIN businesses b ON b.id = p.business_id
      WHERE p.id = working_hours.professional_id
        AND p.auth_user_id = auth.uid()
        AND b.prof_edita_horario = true
    )
  );

DROP POLICY IF EXISTS "profissional atualiza seus horarios" ON working_hours;
CREATE POLICY "profissional atualiza seus horarios" ON working_hours
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM professionals p
      JOIN businesses b ON b.id = p.business_id
      WHERE p.id = working_hours.professional_id
        AND p.auth_user_id = auth.uid()
        AND b.prof_edita_horario = true
    )
  );

DROP POLICY IF EXISTS "profissional deleta seus horarios" ON working_hours;
CREATE POLICY "profissional deleta seus horarios" ON working_hours
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM professionals p
      JOIN businesses b ON b.id = p.business_id
      WHERE p.id = working_hours.professional_id
        AND p.auth_user_id = auth.uid()
        AND b.prof_edita_horario = true
    )
  );
