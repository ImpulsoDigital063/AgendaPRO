-- =================================================================
-- V28 — LINK PROFISSIONAL DEFAULT AO OWNER (retroativo)
-- =================================================================
--
-- Contexto: a partir de 30/04/2026, /api/cadastro passou a criar o
-- profissional default JÁ LINKADO ao owner (role='owner', auth_user_id,
-- email). Antes disso, o profissional default era criado solto:
--   - role: NULL
--   - auth_user_id: NULL
--   - email: NULL
--   - name: nome do estabelecimento (fallback porque o form não tinha
--           campo "Seu nome" — também corrigido em 30/04/2026)
--
-- Sintomas dos cadastros antigos:
--   1. Profissional aparece com nome do estabelecimento (ex: "Barbearia
--      Olímpio" em vez de "Olímpio") na aba Configurações > Profissionais
--   2. Card mostra botão "Dar acesso ao painel" pro próprio dono — se
--      clicar, cria login DUPLICADO (e-mail conflito com o user dono)
--
-- Esta migration linka retroativamente o profissional default ao owner
-- pra contas existentes. Heurística: pega o profissional MAIS ANTIGO de
-- cada business que ainda não tem auth_user_id (provavelmente o default
-- criado no cadastro).
--
-- IDEMPOTENTE: pode rodar várias vezes sem efeito colateral.
-- =================================================================

WITH default_profs AS (
  -- Pra cada business, pega o primeiro profissional criado SE ele ainda
  -- não tiver auth_user_id (nunca foi linkado). Garante 1 por business.
  SELECT DISTINCT ON (p.business_id)
    p.id AS prof_id,
    b.id AS biz_id,
    b.owner_id,
    u.email AS owner_email
  FROM professionals p
  JOIN businesses b ON b.id = p.business_id
  JOIN auth.users u ON u.id = b.owner_id
  WHERE p.auth_user_id IS NULL
    AND p.role IS DISTINCT FROM 'owner'
  ORDER BY p.business_id, p.created_at ASC NULLS LAST
)
UPDATE professionals p
SET
  email = d.owner_email,
  auth_user_id = d.owner_id,
  role = 'owner'
FROM default_profs d
WHERE p.id = d.prof_id;

-- =================================================================
-- VALIDAÇÃO PÓS-MIGRATION
-- =================================================================
-- Quantos businesses agora têm profissional dono linkado:
--   SELECT COUNT(*) FROM professionals WHERE role = 'owner';
--
-- Quantos businesses ainda não têm dono nos professionals (deveria ser 0
-- após esta migration — se aparecer >0, são businesses que nunca tiveram
-- profissional default criado, OK):
--   SELECT b.id, b.name FROM businesses b
--   LEFT JOIN professionals p ON p.business_id = b.id AND p.role = 'owner'
--   WHERE p.id IS NULL;
