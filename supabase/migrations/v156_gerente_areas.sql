-- v156 · Permissões da gerente por área (10/10/2026)
--
-- A dona escolhe, no cadastro da colaboradora, quais áreas do painel a
-- gerente acessa. Guarda as BLOQUEADAS: vazio = tudo liberado, então toda
-- gerente que já existe (Marília / Studio MOOD) nasce com tudo ativo, sem
-- backfill. Mapa de áreas e rotas: src/lib/permissoes-gerente.ts.
--
-- Trava: só o DONO define quem é gerente e o que ela acessa. Sem isso uma
-- gerente com acesso à Equipe liberaria as próprias áreas ou criaria outra
-- gerente com tudo. Estende o trigger da v155.

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS gerente_areas_bloqueadas text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN professionals.gerente_areas_bloqueadas IS
  'v156 · áreas do /admin que a gerente NÃO acessa (vazio = todas). Ids em src/lib/permissoes-gerente.ts.';

CREATE OR REPLACE FUNCTION trava_gerente_no_dono()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bid   uuid := COALESCE(NEW.business_id, OLD.business_id);
  v_owner uuid;
BEGIN
  -- service role / rotinas do sistema
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT owner_id INTO v_owner FROM businesses WHERE id = v_bid;

  -- dono faz o que quiser; quem não é gerente já é limitado pela RLS
  IF auth.uid() = v_owner OR NOT eh_gerente_do_negocio(v_bid) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE')
     AND (OLD.is_owner = true OR OLD.role = 'owner' OR OLD.auth_user_id = v_owner) THEN
    RAISE EXCEPTION 'gerente_nao_altera_o_dono' USING ERRCODE = '42501';
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE')
     AND (NEW.is_owner = true OR NEW.role = 'owner') THEN
    RAISE EXCEPTION 'gerente_nao_cria_dono' USING ERRCODE = '42501';
  END IF;

  -- v156 · quem é gerente e o que ela acessa é decisão do dono
  IF (TG_OP = 'INSERT' AND NEW.is_manager = true)
     OR (TG_OP = 'DELETE' AND OLD.is_manager = true)
     OR (TG_OP = 'UPDATE' AND (
          NEW.is_manager IS DISTINCT FROM OLD.is_manager
          OR NEW.gerente_areas_bloqueadas IS DISTINCT FROM OLD.gerente_areas_bloqueadas)) THEN
    RAISE EXCEPTION 'so_o_dono_define_gerente' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE(NEW, OLD);
END $$;
