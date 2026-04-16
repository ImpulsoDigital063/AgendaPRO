-- AgendaPRO — Migration V10
-- Feature: Funções para deletar negócio e usuário em cascata
-- Respeita ordem de dependências de foreign keys
-- Rodar no SQL Editor do Supabase

-- =============================================
-- 1. FUNÇÃO: Deleta dados do negócio (mantém conta auth)
-- Útil para limpar dados sem perder a conta
-- =============================================

CREATE OR REPLACE FUNCTION delete_business_data(target_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com permissões elevadas (bypassa RLS)
SET search_path = public
AS $$
DECLARE
  v_business_ids UUID[];
  v_professional_ids UUID[];
  v_appointment_ids UUID[];
  v_customer_ids UUID[];
  deleted_appointment_services INT := 0;
  deleted_appointments INT := 0;
  deleted_services INT := 0;
  deleted_working_hours INT := 0;
  deleted_professionals INT := 0;
  deleted_customers INT := 0;
  deleted_points_transactions INT := 0;
  deleted_rewards INT := 0;
  deleted_waitlist INT := 0;
  deleted_businesses INT := 0;
  resultado TEXT;
BEGIN
  -- Buscar todos os negócios do usuário
  SELECT array_agg(id) INTO v_business_ids
  FROM businesses
  WHERE owner_id = target_user_id;

  -- Se não tem negócios, retorna aviso
  IF v_business_ids IS NULL THEN
    RETURN 'Nenhum negócio encontrado para o usuário ' || target_user_id::TEXT;
  END IF;

  -- Buscar profissionais dos negócios (precisa pra working_hours)
  SELECT array_agg(id) INTO v_professional_ids
  FROM professionals
  WHERE business_id = ANY(v_business_ids);

  -- Buscar agendamentos (precisa pra appointment_services e points_transactions)
  SELECT array_agg(id) INTO v_appointment_ids
  FROM appointments
  WHERE business_id = ANY(v_business_ids);

  -- Buscar customers (precisa pra points_transactions)
  SELECT array_agg(id) INTO v_customer_ids
  FROM customers
  WHERE business_id = ANY(v_business_ids);

  -- ========== DELETAR NA ORDEM CORRETA ==========

  -- 1) appointment_services (depende de appointments)
  IF v_appointment_ids IS NOT NULL THEN
    DELETE FROM appointment_services
    WHERE appointment_id = ANY(v_appointment_ids);
    GET DIAGNOSTICS deleted_appointment_services = ROW_COUNT;
  END IF;

  -- 2) points_transactions (depende de customers e appointments)
  IF v_customer_ids IS NOT NULL THEN
    DELETE FROM points_transactions
    WHERE customer_id = ANY(v_customer_ids);
    GET DIAGNOSTICS deleted_points_transactions = ROW_COUNT;
  ELSE
    -- Tentar por business_id direto caso tenha transações órfãs
    DELETE FROM points_transactions
    WHERE business_id = ANY(v_business_ids);
    GET DIAGNOSTICS deleted_points_transactions = ROW_COUNT;
  END IF;

  -- 3) appointments (depende de businesses e professionals)
  DELETE FROM appointments
  WHERE business_id = ANY(v_business_ids);
  GET DIAGNOSTICS deleted_appointments = ROW_COUNT;

  -- 4) services (depende de businesses)
  DELETE FROM services
  WHERE business_id = ANY(v_business_ids);
  GET DIAGNOSTICS deleted_services = ROW_COUNT;

  -- 5) working_hours (depende de professionals)
  IF v_professional_ids IS NOT NULL THEN
    DELETE FROM working_hours
    WHERE professional_id = ANY(v_professional_ids);
    GET DIAGNOSTICS deleted_working_hours = ROW_COUNT;
  END IF;

  -- 6) professionals (depende de businesses)
  DELETE FROM professionals
  WHERE business_id = ANY(v_business_ids);
  GET DIAGNOSTICS deleted_professionals = ROW_COUNT;

  -- 7) customers (depende de businesses)
  DELETE FROM customers
  WHERE business_id = ANY(v_business_ids);
  GET DIAGNOSTICS deleted_customers = ROW_COUNT;

  -- 8) rewards (depende de businesses)
  DELETE FROM rewards
  WHERE business_id = ANY(v_business_ids);
  GET DIAGNOSTICS deleted_rewards = ROW_COUNT;

  -- 9) waitlist (depende de businesses)
  DELETE FROM waitlist
  WHERE business_id = ANY(v_business_ids);
  GET DIAGNOSTICS deleted_waitlist = ROW_COUNT;

  -- 10) businesses (tabela principal)
  DELETE FROM businesses
  WHERE owner_id = target_user_id;
  GET DIAGNOSTICS deleted_businesses = ROW_COUNT;

  -- Montar relatório
  resultado := 'Dados deletados para usuário ' || target_user_id::TEXT || E'\n'
    || '  Negócios: ' || deleted_businesses || E'\n'
    || '  Profissionais: ' || deleted_professionals || E'\n'
    || '  Serviços: ' || deleted_services || E'\n'
    || '  Horários: ' || deleted_working_hours || E'\n'
    || '  Agendamentos: ' || deleted_appointments || E'\n'
    || '  Serviços de agendamento: ' || deleted_appointment_services || E'\n'
    || '  Clientes (customers): ' || deleted_customers || E'\n'
    || '  Transações de pontos: ' || deleted_points_transactions || E'\n'
    || '  Recompensas: ' || deleted_rewards || E'\n'
    || '  Fila de espera: ' || deleted_waitlist;

  RAISE NOTICE '%', resultado;
  RETURN resultado;
END;
$$;

-- =============================================
-- 2. FUNÇÃO: Deleta negócio E o usuário auth completo
-- CUIDADO: Ação irreversível — remove tudo
-- =============================================

CREATE OR REPLACE FUNCTION delete_business_and_user(target_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com permissões elevadas (acesso a auth.users)
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_data_result TEXT;
BEGIN
  -- Buscar o user_id pelo email na tabela auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = target_email;

  -- Se não encontrou o usuário, para aqui
  IF v_user_id IS NULL THEN
    RETURN 'Usuário não encontrado com email: ' || target_email;
  END IF;

  RAISE NOTICE 'Usuário encontrado: % (id: %)', target_email, v_user_id;

  -- Deletar todos os dados do negócio usando a função auxiliar
  v_data_result := delete_business_data(v_user_id);

  RAISE NOTICE 'Dados do negócio removidos. Deletando conta auth...';

  -- Deletar o usuário da tabela auth.users
  DELETE FROM auth.users WHERE id = v_user_id;

  -- Retornar relatório completo
  RETURN v_data_result || E'\n' || '  Conta auth deletada: ' || target_email || ' (' || v_user_id::TEXT || ')';
END;
$$;

-- =============================================
-- COMENTÁRIOS DE USO
-- =============================================

-- Para deletar tudo (dados + conta):
--   SELECT delete_business_and_user('email@exemplo.com');

-- Para limpar só os dados (manter a conta):
--   SELECT delete_business_data('uuid-do-usuario-aqui');

-- IMPORTANTE: Essas funções usam SECURITY DEFINER,
-- então rodam com as permissões do criador (superadmin).
-- NÃO exponha via API pública (não crie RPC público).
-- Use apenas no SQL Editor ou em funções Edge protegidas.
