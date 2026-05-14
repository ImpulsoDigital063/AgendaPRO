-- =====================================================================
-- v42 — Suporte a IMPORTAÇÃO DE DADOS de sistemas externos
-- =====================================================================
-- Adiciona campos pra:
--  · agendar aniversário do cliente (feature usada no Salão 365 — Leticia
--    pediu) sem criar tabela nova
--  · ficha/anamnese leve via TEXT (Profissional Salão 365 tem "fichas de
--    anamnese" — versão minimalista aqui é só notas livres)
--  · rastreio da origem do dado importado (import_source) e ID externo
--    do sistema fonte (import_external_id) — habilita reimport idempotente
--  · liga appointments → customers via customer_id (FK paralela; client_id
--    legado da v2 permanece intacto)
--
-- DECISÕES:
--  · customers.import_external_id é TEXT (não UUID): cada sistema fonte
--    usa formato próprio (numérico no Salão 365, hash no Trinks, etc).
--  · UNIQUE parcial em (business_id, import_source, import_external_id)
--    WHERE import_external_id IS NOT NULL — permite cliente manual (sem
--    external_id) sem violar unicidade.
--  · appointments.customer_id NULLABLE — agendamento público (sem login)
--    continua sendo aceito sem customer_id; importação preenche.
--
-- IDEMPOTENTE. Additive only — nada quebra em registros existentes.
-- =====================================================================

-- 1. CUSTOMERS: campos para import + features faltantes
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS birthday              DATE,
  ADD COLUMN IF NOT EXISTS notes                 TEXT,
  ADD COLUMN IF NOT EXISTS import_source         TEXT,
  ADD COLUMN IF NOT EXISTS import_external_id    TEXT,
  ADD COLUMN IF NOT EXISTS imported_at           TIMESTAMPTZ;

COMMENT ON COLUMN public.customers.birthday IS
  'Data de nascimento — usado para lista de aniversariantes do mês (feature Salão 365).';

COMMENT ON COLUMN public.customers.notes IS
  'Notas/ficha de anamnese curtas. Texto livre, sem estrutura — versão minimalista da ficha de anamnese do plano Profissional Salão 365.';

COMMENT ON COLUMN public.customers.import_source IS
  'Sistema fonte da importação: salao365 | trinks | booksy | csv-manual | NULL (cadastro manual no AgendaPRO).';

COMMENT ON COLUMN public.customers.import_external_id IS
  'ID original do cliente no sistema fonte. Habilita reimport idempotente (UPSERT por external_id em vez de telefone).';

COMMENT ON COLUMN public.customers.imported_at IS
  'Timestamp do último import deste registro. NULL para cadastros manuais.';

-- 2. UNIQUE PARCIAL: dedupe por (business, sistema fonte, external_id)
-- Só vale quando external_id está presente — clientes manuais sem
-- external_id não disputam slot.
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_import_unique
  ON public.customers (business_id, import_source, import_external_id)
  WHERE import_external_id IS NOT NULL;

-- 3. INDEX pra listar "clientes importados de X" no painel
CREATE INDEX IF NOT EXISTS idx_customers_import_source
  ON public.customers (business_id, import_source)
  WHERE import_source IS NOT NULL;

-- 4. APPOINTMENTS: FK pra customers (paralela ao client_id legado da v2)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.appointments.customer_id IS
  'FK para customers (v3, por business). Substitui semântica do client_id (v2, global, deprecado). Nullable porque booking público sem login não preenche.';

COMMENT ON COLUMN public.appointments.client_id IS
  'DEPRECADO (v2). Use customer_id (v42+). Mantido para retrocompatibilidade — não preencher em código novo.';

-- 5. INDEX pra "atendimentos deste cliente" (histórico no perfil)
CREATE INDEX IF NOT EXISTS idx_appointments_customer
  ON public.appointments (customer_id, appointment_date DESC)
  WHERE customer_id IS NOT NULL;

-- =====================================================================
-- VALIDAÇÃO PÓS-MIGRATION (rodar manualmente após APPLY)
-- =====================================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'customers'
--   AND column_name IN ('birthday','notes','import_source','import_external_id','imported_at')
-- ORDER BY column_name;
--
-- SELECT indexname FROM pg_indexes
-- WHERE schemaname = 'public' AND tablename = 'customers'
--   AND indexname LIKE 'idx_customers_import%';
-- =====================================================================
