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
-- Esta migration tem 4 etapas:
-- (1) habilita extension
-- (2) cria coluna generated com range
-- (3) LOOP procedural que cancela overlaps ate convergir (zero conflito)
-- (4) cria a constraint
--
-- O LOOP eh necessario pq cluster de 3+ overlaps nao se resolve com
-- 1 unico UPDATE. Ex: A overlap B, B overlap C, A overlap C — UPDATE
-- unico pode cancelar B e C deixando A, ou cancelar so um. Loop garante
-- que rodamos UPDATE repetidamente ate nao sobrar conflito.

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
-- 3. LIMPEZA ITERATIVA — loop ate zero overlaps remanescentes.
--
-- Cada iteracao cancela appointments que tem CONFLITO com OUTRO de
-- start_time MENOR (mais cedo no dia). Em caso de empate de start_time,
-- desempata por id (lexicografico — determinista, nao temporal mas
-- estavel).
--
-- Por que o loop? Cluster overlap em cadeia (A 09:00-10:00, B 09:30-10:30,
-- C 10:00-11:00): primeira iteracao cancela B (overlap com A) e C
-- (overlap com A se A vai ate 10:30). Mas se A so vai ate 10:00,
-- C nao overlap com A diretamente — overlap com B. Entao primeira
-- iteracao so cancela B; segunda iteracao cancela C (que agora overlap
-- so com A). Loop converge naturalmente.
-- ============================================================
DO $$
DECLARE
  v_cancelled_total int := 0;
  v_cancelled_iter int;
  v_iteration int := 0;
BEGIN
  LOOP
    v_iteration := v_iteration + 1;
    -- Safeguard: nao loopa infinito (caso patologico).
    IF v_iteration > 50 THEN
      RAISE EXCEPTION 'v40 cleanup loop nao convergiu apos 50 iteracoes — investigar dados manualmente';
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
          -- "b" eh "vencedor" (mantem ativo): start_time menor,
          -- desempate por id lexicografico
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

  RAISE NOTICE 'v40: cancelados % appointments overlapados em % iteracoes', v_cancelled_total, v_iteration;
END $$;

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
-- 1. SELECT * FROM pg_constraint WHERE conname = 'no_overlap_appointments';
--    Deve retornar 1 linha com contype = 'x' (exclusion).
-- 2. SELECT COUNT(*) FROM appointments
--    WHERE status='cancelled' AND updated_at::date = CURRENT_DATE;
--    Mostra quantas duplicatas foram canceladas hoje.
