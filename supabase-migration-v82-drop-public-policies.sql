-- v82 · Remove policies PÚBLICAS legadas que furavam a RLS da v81
-- ============================================================
-- A v81 ligou RLS e adicionou as policies *_business_access (authenticated),
-- mas NÃO removeu as policies "publico *" criadas no tempo em que o booking
-- gravava como anon (role PUBLIC / {-} no pg_policy). Como policies são
-- permissivas e OR'd, qualquer "publico ver" mantinha o anon lendo TUDO.
-- Confirmado via pg_policy em 02/06/2026 (anon ainda lia 1039 customers).
--
-- Pré-requisito: código novo (rotas /api/booking/* via service_role) JÁ
-- deployado — confirmado (GET /api/booking/availability responde 400 em prod).
-- Sem o booking público dependendo dessas policies, podem cair.
--
-- Mantém intactas: dono gerencia *, recepcao *, profissional *,
-- *_business_access (v81), waitlist_select_owner/update_owner.

-- customers
DROP POLICY IF EXISTS "publico ver customer" ON public.customers;
DROP POLICY IF EXISTS "publico inserir customer" ON public.customers;
DROP POLICY IF EXISTS "publico atualizar customer" ON public.customers;

-- appointments (nomes no PLURAL no banco — confirmado via pg_policy)
DROP POLICY IF EXISTS "publico ver agendamentos" ON public.appointments;
DROP POLICY IF EXISTS "publico criar agendamentos" ON public.appointments;
-- variantes singulares por garantia (idempotente)
DROP POLICY IF EXISTS "publico ver agendamento" ON public.appointments;
DROP POLICY IF EXISTS "publico criar agendamento" ON public.appointments;

-- appointment_services
DROP POLICY IF EXISTS "publico ver appointment_services" ON public.appointment_services;
DROP POLICY IF EXISTS "publico criar appointment_services" ON public.appointment_services;

-- waitlist
DROP POLICY IF EXISTS "publico ver waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "publico inserir waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_insert_public" ON public.waitlist;
