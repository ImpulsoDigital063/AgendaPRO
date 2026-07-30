-- =================================================================
-- V99 — Horário padrão automático pra profissional nova
-- =================================================================
--
-- ORIGEM: Realli Studio Nails (30/07/2026). Eduardo perguntou "quando o adm
-- cadastrou o sistema ele não criou os horários?". Não criava: a rota
-- /api/cadastro insere business + professionals + services e NADA em
-- working_hours. Cada profissional tinha que montar a agenda dela na mão.
--
-- CONSEQUÊNCIA REAL (silenciosa): a PÁGINA PÚBLICA não oferece horário nenhum
-- pra quem não tem working_hours. Não dá erro, não avisa — só não aparece slot.
-- Na Realli, 4 das 5 estavam sem nada (só a vitoria configurou, sozinha, pelo
-- painel dela). Auditoria nos 17 negócios ativos achou 3 com ZERO horário em
-- TODOS os profissionais: Studio MOOD (paga R$97 desde maio · página pública
-- morta desde 22/05), Lopes Studio de Beleza e o Negócio Tutorial.
--
-- POR QUE TRIGGER E NÃO CÓDIGO NA ROTA:
-- profissional nasce por 3 caminhos (cadastro, drawer de colaborador no admin,
-- scripts de setup). Trigger cobre os três de uma vez e não tem como esquecer
-- no quarto caminho que aparecer. Mesmo padrão da v70 (comanda automática) e
-- da v63 (baixa de estoque).
--
-- PADRÃO ESCOLHIDO (cravado com Eduardo 30/07): seg a sáb, 08:30–18:00, slot de
-- 30min. Domingo fechado. Espelha o que a vitoria escolheu sozinha e o que a
-- maioria dos negócios de beleza usa. A profissional ajusta em "Meus horários" —
-- é ponto de partida, não camisa de força.
--
-- NÃO mexe em quem já tem horário: o trigger só roda no INSERT, e o backfill
-- (script separado) só toca em profissional com ZERO linha.
-- Recepcionista não recebe horário (não atende).
--
-- IDEMPOTENTE.
-- =================================================================

CREATE OR REPLACE FUNCTION public.create_default_working_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recepcionista não atende → sem agenda
  IF COALESCE(NEW.is_receptionist, false) = true THEN
    RETURN NEW;
  END IF;

  -- Quem foi criado explicitamente como "não atende" também não
  IF NEW.does_appointments = false THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.working_hours (professional_id, day_of_week, start_time, end_time, slot_duration)
  SELECT NEW.id, d, '08:30'::time, '18:00'::time, 30
  FROM generate_series(1, 6) AS d   -- 1=segunda … 6=sábado (0=domingo fica fora)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_default_working_hours ON public.professionals;
CREATE TRIGGER trg_default_working_hours
  AFTER INSERT ON public.professionals
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_working_hours();


-- =================================================================
-- VALIDAÇÃO
-- =================================================================
-- 1) trigger existe (esperado: 1 linha)
--    SELECT tgname FROM pg_trigger WHERE tgname = 'trg_default_working_hours';
--
-- 2) teste real (rodar num negócio de teste, NUNCA em cliente):
--    INSERT INTO professionals (business_id, name, active)
--    VALUES ('<biz_id_de_teste>', 'Teste Horário', true) RETURNING id;
--    -- esperado: 6 linhas seg-sáb 08:30-18:00 slot 30
--    SELECT day_of_week, start_time, end_time, slot_duration
--    FROM working_hours WHERE professional_id = '<id_retornado>' ORDER BY day_of_week;
--    -- limpar depois:
--    DELETE FROM professionals WHERE id = '<id_retornado>';
-- =================================================================
