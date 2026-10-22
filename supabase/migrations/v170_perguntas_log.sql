-- v170 · Registro do "Pergunte ao seu negócio" (Eduardo, 21/10)
--
-- Toda pergunta feita fica aqui: qual botão foi tocado, o que foi digitado
-- e se o sistema entendeu. Serve pra cadastrar sinônimos novos, achar
-- perguntas que não estão na lista e provar (ou não) que vale colocar IA
-- de verdade como adicional pago. Só a service role lê e escreve.

CREATE TABLE IF NOT EXISTS public.perguntas_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  pergunta_id  text,
  texto        text,
  entendeu     boolean NOT NULL DEFAULT true,
  origem       text NOT NULL DEFAULT 'botao',
  periodo      text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS perguntas_log_business_idx ON public.perguntas_log (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS perguntas_log_nao_entendeu_idx ON public.perguntas_log (created_at DESC) WHERE entendeu = false;

ALTER TABLE public.perguntas_log ENABLE ROW LEVEL SECURITY;
