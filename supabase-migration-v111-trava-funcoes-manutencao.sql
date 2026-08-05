-- ═══════════════════════════════════════════════════════════════
-- v111 · TRAVA nas funções de manutenção  ·  CORREÇÃO DE SEGURANÇA
--
-- Descoberto em 05/08/2026, auditando o buraco que eu mesmo abri na v108:
-- as duas funções de deleção da v10 (abril) nasceram executáveis por
-- PUBLIC — como toda função no Postgres. Sendo SECURITY DEFINER, elas
-- rodam com permissão elevada e ignoram RLS.
--
-- O que estava aberto pra chave anon, que é pública e vai no bundle do
-- navegador:
--
--   delete_business_and_user('email@do-cliente.com')
--     -> apaga agendamentos, clientes, serviços, profissionais, o negócio
--        E a conta de login. Sem autenticação nenhuma.
--
-- Bastava saber o e-mail de um cliente. Confirmado por teste: a chamada
-- executava (não dava permission denied).
--
-- Nenhuma tela do sistema chama essas funções — são de manutenção, feitas
-- pra rodar no SQL Editor. Então trancar não quebra nada.
--
-- Sem indício de uso indevido: os 23 negócios seguem de pé e a única
-- remoção do dia foi a limpeza manual do Império e do Tutorial.
--
-- REGRA QUE FICA: no Postgres, função nova é executável por PUBLIC por
-- padrão. Toda função SECURITY DEFINER precisa de REVOKE explícito e,
-- quando lê dado de negócio, de guarda de autorização por dentro — ver
-- tem_acesso_ao_negocio() na v110.
-- ═══════════════════════════════════════════════════════════════

REVOKE ALL ON FUNCTION delete_business_data(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION delete_business_and_user(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION delete_business_data(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION delete_business_and_user(text) TO service_role;

-- Conferido depois de rodar (chave anon): permission denied nas duas.
--
-- Varredura das demais funções do schema, feita no mesmo dia: os outros
-- 8 objetos são gatilhos (check_appointment_overlap, check_professional_limit,
-- credit_points_on_confirm, reverse_points_on_uncomplete,
-- validate_points_business_match, update_subscriptions_updated_at,
-- create_default_working_hours) — não são expostos como RPC pelo PostgREST
-- e só rodam por trigger. Nenhum outro exposto.
