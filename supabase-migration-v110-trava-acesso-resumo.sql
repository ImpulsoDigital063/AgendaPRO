-- ═══════════════════════════════════════════════════════════════
-- v110 · TRAVA DE ACESSO nas funções v108/v109  ·  CORREÇÃO DE SEGURANÇA
--
-- Falha que eu criei nas v108/v109 e peguei conferindo em 05/08/2026:
-- função `SECURITY DEFINER` nasce executável por PUBLIC, e SECURITY
-- DEFINER ignora RLS por dentro. Resultado: com a chave anon — que é
-- pública por natureza, vai no bundle do navegador — e SEM LOGIN, era
-- possível chamar
--
--     resumo_clientes('<id de qualquer negócio>', '2026-08-05')
--
-- e receber 163 linhas com visitas e total gasto por cliente do Olímpio.
-- Faturamento de cliente exposto pra quem soubesse o id do negócio.
--
-- A RLS das tabelas nunca falhou; o buraco foi eu abrir uma porta ao lado
-- dela. É o risco de SECURITY DEFINER: ele existe justamente pra passar
-- por cima da RLS, então a autorização tem que ser escrita À MÃO dentro
-- da função.
--
-- Duas camadas, porque uma só não basta:
--   1. EXECUTE revogado de public/anon, concedido só a authenticated
--   2. guarda dentro da função: devolve linhas apenas se quem chamou é
--      dono do negócio ou profissional dele (auth.uid())
--
-- A camada 2 é a que importa de verdade — sem ela, um cliente logado
-- poderia ler os números de OUTRO negócio só trocando o uuid.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION tem_acesso_ao_negocio(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = p_business_id AND b.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM professionals p
    WHERE p.business_id = p_business_id AND p.auth_user_id = auth.uid()
  );
$func$;

COMMENT ON FUNCTION tem_acesso_ao_negocio IS
  'Quem chamou é dono ou profissional deste negócio? Guarda de autorização '
  'para funções SECURITY DEFINER, que passam por cima da RLS (v110).';

-- ── resumo_clientes com a guarda ───────────────────────────────────
CREATE OR REPLACE FUNCTION resumo_clientes(p_business_id uuid, p_hoje date)
RETURNS TABLE (
  client_id uuid,
  visitas integer,
  primeira date,
  ultima date,
  total_gasto numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
  WITH permissao AS (
    SELECT tem_acesso_ao_negocio(p_business_id) AS ok
  ),
  subtotais AS (
    SELECT ii.invoice_id, SUM(COALESCE(ii.total, 0)) AS subtotal
    FROM invoice_items ii
    JOIN invoices inv ON inv.id = ii.invoice_id
    WHERE inv.business_id = p_business_id
    GROUP BY ii.invoice_id
  ),
  desconto_por_item AS (
    SELECT
      ii.id AS item_id,
      CASE
        WHEN COALESCE(inv.discount, 0) > 0 AND s.subtotal > 0
        THEN (COALESCE(ii.total, 0) / s.subtotal) * inv.discount
        ELSE 0
      END AS desconto
    FROM invoice_items ii
    JOIN invoices inv ON inv.id = ii.invoice_id
    JOIN subtotais s ON s.invoice_id = ii.invoice_id
    WHERE inv.business_id = p_business_id
      AND ii.item_type = 'appointment'
  ),
  atendimentos AS (
    SELECT
      a.client_id,
      a.appointment_date,
      a.paid_at,
      GREATEST(0, COALESCE(a.total_price, 0) - COALESCE(d.desconto, 0)) AS liquido
    FROM appointments a
    LEFT JOIN desconto_por_item d ON d.item_id = a.invoice_item_id
    WHERE a.business_id = p_business_id
      AND a.client_id IS NOT NULL
      AND a.appointment_date <= p_hoje
      AND a.status NOT IN ('cancelled', 'no_show')
  ),
  por_atendimento AS (
    SELECT
      client_id,
      COUNT(*)::integer AS visitas,
      MIN(appointment_date) AS primeira,
      MAX(appointment_date) AS ultima,
      SUM(CASE WHEN paid_at IS NOT NULL THEN liquido ELSE 0 END) AS gasto
    FROM atendimentos
    GROUP BY client_id
  ),
  por_venda AS (
    SELECT
      sa.customer_id AS client_id,
      MIN(sa.sale_date) AS primeira,
      MAX(sa.sale_date) AS ultima,
      SUM(COALESCE(sa.total, 0)) AS gasto
    FROM sales sa
    WHERE sa.business_id = p_business_id
      AND sa.type = 'product_sale'
      AND sa.status = 'paid'
      AND sa.customer_id IS NOT NULL
      AND sa.paid_at IS NOT NULL
    GROUP BY sa.customer_id
  )
  SELECT
    COALESCE(a.client_id, v.client_id) AS client_id,
    COALESCE(a.visitas, 0) AS visitas,
    LEAST(COALESCE(a.primeira, v.primeira), COALESCE(v.primeira, a.primeira)) AS primeira,
    GREATEST(COALESCE(a.ultima, v.ultima), COALESCE(v.ultima, a.ultima)) AS ultima,
    COALESCE(a.gasto, 0) + COALESCE(v.gasto, 0) AS total_gasto
  FROM por_atendimento a
  FULL OUTER JOIN por_venda v ON v.client_id = a.client_id
  CROSS JOIN permissao
  WHERE permissao.ok;
$func$;

-- ── ultimo_agendamento_clientes com a guarda ───────────────────────
CREATE OR REPLACE FUNCTION ultimo_agendamento_clientes(p_business_id uuid)
RETURNS TABLE (client_id uuid, ultima date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT a.client_id, MAX(a.appointment_date) AS ultima
  FROM appointments a
  WHERE a.business_id = p_business_id
    AND a.client_id IS NOT NULL
    AND tem_acesso_ao_negocio(p_business_id)
  GROUP BY a.client_id;
$func$;

-- ── camada 2: quem pode sequer chamar ──────────────────────────────
REVOKE ALL ON FUNCTION resumo_clientes(uuid, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION ultimo_agendamento_clientes(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION tem_acesso_ao_negocio(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION resumo_clientes(uuid, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ultimo_agendamento_clientes(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION tem_acesso_ao_negocio(uuid) TO authenticated, service_role;

-- Conferência esperada depois de rodar:
--   chave anon, sem login  -> erro de permissão (não mais 163 linhas)
--   dono logado            -> os mesmos números de antes
