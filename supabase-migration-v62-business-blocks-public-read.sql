-- v62 — RLS publica pra business_blocks (BookingFlow respeita bloqueios)
--
-- Descoberto em 19/05/2026 apos commit bf701e4 (que adicionou consulta de
-- business_blocks no BookingFlow.tsx). A RLS da v53 so permitia SELECT
-- pra dono/recepcao/profissional autenticados · cliente publico (token
-- anon) recebia [] · meu fix rodava sem erro mas nao filtrava nada.
--
-- Sem essa policy, o gap fica aberto na pratica: cliente leigo do
-- /[slug]/agendar pode marcar em cima do almoco/folga/feriado.
--
-- SELECT-only · cliente nao pode INSERT/UPDATE/DELETE · so ler ranges
-- bloqueados pra mostrar como indisponiveis no booking.
--
-- Idempotente.

DROP POLICY IF EXISTS "public ve blocks ativos" ON public.business_blocks;
CREATE POLICY "public ve blocks ativos" ON public.business_blocks
  FOR SELECT
  USING (active = true);

-- Validacao:
-- SELECT polname, polcmd, polroles FROM pg_policy
--   WHERE polrelid = 'public.business_blocks'::regclass;
-- Deve listar policy "public ve blocks ativos" com polcmd='r' (SELECT)
-- e polroles=public.
