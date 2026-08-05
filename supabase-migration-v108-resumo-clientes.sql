-- ═══════════════════════════════════════════════════════════════
-- v108 · resumo_clientes() — agrega no banco em vez de baixar a história
--
-- Playbook trazido pelo Eduardo do ComandaPRO (04/08/2026): o padrão que
-- mais pesa é BUSCAR LINHAS E SOMAR NO JS. Três telas do AgendaPRO fazem
-- isso — /admin/clientes, /clientes/reativar e /clientes/campanhas —
-- varrendo TODOS os atendimentos do negócio pra montar, por cliente,
-- quantas visitas, primeira, última e quanto gastou.
--
-- Medido antes de escrever: Olímpio baixa 366 linhas por load pra mostrar
-- 193 clientes, e cresce ~158 linhas/mês. Em um ano são 2.200 linhas por
-- abertura de tela, com o mesmo resultado.
--
-- Esta função devolve UMA LINHA POR CLIENTE. Some o teto de 1000 linhas
-- (não há o que truncar) e o tráfego para de crescer com a história.
--
-- ⚠️ O NÚMERO TEM QUE SAIR IDÊNTICO ao que o JS calculava. As regras
-- abaixo são cópia fiel de src/app/admin/(protected)/clientes/page.tsx:
--
--   · visita conta só o REALIZADO: data <= hoje E status fora de
--     cancelled/no_show. Futuro agendado não é visita feita — foi o bug
--     do import do Salão99, que mostrava 202 visitas onde havia 5.
--   · total gasto conta só o que ENTROU (paid_at preenchido). Cliente
--     que atendeu e não pagou não vira faturamento.
--   · λ.valor-liquido: o desconto da comanda é rateado entre os itens
--     (cada item paga a fração dele do desconto) e abatido do valor.
--   · venda de produto paga entra no gasto e move primeira/última data.
--
-- ⚠️ p_hoje vem de fora, calculado por src/lib/date-br. NÃO usar
-- CURRENT_DATE: o banco responde em UTC e, depois das 21h no Brasil,
-- atendimento de hoje viraria "futuro" e sumiria da conta.
-- ═══════════════════════════════════════════════════════════════

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
AS $$
  WITH subtotais AS (
    -- Subtotal real de cada comanda = soma de TODOS os itens dela.
    -- É o denominador do rateio do desconto.
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
  FULL OUTER JOIN por_venda v ON v.client_id = a.client_id;
$$;

COMMENT ON FUNCTION resumo_clientes IS
  'Uma linha por cliente com visitas, primeira/última data e total gasto líquido. '
  'Substitui a varredura de todos os atendimentos no JS (v108, 05/08/2026). '
  'p_hoje deve vir de src/lib/date-br — CURRENT_DATE quebraria o fuso.';

-- Índices que sustentam a função. IF NOT EXISTS: se já existirem, não faz nada.
CREATE INDEX IF NOT EXISTS idx_appointments_business_client
  ON appointments (business_id, client_id)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_business_date
  ON appointments (business_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice
  ON invoice_items (invoice_id);

-- Conferência sugerida (troque o uuid pelo do negócio):
--   EXPLAIN ANALYZE SELECT * FROM resumo_clientes('<business_id>', CURRENT_DATE);
--   -> tem que aparecer Index Scan, não Seq Scan em appointments.
