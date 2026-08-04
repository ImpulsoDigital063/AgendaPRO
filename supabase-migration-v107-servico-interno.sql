-- ═══════════════════════════════════════════════════════════════
-- v107 · SERVIÇO INTERNO — usar sem aparecer pra cliente
--
-- Achado em 04/08/2026 auditando a Viva Cacheada: ela criou um serviço
-- "Agenda pessoal" de R$ 0 pra encaixar atendimento sem cobrar. Como
-- serviço ativo aparece na página pública, QUALQUER pessoa com o link
-- dela podia marcar 60 minutos de graça na agenda. Ela nunca percebeu.
--
-- A causa é que `active` faz duas coisas ao mesmo tempo hoje:
--   1. o serviço pode ser usado
--   2. o serviço aparece pra cliente final
-- Não dá pra ter um sem o outro. Desativar tira da vitrine e tira também
-- a possibilidade de a dona marcar.
--
-- Esta coluna separa as duas. `active` continua sendo "posso usar";
-- `public_visible` passa a ser "a cliente vê e pode marcar".
--
-- DEFAULT true de propósito: todo serviço que existe hoje continua
-- exatamente como está. Ninguém acorda com serviço sumido da página.
--
-- Serve além da Viva Cacheada: atendimento de cortesia, serviço que só é
-- oferecido por WhatsApp, procedimento que exige avaliação antes de
-- marcar, e obra orçada que o dono não quer no link público.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS public_visible boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN services.public_visible IS
  'Serviço aparece na página pública e pode ser marcado pela cliente. '
  'false = serviço interno: o dono usa ao marcar, a cliente não vê. '
  'Diferente de active, que define se o serviço pode ser usado.';

-- Conferência: deve listar todos os serviços com public_visible = true.
-- SELECT name, active, public_visible FROM services ORDER BY created_at DESC LIMIT 10;
