-- ============================================================
-- v72 · Toggle global do programa de fidelidade por negócio
-- ============================================================
-- Adiciona businesses.loyalty_enabled (boolean default false).
-- Sistema de pontos passa a ser opt-in: dono ativa na aba Fidelidade.
--
-- Backfill defensivo: marca como TRUE qualquer negócio que JÁ usa
-- fidelidade hoje (tem cliente com pontos > 0 OU configurou
-- points_for_referral > 0). Garante zero regressão pra Olímpio.
--
-- UI nova só mostra opções de pontos (chip no split, botão "Trocar
-- recompensa" na comanda, etc) quando loyalty_enabled = true.
-- ============================================================

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS loyalty_enabled boolean NOT NULL DEFAULT false;

-- Backfill: negócios que já usam (Olímpio etc) continuam ligados
UPDATE public.businesses b
SET loyalty_enabled = true
WHERE
  COALESCE(b.points_for_referral, 0) > 0
  OR COALESCE(b.punctuality_bonus_points, 0) > 0
  OR COALESCE(b.points_for_review, 0) > 0
  OR EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.business_id = b.id AND COALESCE(c.total_points, 0) > 0
  )
  OR EXISTS (
    SELECT 1 FROM public.rewards r
    WHERE r.business_id = b.id AND r.active = true
  );

-- Sanity check: relatório de quantos ficaram ligados
DO $$
DECLARE
  v_total int;
  v_enabled int;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.businesses;
  SELECT COUNT(*) INTO v_enabled FROM public.businesses WHERE loyalty_enabled = true;
  RAISE NOTICE 'v72 ok · loyalty_enabled=true em % de % negócios', v_enabled, v_total;
END $$;
