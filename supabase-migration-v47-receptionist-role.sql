-- =================================================================
-- V47 — ROLE RECEPCIONISTA (não ocupa vaga de profissional)
-- =================================================================
--
-- Plano Equipe agora vende "5 profissionais + 1 recepcionista incluída"
-- sem mudar preço (R$97/mês). Plano Solo segue só "2 profissionais"
-- (recepcionista NÃO disponível no Solo).
--
-- Modelagem:
--   - Recepcionista vive na MESMA tabela `professionals` (compartilha
--     auth_user_id, business_id, email, photo) mas com `is_receptionist=true`
--   - Não atende clientes: sem agenda, sem horários, sem serviços vinculados
--   - Vê todas as agendas do business, marca/cancela em nome dos 5
--     profissionais. NÃO vê financeiro / pricing / fidelidade.
--   - NÃO conta no limite de profissionais (trigger v30 ignora)
--
-- Defesa em profundidade:
--   - Coluna is_receptionist NOT NULL DEFAULT false (safe pra dados antigos)
--   - Trigger v30 atualizado pra contar SÓ is_receptionist=false
--   - Trigger novo: SOLO não pode ter recepcionista (1 max no EQUIPE)
--
-- IDEMPOTENTE.
-- =================================================================


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 1. COLUNA is_receptionist                                          │
-- └──────────────────────────────────────────────────────────────────┘
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS is_receptionist boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.professionals.is_receptionist IS
  'true = pessoa atua como recepção (não atende, vê todas agendas, marca/cancela). false = profissional que atende clientes. Recepcionistas não contam no limite do plano.';


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 2. ATUALIZA TRIGGER v30 — recepcionistas NÃO contam no limite     │
-- │                                                                    │
-- │ Antes: count(*) cego sobre professionals.business_id              │
-- │ Agora: count(*) WHERE is_receptionist = false                    │
-- │                                                                    │
-- │ Adicionalmente: bloqueia recepcionista em plano Solo (só Equipe)  │
-- │ e bloqueia mais de 1 recepcionista por business.                  │
-- └──────────────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION check_professional_limit()
RETURNS trigger AS $$
DECLARE
  current_plan text;
  prof_count int;
  recep_count int;
  max_allowed int;
BEGIN
  -- 1. Plan da subscription
  SELECT s.plan INTO current_plan
  FROM public.subscriptions s
  WHERE s.business_id = NEW.business_id
  LIMIT 1;

  -- 2. RECEPCIONISTA: bloqueia em Solo e bloqueia se já tem 1
  IF NEW.is_receptionist = true THEN
    IF current_plan = 'solo' THEN
      RAISE EXCEPTION
        'Plano Solo não inclui recepcionista. Faça upgrade pro Equipe pra ter recepção dedicada.'
        USING errcode = 'P0001',
              hint = 'Plano Equipe inclui 5 profissionais + 1 recepcionista por R$97/mês.';
    END IF;

    SELECT count(*) INTO recep_count
    FROM public.professionals
    WHERE business_id = NEW.business_id
      AND is_receptionist = true;

    IF recep_count >= 1 THEN
      RAISE EXCEPTION
        'Plano Equipe inclui 1 recepcionista. Pra trocar quem é recepção, remova a recepcionista atual primeiro.'
        USING errcode = 'P0001';
    END IF;

    RETURN NEW;  -- recepcionista OK, não conta no limite de prof
  END IF;

  -- 3. PROFISSIONAL: limite por plano (mesma regra v30 original)
  IF current_plan = 'solo' THEN
    max_allowed := 2;
  ELSIF current_plan = 'equipe' THEN
    max_allowed := 5;
  ELSE
    -- Sem subscription (pós-cadastro pré-ativação) ou plano desconhecido:
    -- deixa criar. O profissional default do cadastro é criado nesse estado.
    RETURN NEW;
  END IF;

  -- 4. Conta profissionais (NÃO inclui recepcionistas)
  SELECT count(*) INTO prof_count
  FROM public.professionals
  WHERE business_id = NEW.business_id
    AND is_receptionist = false;

  -- 5. Bloqueia se exceder
  IF prof_count >= max_allowed THEN
    RAISE EXCEPTION
      'Plano % permite no máximo % profissionais. Pra adicionar mais, faça upgrade entrando em contato com a Impulso.',
      current_plan, max_allowed
      USING errcode = 'P0001',
            hint = 'Você pode remover profissionais não usados ou fazer upgrade pro plano Equipe (5 vagas + 1 recepção).';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql security definer;

-- Trigger já existe (v30) e o REPLACE da function basta — não precisa recriar.


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 3. RLS — RECEPCIONISTA VÊ TODAS AGENDAS DO BUSINESS               │
-- │                                                                    │
-- │ v6 criou:                                                          │
-- │   "profissional ve seus agendamentos" → só os próprios            │
-- │   "profissional atualiza seus agendamentos" → só os próprios     │
-- │                                                                    │
-- │ Adiciona policies que dão à recepcionista acesso a TODOS do biz.  │
-- │ NÃO toca em financeiro/services/fidelidade — recepcionista        │
-- │ continua sem permissão lá (não tem policy = bloqueado).           │
-- └──────────────────────────────────────────────────────────────────┘

-- Recepcionista vê TODOS agendamentos do business
DROP POLICY IF EXISTS "recepcao ve todos agendamentos" ON appointments;
CREATE POLICY "recepcao ve todos agendamentos" ON appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE business_id = appointments.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
    )
  );

-- Recepcionista marca novos agendamentos
DROP POLICY IF EXISTS "recepcao cria agendamentos" ON appointments;
CREATE POLICY "recepcao cria agendamentos" ON appointments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE business_id = appointments.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
    )
  );

-- Recepcionista atualiza/cancela TODOS agendamentos do business
DROP POLICY IF EXISTS "recepcao atualiza todos agendamentos" ON appointments;
CREATE POLICY "recepcao atualiza todos agendamentos" ON appointments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE business_id = appointments.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
    )
  );

-- Recepcionista vê todos os profissionais do business (pra escolher na hora de marcar)
DROP POLICY IF EXISTS "recepcao ve profissionais" ON professionals;
CREATE POLICY "recepcao ve profissionais" ON professionals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM professionals me
      WHERE me.business_id = professionals.business_id
        AND me.auth_user_id = auth.uid()
        AND me.is_receptionist = true
    )
  );

-- Recepcionista vê working_hours dos profissionais do business
DROP POLICY IF EXISTS "recepcao ve horarios" ON working_hours;
CREATE POLICY "recepcao ve horarios" ON working_hours
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM professionals p1
      JOIN professionals p2 ON p2.business_id = p1.business_id
      WHERE p1.id = working_hours.professional_id
        AND p2.auth_user_id = auth.uid()
        AND p2.is_receptionist = true
    )
  );

-- Recepcionista vê serviços do business (pra marcar agendamento)
DROP POLICY IF EXISTS "recepcao ve servicos" ON services;
CREATE POLICY "recepcao ve servicos" ON services
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE business_id = services.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
    )
  );


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 4. RLS — CUSTOMERS (recepcionista CRUD completo)                  │
-- │                                                                    │
-- │ Recep precisa: ver lista, criar novo, editar dados (telefone,     │
-- │ aniversário, nome). NÃO deleta — só admin pode.                  │
-- └──────────────────────────────────────────────────────────────────┘
DROP POLICY IF EXISTS "recepcao ve customers" ON customers;
CREATE POLICY "recepcao ve customers" ON customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE business_id = customers.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
    )
  );

DROP POLICY IF EXISTS "recepcao cria customers" ON customers;
CREATE POLICY "recepcao cria customers" ON customers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE business_id = customers.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
    )
  );

DROP POLICY IF EXISTS "recepcao atualiza customers" ON customers;
CREATE POLICY "recepcao atualiza customers" ON customers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE business_id = customers.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
    )
  );


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 5. RLS — POINTS_TRANSACTIONS (recepcionista vê + resgata)         │
-- │                                                                    │
-- │ Recep precisa: consultar saldo via SELECT + inserir transação    │
-- │ negativa (resgate). NÃO altera transações passadas.              │
-- └──────────────────────────────────────────────────────────────────┘
DROP POLICY IF EXISTS "recepcao ve pontos" ON points_transactions;
CREATE POLICY "recepcao ve pontos" ON points_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE business_id = points_transactions.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
    )
  );

DROP POLICY IF EXISTS "recepcao resgata pontos" ON points_transactions;
CREATE POLICY "recepcao resgata pontos" ON points_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE business_id = points_transactions.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
    )
  );


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 6. RLS — REWARDS (recepcionista vê lista pra resgate)             │
-- └──────────────────────────────────────────────────────────────────┘
DROP POLICY IF EXISTS "recepcao ve rewards" ON rewards;
CREATE POLICY "recepcao ve rewards" ON rewards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE business_id = rewards.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
    )
  );


-- =================================================================
-- VALIDAÇÃO PÓS-MIGRATION
-- =================================================================
-- Confere que a coluna existe + default correto:
--   SELECT column_name, data_type, column_default, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'professionals' AND column_name = 'is_receptionist';
--   ESPERADO: is_receptionist | boolean | false | NO
--
-- Confere businesses com recepcionista cadastrada (deve estar 0 pós-migration):
--   SELECT b.id, b.name, count(p.id) filter (where p.is_receptionist=true) AS recep
--   FROM businesses b
--   LEFT JOIN professionals p ON p.business_id = b.id
--   GROUP BY b.id, b.name
--   HAVING count(p.id) filter (where p.is_receptionist=true) > 0;
--
-- Teste manual do trigger (substitua <BIZ_ID>):
--   INSERT INTO professionals (business_id, name, is_receptionist)
--   VALUES ('<BIZ_ID>', 'Teste Recep', true);
--   -- Deve falhar se plan='solo' · deve passar se plan='equipe' (até 1)
-- =================================================================
