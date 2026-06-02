-- v81 · RLS em customers, appointments, appointment_services, waitlist
-- Fase 1 do fix de segurança (alerta Supabase 31/05/2026 · rls_desativado).
--
-- ⚠️ ORDEM CRÍTICA DE APLICAÇÃO:
--   1. PRIMEIRO fazer o deploy do código novo (rotas /api/booking/* +
--      BookingFlow refatorado + [slug] referral via service_role).
--   2. SÓ DEPOIS rodar esta migration.
--   Se rodar ANTES do deploy, o front em produção (que ainda escreve nessas
--   tabelas como anon) quebra na hora pro cliente final.
--
-- Modelo de acesso (auditado 02/06/2026):
--   PÚBLICO (booking)  → agora via service_role nas rotas /api/booking/*
--                        (submit, availability, lookup-client, waitlist) e
--                        no referral de [slug]/page.tsx. service_role
--                        bypassa RLS, então não precisa de policy.
--   DONO               → businesses.owner_id = auth.uid()
--   RECEP / PROFISSIONAL→ professionals.auth_user_id = auth.uid() AND active
--                        (a agenda do profissional comum lê appointments via
--                        cookie — por isso a policy inclui QUALQUER prof ativo,
--                        não só recepcionista, diferente da v54/invoices).
--   ANON               → nenhum acesso.
--
-- NÃO inclui clients (global, sem business_id) — tratada na v82.
-- business_blocks já tem RLS desde v53/v62 (public-read proposital) — intacta.

-- ────────────────────────────────────────────────────────────────
-- Helper de acesso por business (dono OU profissional ativo do negócio)
-- Inline nas policies (sem função) pra espelhar o padrão da v54.
-- ────────────────────────────────────────────────────────────────

-- customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customers_business_access" ON public.customers;
CREATE POLICY "customers_business_access" ON public.customers
  FOR ALL
  TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR business_id IN (
      SELECT business_id FROM public.professionals
      WHERE auth_user_id = auth.uid() AND active = true
    )
  );

-- appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "appointments_business_access" ON public.appointments;
CREATE POLICY "appointments_business_access" ON public.appointments
  FOR ALL
  TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR business_id IN (
      SELECT business_id FROM public.professionals
      WHERE auth_user_id = auth.uid() AND active = true
    )
  );

-- waitlist
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "waitlist_business_access" ON public.waitlist;
CREATE POLICY "waitlist_business_access" ON public.waitlist
  FOR ALL
  TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR business_id IN (
      SELECT business_id FROM public.professionals
      WHERE auth_user_id = auth.uid() AND active = true
    )
  );

-- appointment_services (sem business_id · via appointment_id → appointments)
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "appointment_services_business_access" ON public.appointment_services;
CREATE POLICY "appointment_services_business_access" ON public.appointment_services
  FOR ALL
  TO authenticated
  USING (
    appointment_id IN (
      SELECT id FROM public.appointments
      WHERE business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
         OR business_id IN (
           SELECT business_id FROM public.professionals
           WHERE auth_user_id = auth.uid() AND active = true
         )
    )
  );
