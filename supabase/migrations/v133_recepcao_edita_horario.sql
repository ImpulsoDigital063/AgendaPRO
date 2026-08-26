-- v133 · Recepção pode definir horário (fecha o item 1 · Studio Isis Melo)
--
-- A v132 tirou a edição de horário da profissional. Só que a recepção NUNCA
-- pôde editar: em working_hours ela tinha apenas "recepcao ve horarios"
-- (SELECT). Resultado: quem ficou podendo era só a dona, e o combinado com a
-- Isis é "você E a recepção".
--
-- Chave nova, default `false`: nos outros negócios a recepção continua só
-- enxergando, como sempre foi. Ligada só no tenant dela.
--
-- Idempotente.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS recep_edita_horario boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.businesses.recep_edita_horario IS
  'false (padrao) = recepcao so VE os horarios. true = recepcao tambem define horario de qualquer profissional do negocio.';

-- rc    = quem esta logado (precisa ser recepcao ativa)
-- alvo  = o profissional dono da linha de working_hours
-- Os dois precisam ser do MESMO business, e o negocio precisa ter a chave.
DROP POLICY IF EXISTS "recepcao insere horarios" ON working_hours;
CREATE POLICY "recepcao insere horarios" ON working_hours
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM professionals rc
      JOIN professionals alvo ON alvo.id = working_hours.professional_id
      JOIN businesses bz ON bz.id = rc.business_id
      WHERE rc.auth_user_id = auth.uid()
        AND rc.is_receptionist = true
        AND rc.active = true
        AND rc.business_id = alvo.business_id
        AND bz.recep_edita_horario = true
    )
  );

DROP POLICY IF EXISTS "recepcao atualiza horarios" ON working_hours;
CREATE POLICY "recepcao atualiza horarios" ON working_hours
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM professionals rc
      JOIN professionals alvo ON alvo.id = working_hours.professional_id
      JOIN businesses bz ON bz.id = rc.business_id
      WHERE rc.auth_user_id = auth.uid()
        AND rc.is_receptionist = true
        AND rc.active = true
        AND rc.business_id = alvo.business_id
        AND bz.recep_edita_horario = true
    )
  );

DROP POLICY IF EXISTS "recepcao deleta horarios" ON working_hours;
CREATE POLICY "recepcao deleta horarios" ON working_hours
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM professionals rc
      JOIN professionals alvo ON alvo.id = working_hours.professional_id
      JOIN businesses bz ON bz.id = rc.business_id
      WHERE rc.auth_user_id = auth.uid()
        AND rc.is_receptionist = true
        AND rc.active = true
        AND rc.business_id = alvo.business_id
        AND bz.recep_edita_horario = true
    )
  );
