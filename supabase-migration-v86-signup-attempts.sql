-- =================================================================
-- v86 · Rate-limit persistente do cadastro (anti-bot)
--
-- O rate-limit em memória (lib/rate-limit) reseta a cada cold start da
-- serverless → fura com requests concorrentes. Essa tabela dá um rate-limit
-- real, compartilhado entre instâncias: o route /api/cadastro conta tentativas
-- por IP na última hora e bloqueia acima do limite.
--
-- Defesa em profundidade junto com o CAPTCHA (Turnstile) e o signup público
-- do Supabase já desligado.
-- =================================================================

CREATE TABLE IF NOT EXISTS public.signup_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signup_attempts_ip_time
  ON public.signup_attempts (ip, created_at DESC);

-- RLS ligado SEM policy = ninguém acessa via anon. O route usa service role,
-- que ignora RLS. Então só o servidor lê/escreve aqui.
ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN RAISE NOTICE 'v86 ok · signup_attempts criado (rate-limit persistente do cadastro)'; END $$;
