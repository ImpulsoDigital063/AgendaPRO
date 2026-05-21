-- =================================================================
-- BACKFILL · linkar client_id nos appointments importados Palace
-- =================================================================
-- Bug: import-palace-salao99.mjs inseriu 1435 appointments com
-- customer_id setado mas client_id = NULL. Resultado: /admin/clientes
-- mostra "Nunca" e R$ 0 em todos os 872 clientes importados.
--
-- Fix em 2 passos:
--   1. Garantir que existe 1 row em `clients` pra cada phone único
--      dos appointments do business
--   2. UPDATE appointments SET client_id = clients.id WHERE
--      appointments.client_phone = clients.phone E client_id IS NULL
--
-- IDEMPOTENTE: rodar várias vezes não duplica.
-- =================================================================

-- ETAPA 1: criar clients que ainda não existem (match por phone)
INSERT INTO public.clients (name, phone, email)
SELECT DISTINCT ON (a.client_phone)
  a.client_name,
  a.client_phone,
  NULL
FROM public.appointments a
LEFT JOIN public.clients c ON c.phone = a.client_phone
WHERE a.business_id = 'ee6f0b22-5a46-406a-a3d4-b901551c4261'
  AND a.client_id IS NULL
  AND a.client_phone IS NOT NULL
  AND a.client_phone <> ''
  AND c.id IS NULL  -- só insere se não existe ainda
ORDER BY a.client_phone, a.appointment_date DESC;

-- ETAPA 2: linkar client_id nos appointments via phone
UPDATE public.appointments a
SET client_id = c.id
FROM public.clients c
WHERE a.business_id = 'ee6f0b22-5a46-406a-a3d4-b901551c4261'
  AND a.client_id IS NULL
  AND a.client_phone = c.phone;

-- VERIFICAR resultado
SELECT
  COUNT(*) FILTER (WHERE client_id IS NOT NULL) AS com_client_id,
  COUNT(*) FILTER (WHERE client_id IS NULL) AS sem_client_id,
  COUNT(*) AS total
FROM public.appointments
WHERE business_id = 'ee6f0b22-5a46-406a-a3d4-b901551c4261';
