-- v169 · Chaves de API só leitura (Eduardo, 21/10)
--
-- Pedido do irmão da Ivna (Ivna Loyola Beauty Clinic): puxar os agendamentos
-- da clínica num BI e num assistente de IA, com os mesmos campos do CSV de
-- Vendas. Cortesia. Chave por conta, só leitura, desligável a qualquer hora.
--
-- O banco guarda só o hash (sha256) da chave; a chave em si aparece uma vez,
-- quando é gerada. RLS ligado e sem política: só a service role lê.
-- Limite de uso por hora pra uma IA mal configurada não martelar o sistema.

CREATE TABLE IF NOT EXISTS public.api_keys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  key_hash      text NOT NULL UNIQUE,
  key_prefix    text NOT NULL,
  label         text,
  limite_hora   integer NOT NULL DEFAULT 60,
  janela_inicio timestamptz NOT NULL DEFAULT now(),
  janela_usos   integer NOT NULL DEFAULT 0,
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_keys_business_idx ON public.api_keys (business_id);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Valida a chave e conta o uso numa ida só (atômico: FOR UPDATE).
-- Devolve business_id e se ainda cabe no limite da hora.
CREATE OR REPLACE FUNCTION public.api_key_usar(p_hash text)
 RETURNS TABLE (business_id uuid, permitido boolean, limite integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  DECLARE
    k public.api_keys%ROWTYPE;
  BEGIN
    SELECT * INTO k FROM public.api_keys
      WHERE key_hash = p_hash AND revoked_at IS NULL
      FOR UPDATE;
    IF NOT FOUND THEN RETURN; END IF;

    IF k.janela_inicio < now() - interval '1 hour' THEN
      k.janela_inicio := now();
      k.janela_usos := 0;
    END IF;

    IF k.janela_usos >= k.limite_hora THEN
      UPDATE public.api_keys SET janela_inicio = k.janela_inicio, janela_usos = k.janela_usos WHERE id = k.id;
      RETURN QUERY SELECT k.business_id, false, k.limite_hora;
      RETURN;
    END IF;

    UPDATE public.api_keys
      SET janela_inicio = k.janela_inicio, janela_usos = k.janela_usos + 1, last_used_at = now()
      WHERE id = k.id;
    RETURN QUERY SELECT k.business_id, true, k.limite_hora;
  END;
$function$;

REVOKE ALL ON FUNCTION public.api_key_usar(text) FROM PUBLIC, anon, authenticated;
