-- =================================================================
-- V53 — BUSINESS BLOCKS (bloqueios de horário · almoço/folga/feriado)
-- =================================================================
--
-- Cravado durante personalização Palace Nail Spa · 18/05/2026.
-- Sem isso, sistema permite marcar cliente em cima de intervalo de
-- almoço da Kelle, folga da Sofia na quinta, feriado etc.
--
-- 2 tipos:
--   recurring: toda <weekday> das HH:MM às HH:MM (ex: almoço 12-13h
--              toda quarta)
--   specific:  data exata · ex: 25/12 fechado · 15/06 folga Sofia
--
-- Universal — qualquer business pode usar.
--
-- IDEMPOTENTE.
-- =================================================================

CREATE TABLE IF NOT EXISTS public.business_blocks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES public.professionals(id) ON DELETE CASCADE,
  block_type text NOT NULL CHECK (block_type IN ('recurring', 'specific')),

  -- recurring: dia da semana 0=Dom 1=Seg ... 6=Sab
  day_of_week int CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),

  -- specific: data exata
  block_date date,

  -- horários · usado em ambos os tipos
  start_time time NOT NULL,
  end_time time NOT NULL,

  reason text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Validação cross-fields: tipo bate com campos preenchidos
  CHECK (
    (block_type = 'recurring' AND day_of_week IS NOT NULL AND block_date IS NULL)
    OR
    (block_type = 'specific' AND block_date IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_business_blocks_business
  ON public.business_blocks(business_id, active);

CREATE INDEX IF NOT EXISTS idx_business_blocks_prof
  ON public.business_blocks(professional_id, active)
  WHERE professional_id IS NOT NULL;

COMMENT ON TABLE public.business_blocks IS
  'Bloqueios de horário · almoço recorrente, folga, feriado. professional_id NULL = bloqueio pro business inteiro (ex: salão fechado).';


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ RLS                                                                │
-- └──────────────────────────────────────────────────────────────────┘
ALTER TABLE public.business_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dono gerencia blocks" ON public.business_blocks;
CREATE POLICY "dono gerencia blocks" ON public.business_blocks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = business_blocks.business_id
        AND owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "recep ve blocks" ON public.business_blocks;
CREATE POLICY "recep ve blocks" ON public.business_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.professionals
      WHERE business_id = business_blocks.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
    )
  );

DROP POLICY IF EXISTS "prof ve blocks proprio negocio" ON public.business_blocks;
CREATE POLICY "prof ve blocks proprio negocio" ON public.business_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.professionals
      WHERE business_id = business_blocks.business_id
        AND auth_user_id = auth.uid()
    )
  );
