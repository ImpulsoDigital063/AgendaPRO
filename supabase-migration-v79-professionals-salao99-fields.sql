-- ============================================================
-- v79 · Campos Salão99-style em professionals
-- ============================================================
-- Eduardo cravou 26/05/2026 após mapear área Colaboradores do Salão99
-- (Palace · drilldown completo). AgendaPRO precisa de paridade no
-- modelo de cadastro de profissionais pra fechar Marko 02/06.
--
-- Novidades:
--
-- 1) Cargos múltiplos não-exclusivos (Luana é Proprietário+Gerente):
--    is_owner / is_manager / is_professional / is_attendant
--
-- 2) Atribuições independentes do cargo (recep não atende mas vende):
--    does_appointments / sells_products / sells_packages
--
-- 3) Dados pessoais (PERFIL inline):
--    nickname, birth_date, cpf, rg, rg_orgao, extra_info, instagram
--
-- 4) Dados bancários (pra futuro pagamento via PIX/transferência):
--    bank_pix_key, bank_name, bank_agency, bank_account, bank_digit,
--    bank_account_type, bank_person_type, bank_holder_name
--
-- 5) Endereço completo:
--    address_street, address_number, address_complement,
--    address_neighborhood, address_city, address_state, address_cep
--
-- ─── Checklist aplicado (lição P0 ontem) ────────────────────
-- 1. Quem dispara? Adm autenticado via /admin/configuracoes ·
--    zero anon · sem RLS risk.
-- 2. Tabelas tocadas: só professionals (add cols + backfill UPDATE).
-- 3. Dado obrigatório: TODAS colunas novas são nullable ou têm
--    DEFAULT seguro. Nenhum NOT NULL novo. Backfill é UPDATE simples
--    que não pode falhar (sem JOIN obrigatório).
-- 4. Fluxo prod:
--    - Olímpio (Solo, dono atende): role='owner' → is_owner=true.
--      is_professional fica em default true. does_appointments true
--      mantém timeline funcionando.
--    - Letícia (recep Palace): is_receptionist=true preservado pra
--      compat de RLS · is_attendant=true espelho · does_appointments=
--      false / sells_*=false bate com realidade.
--    - Erlane (?): role='owner' → is_owner.
-- 5. Schema: 100% additive. Sem trigger novo, sem RLS nova.
-- 6. Se quebrar: SELECTs antigos não selecionam colunas novas (zero
--    regressão). INSERTs antigos não passam colunas novas (defaults
--    cobrem). Backfill é idempotente.
-- ============================================================

-- ─── 1. Cargos múltiplos (não exclusivos) ──────────────────
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS is_owner       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_manager     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_professional boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_attendant   boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.professionals.is_owner IS
  'Proprietário do negócio. Pode acumular com is_manager.';
COMMENT ON COLUMN public.professionals.is_manager IS
  'Gerente · cargo administrativo intermediário. Permissões granulares ficam pra v80+.';
COMMENT ON COLUMN public.professionals.is_professional IS
  'Profissional · cargo padrão de quem atende clientes.';
COMMENT ON COLUMN public.professionals.is_attendant IS
  'Atendente (recepção). Espelho de is_receptionist · mantido pra v47 compat.';

-- ─── 2. Atribuições independentes do cargo ─────────────────
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS does_appointments boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sells_products    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sells_packages    boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.professionals.does_appointments IS
  'Se aparece como executor possível de agendamentos. Recep e gerente puro = false.';
COMMENT ON COLUMN public.professionals.sells_products IS
  'Se pode aparecer como vendedor de produto (comissão e relatórios).';
COMMENT ON COLUMN public.professionals.sells_packages IS
  'Se pode aparecer como vendedor de pacote (comissão e relatórios).';

-- ─── 3. Dados pessoais ─────────────────────────────────────
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS nickname    text,
  ADD COLUMN IF NOT EXISTS birth_date  date,
  ADD COLUMN IF NOT EXISTS cpf         text,
  ADD COLUMN IF NOT EXISTS rg          text,
  ADD COLUMN IF NOT EXISTS rg_orgao    text,
  ADD COLUMN IF NOT EXISTS extra_info  text,
  ADD COLUMN IF NOT EXISTS instagram   text;

-- ─── 4. Dados bancários ────────────────────────────────────
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS bank_pix_key      text,
  ADD COLUMN IF NOT EXISTS bank_name         text,
  ADD COLUMN IF NOT EXISTS bank_agency       text,
  ADD COLUMN IF NOT EXISTS bank_account      text,
  ADD COLUMN IF NOT EXISTS bank_digit        text,
  ADD COLUMN IF NOT EXISTS bank_account_type text,
  ADD COLUMN IF NOT EXISTS bank_person_type  text,
  ADD COLUMN IF NOT EXISTS bank_holder_name  text;

-- ─── 5. Endereço completo ──────────────────────────────────
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS address_street       text,
  ADD COLUMN IF NOT EXISTS address_number       text,
  ADD COLUMN IF NOT EXISTS address_complement   text,
  ADD COLUMN IF NOT EXISTS address_neighborhood text,
  ADD COLUMN IF NOT EXISTS address_city         text,
  ADD COLUMN IF NOT EXISTS address_state        text,
  ADD COLUMN IF NOT EXISTS address_cep          text;

-- ─── 6. Backfill: cargos a partir de role/is_receptionist ──
-- 6a. Proprietário (existe v28 que cravou role='owner' pra dono)
UPDATE public.professionals
  SET is_owner = true
  WHERE role = 'owner' AND is_owner = false;

-- 6b. Atendente espelha is_receptionist (regra v47)
UPDATE public.professionals
  SET is_attendant = true
  WHERE is_receptionist = true AND is_attendant = false;

-- 6c. Recep não atende · não vende
UPDATE public.professionals
  SET does_appointments = false,
      sells_products = false,
      sells_packages = false
  WHERE is_receptionist = true;

-- 6d. Dono que NÃO atende ainda continua "professional" no DEFAULT.
--     Dono que NÃO é recep mantém is_professional=true e atribuições=true
--     (default cobre tudo · sem UPDATE necessário).

-- ============================================================
-- VALIDAÇÃO PÓS-APLICAÇÃO
-- ============================================================
-- Quantos profs em cada cargo:
--   SELECT
--     SUM((is_owner)::int)       AS owners,
--     SUM((is_manager)::int)     AS managers,
--     SUM((is_professional)::int) AS profs,
--     SUM((is_attendant)::int)   AS attendants
--   FROM public.professionals;
--
-- Confirma backfill recep:
--   SELECT name, is_receptionist, is_attendant,
--          does_appointments, sells_products, sells_packages
--   FROM public.professionals WHERE is_receptionist = true;
--   Esperado: is_attendant=t · does_appointments=f · sells_*=f
--
-- Confirma backfill owner:
--   SELECT name, role, is_owner FROM public.professionals
--   WHERE role = 'owner';
--   Esperado: is_owner=t
-- ============================================================
