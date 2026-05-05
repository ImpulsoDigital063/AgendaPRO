-- v40a — LIMPEZA de overlaps existentes (passo 1 de 2)
--
-- Cancela appointments overlapados pra que v40b (constraint) possa
-- ser aplicada sem rejeicao 23P01.
--
-- IMPORTANTE: rode ESTE PRIMEIRO. Confirme que o NOTICE mostra um
-- numero de cancelamentos (>= 0). Depois rode v40b separadamente.
-- Se rodar tudo num arquivo so, o rollback da constraint reverte
-- o cleanup — bug observado em prod 2026-05-04.

-- Coluna gerada precisa existir antes do loop usar tstzrange.
-- Se ja existe (de tentativa anterior), IF NOT EXISTS no-op.
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS appointment_range tstzrange
  GENERATED ALWAYS AS (
    tstzrange(
      (appointment_date::timestamp + start_time::time) AT TIME ZONE 'America/Sao_Paulo',
      (appointment_date::timestamp + end_time::time)   AT TIME ZONE 'America/Sao_Paulo',
      '[)'
    )
  ) STORED;

-- Loop iterativo: roda UPDATE ate convergencia (zero cancelamentos
-- numa iteracao). Cobre cluster A-B-C-D... onde overlaps em cadeia.
DO $$
DECLARE
  v_cancelled_total int := 0;
  v_cancelled_iter int;
  v_iteration int := 0;
BEGIN
  LOOP
    v_iteration := v_iteration + 1;
    IF v_iteration > 50 THEN
      RAISE EXCEPTION 'v40a cleanup nao convergiu apos 50 iteracoes';
    END IF;

    UPDATE appointments AS a
    SET status = 'cancelled'
    WHERE status IN ('pending', 'confirmed', 'completed')
      AND EXISTS (
        SELECT 1
        FROM appointments AS b
        WHERE b.id <> a.id
          AND b.status IN ('pending', 'confirmed', 'completed')
          AND b.professional_id = a.professional_id
          AND b.appointment_date = a.appointment_date
          -- "b" mantem; "a" eh cancelado quando comeca depois (ou
          -- mesmo horario com id maior — desempate determinista).
          AND (b.start_time, b.id::text) < (a.start_time, a.id::text)
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

    GET DIAGNOSTICS v_cancelled_iter = ROW_COUNT;
    v_cancelled_total := v_cancelled_total + v_cancelled_iter;
    EXIT WHEN v_cancelled_iter = 0;
  END LOOP;

  RAISE NOTICE 'v40a: cancelados % appointments overlapados em % iteracoes', v_cancelled_total, v_iteration;
END $$;

-- Validacao apos rodar este arquivo:
-- SELECT COUNT(*) AS overlap_remanescente
-- FROM appointments a
-- JOIN appointments b
--   ON a.id <> b.id
--  AND a.professional_id = b.professional_id
--  AND a.appointment_date = b.appointment_date
--  AND a.appointment_range && b.appointment_range
-- WHERE a.status IN ('pending', 'confirmed', 'completed')
--   AND b.status IN ('pending', 'confirmed', 'completed');
-- DEVE retornar 0. Se retornar > 0, NAO rode v40b — me avise.
