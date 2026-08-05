-- ═══════════════════════════════════════════════════════════════
-- v109 · ultimo_agendamento_clientes() — última data QUALQUER por cliente
--
-- Segunda função da série v108. Existe separada de propósito, porque as
-- telas de reativação e campanha usam uma régua diferente da lista de
-- clientes:
--
--   resumo_clientes (v108)  -> última visita REALIZADA
--                              (data <= hoje, fora de cancelled/no_show)
--   esta aqui (v109)        -> última data QUALQUER
--                              (inclui futuro e cancelado)
--
-- Por que a diferença importa: "sumido há 60 dias" tem que olhar também o
-- que está marcado pra frente. Cliente que agendou pra semana que vem NÃO
-- sumiu — mandar cupom de reativação pra ela seria dar desconto a quem já
-- ia voltar de qualquer jeito.
--
-- Cópia fiel do que o JS fazia nas duas telas: nenhum filtro de status,
-- nenhum corte de data, só o MAX por cliente. Se um dia decidirmos que
-- atendimento cancelado não deve contar como "última visita", é aqui que
-- se mexe — e aí muda quem entra na lista de reativação, então é decisão
-- de negócio, não de código.
--
-- Substitui a varredura de TODOS os atendimentos do negócio (o fetchAll
-- que estava nas duas telas desde 04/08) por uma linha por cliente.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION ultimo_agendamento_clientes(p_business_id uuid)
RETURNS TABLE (
  client_id uuid,
  ultima date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.client_id, MAX(a.appointment_date) AS ultima
  FROM appointments a
  WHERE a.business_id = p_business_id
    AND a.client_id IS NOT NULL
  GROUP BY a.client_id;
$$;

COMMENT ON FUNCTION ultimo_agendamento_clientes IS
  'Última data agendada por cliente, incluindo futuro e cancelado. Usada por '
  'reativação e campanhas — quem tem horário marcado à frente não é sumido. '
  'Difere de resumo_clientes, que devolve a última visita REALIZADA.';
