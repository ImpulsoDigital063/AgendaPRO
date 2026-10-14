-- v157 · Ficha preenchida pela cliente por link (14/10/2026)
--
-- Pedido da Wanessa: "quando a cliente agenda, ela tem acesso pra preencher a
-- ficha?". A dona gera um link pra UMA cliente e UMA ficha, manda pelo
-- WhatsApp, e a cliente responde e assina no celular dela. A resposta cai em
-- client_form_responses igual à preenchida no balcão (carimbo da v120).
--
-- O token NÃO fica no banco: só o sha256 dele. Quem lê o banco (ou um backup)
-- não consegue montar o link de ninguém. Uso único: ao enviar, used_at e
-- response_id são gravados e o link morre. Expira em expires_at.
--
-- RLS ligado e SEM policy: ninguém lê nem escreve pelo cliente do navegador.
-- Só as rotas do servidor (service role) mexem aqui — a do painel confere o
-- negócio do usuário, a pública confere o hash do token.

CREATE TABLE IF NOT EXISTS ficha_convites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id  uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  niche_slug   text NOT NULL,
  token_hash   text NOT NULL UNIQUE,
  criado_por   uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  used_at      timestamptz,
  response_id  uuid REFERENCES client_form_responses(id) ON DELETE SET NULL,
  cancelado_em timestamptz
);

CREATE INDEX IF NOT EXISTS ficha_convites_customer_idx ON ficha_convites (customer_id, created_at DESC);

ALTER TABLE ficha_convites ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE ficha_convites IS
  'v157 · link pra cliente preencher a ficha no celular. token só como sha256; uso único; sem policy (só service role).';
