-- v90 · Índices de performance nas FKs de tenant (corrige lentidão · 22/06/2026)
--
-- Causa raiz: Postgres NÃO cria índice automático em FK. As colunas que TODA
-- query e TODA checagem de RLS usam (business_id, owner_id) estavam sem índice
-- → seq scan. Com volume (Olímpio centenas de appointments, ~80 negócios na
-- mesma tabela) virou ~6s por clique. Donos e clientes finais reclamaram.
--
-- businesses(owner_id) é o mais crítico: usado em toda navegação (getCurrentBusiness)
-- E em toda policy RLS (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())).
--
-- Plain CREATE INDEX (sem CONCURRENTLY): as tabelas são pequenas (milhares de
-- linhas), o lock é de milissegundos. IF NOT EXISTS = idempotente/seguro.
-- Rodar no SQL Editor do Supabase.

CREATE INDEX IF NOT EXISTS idx_businesses_owner          ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_appointments_business_date ON public.appointments(business_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_business_status ON public.appointments(business_id, status);
CREATE INDEX IF NOT EXISTS idx_professionals_business     ON public.professionals(business_id);
CREATE INDEX IF NOT EXISTS idx_services_business_active   ON public.services(business_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_working_hours_prof         ON public.working_hours(professional_id);
CREATE INDEX IF NOT EXISTS idx_points_tx_business         ON public.points_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_appt  ON public.appointment_services(appointment_id);

-- Atualiza estatísticas pro planner usar os índices novos na hora.
ANALYZE public.businesses;
ANALYZE public.appointments;
ANALYZE public.professionals;
ANALYZE public.services;
ANALYZE public.working_hours;
ANALYZE public.points_transactions;
ANALYZE public.appointment_services;
