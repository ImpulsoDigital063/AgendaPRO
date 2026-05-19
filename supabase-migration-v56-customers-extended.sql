-- ============================================================
-- v56 · Customers · campos completos pra ficha de cliente
-- ============================================================
-- Adiciona campos do form de cadastro estilo Salão99:
-- · Identificação: nickname (Apelido), important_note (Anotação)
-- · Origem: referral_source (Como Conheceu)
-- · Tipo: customer_type (PF/PJ)
-- · Contato: instagram (telefone/email já existem)
-- · Documentos: cpf · rg
-- · Pessoais: profession · sex
-- · Endereço: address · address_number · address_complement · neighborhood · city · state · zip_code
-- Já existem: name · phone · email · birthday · notes
-- ============================================================

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS important_note text,
  ADD COLUMN IF NOT EXISTS referral_source text,
  ADD COLUMN IF NOT EXISTS customer_type text NOT NULL DEFAULT 'pf' CHECK (customer_type IN ('pf', 'pj')),
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS profession text,
  ADD COLUMN IF NOT EXISTS sex text CHECK (sex IS NULL OR sex IN ('f', 'm', 'other', 'na')),
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_complement text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS zip_code text;

-- Index pra busca tripla (nome / telefone / cpf) · fulltext
CREATE INDEX IF NOT EXISTS idx_customers_search
  ON public.customers
  USING gin (to_tsvector('portuguese', coalesce(name, '') || ' ' || coalesce(phone, '') || ' ' || coalesce(cpf, '')));
