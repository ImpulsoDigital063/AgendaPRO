-- =================================================================
-- V32 — RPC ATÔMICO + AUDITORIA DE EDIÇÃO DE HORÁRIOS
-- =================================================================
--
-- Cenário descoberto no tour com Eduardo:
--   1. Admin (Olímpio) clica "Copiar este horário pra todos os
--      profissionais" — sistema faz DELETE all + INSERT new pra cada
--      profissional sequencialmente
--   2. Profissional comissionado (Eduardo Barros) clica "Salvar
--      horários" no painel dele em paralelo — sistema faz DELETE all
--      + INSERT new pro próprio
--   3. Como nenhum dos dois usa transação, operações entrelaçam:
--      Admin DELETE → Prof DELETE → Admin INSERT → Prof INSERT
--      Resultado: rows duplicadas/sobrepostas. Quebra geração de
--      slots no /{slug}.
--
-- Esta migration:
--
-- 1. Adiciona AUDIT COLUMNS em working_hours
--    - updated_at: timestamp da última criação/atualização
--    - updated_by_name: nome do autor (admin ou profissional) pra
--      exibir "Última edição por X" no UI. UUID seria mais robusto
--      mas exige JOIN; nome direto simplifica leitura.
--
-- 2. Cria FUNCTION replace_professional_hours(prof, hours, by)
--    - DELETE + INSERT dentro do mesmo bloco PL/pgSQL = transação
--      implícita atômica. Race conditions eliminadas.
--    - SECURITY DEFINER + check manual de auth.uid() — só permite:
--        a) Owner do business (admin)
--        b) Próprio profissional (auth_user_id bate)
--      Outros casos retornam exception.
--    - Retorna as rows criadas pra UI atualizar state local sem
--      precisar re-fetch.
--
-- IDEMPOTENTE.
-- =================================================================

-- 1. Audit columns
ALTER TABLE public.working_hours
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

-- Backfill updated_at pra rows antigas que ainda não tinham
UPDATE public.working_hours SET updated_at = NOW() WHERE updated_at IS NULL;

-- 2. RPC atômico
CREATE OR REPLACE FUNCTION public.replace_professional_hours(
  p_professional_id UUID,
  p_hours JSONB,
  p_updated_by_name TEXT DEFAULT NULL
)
RETURNS SETOF public.working_hours
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_business_owner UUID;
  v_prof_auth_user UUID;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = 'P0001';
  END IF;

  -- Resolve owner do business e auth_user_id do profissional
  SELECT b.owner_id, p.auth_user_id
  INTO v_business_owner, v_prof_auth_user
  FROM public.professionals p
  JOIN public.businesses b ON b.id = p.business_id
  WHERE p.id = p_professional_id;

  IF v_business_owner IS NULL THEN
    RAISE EXCEPTION 'Profissional não encontrado' USING ERRCODE = 'P0002';
  END IF;

  -- Permitido: caller é admin do business OU próprio profissional
  IF v_caller_id <> v_business_owner AND v_caller_id <> v_prof_auth_user THEN
    RAISE EXCEPTION 'Sem permissão pra editar horários deste profissional'
      USING ERRCODE = '42501';
  END IF;

  -- DELETE + INSERT atômico (transação implícita do bloco PL/pgSQL)
  DELETE FROM public.working_hours WHERE professional_id = p_professional_id;

  IF jsonb_array_length(p_hours) > 0 THEN
    RETURN QUERY
    INSERT INTO public.working_hours (
      professional_id,
      day_of_week,
      start_time,
      end_time,
      slot_duration,
      updated_by_name,
      updated_at
    )
    SELECT
      p_professional_id,
      (h->>'day_of_week')::int,
      (h->>'start_time')::time,
      (h->>'end_time')::time,
      (h->>'slot_duration')::int,
      p_updated_by_name,
      NOW()
    FROM jsonb_array_elements(p_hours) h
    RETURNING *;
  END IF;
  -- Se array vazio, função apenas deletou (dia sem horário) — retorna 0 rows
END;
$$;

-- Permite chamada pelo client autenticado
GRANT EXECUTE ON FUNCTION public.replace_professional_hours(UUID, JSONB, TEXT)
  TO authenticated;

-- =================================================================
-- VALIDAÇÃO
-- =================================================================
-- Listar últimas edições por profissional:
--   SELECT p.name AS profissional,
--          MAX(wh.updated_at) AS ultima_edicao,
--          (array_agg(wh.updated_by_name ORDER BY wh.updated_at DESC))[1] AS por
--   FROM working_hours wh
--   JOIN professionals p ON p.id = wh.professional_id
--   GROUP BY p.id, p.name
--   ORDER BY ultima_edicao DESC NULLS LAST;
