-- =================================================================
-- V173 — Serviço por profissional: quem faz, preço e duração
-- =================================================================
--
-- ORIGEM: pedido da Ivna Loyola (22/10/2026): "o procedimento precisa
-- estar vinculado à profissional, permitindo cadastrar quais procedimentos
-- cada profissional realiza, o valor de cada procedimento para cada
-- profissional e a duração do atendimento". A v172 cobriu só o preço; quem
-- faz o quê estava escrito no código da vitrine (regra por nome), e a dona
-- não conseguia mudar.
--
-- REGRA (a tabela da v172 passa a ser a do vínculo inteiro):
--   sem linha                 → ela faz, com preço e duração do cadastro
--   realiza = false           → ela NÃO faz esse serviço (some da escolha)
--   price / duration_minutes  → o dela; NULL = o do cadastro
-- Assim os preços já gravados na v172 seguem valendo como estão.
--
-- Continua lido só com businesses.preco_por_profissional = true.
-- Nenhum dado existente muda: price só perde o NOT NULL e as colunas novas
-- nascem com o comportamento de hoje (realiza = true, duração NULL).
-- =================================================================

ALTER TABLE public.service_professional_prices
  ALTER COLUMN price DROP NOT NULL;

ALTER TABLE public.service_professional_prices
  ADD COLUMN IF NOT EXISTS duration_minutes integer
    CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 5 AND 1440);

ALTER TABLE public.service_professional_prices
  ADD COLUMN IF NOT EXISTS realiza boolean NOT NULL DEFAULT true;

-- Conferência depois de rodar:
--   SELECT column_name, is_nullable, column_default FROM information_schema.columns
--    WHERE table_name = 'service_professional_prices' ORDER BY ordinal_position;
--   → price YES · duration_minutes YES · realiza NO, default true
