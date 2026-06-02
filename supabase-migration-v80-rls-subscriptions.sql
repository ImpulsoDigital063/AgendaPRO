-- v80 · RLS em subscriptions (Fase 1 do fix de segurança)
-- Contexto: alerta Supabase 31/05/2026 — schema public com RLS desativado.
-- subscriptions (billing, 15 linhas) estava legível/gravável por qualquer
-- anon com a URL do projeto. Esta tabela NÃO é tocada pelo booking público.
--
-- Modelo de acesso confirmado (auditoria 02/06/2026):
--   ESCRITA  → só service_role: webhooks/asaas, /api/cadastro (getAdminClient),
--              /api/billing/* (admin), /api/cron/billing-check. service_role
--              bypassa RLS, então não precisa de policy de write.
--   LEITURA  → só o dono autenticado da própria assinatura:
--              admin-data.getCurrentSubscription, /admin/bloqueado,
--              configuracoes. Cobertos pela policy de SELECT abaixo.
--   ANON     → nenhum acesso (sem policy = bloqueado).

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_owner_select" ON public.subscriptions;
CREATE POLICY "subscriptions_owner_select" ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );
