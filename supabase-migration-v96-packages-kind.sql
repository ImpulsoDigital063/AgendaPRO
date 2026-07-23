-- v96 · Separa COMBO de PACOTE na tabela packages
--
-- Modelo cravado por Eduardo (23/07/2026):
--   COMBO  = serviço + produto, cobrado NA VENDA (vive dentro de Produtos).
--   PACOTE = vários serviços, vendido de uma vez e RESGATADO ao longo do tempo
--            (aba Pacotes · valor entra no caixa na venda, comissão no resgate).
--
-- Até aqui os dois compartilhavam a MESMA tabela sem distinção, e a aba "Pacotes"
-- misturava as duas coisas num form só. A coluna `kind` separa pra cada tela
-- listar o tipo certo.
--
-- Seguro: a feature tem USO ZERO na base inteira (0 rows em packages), e a coluna
-- entra com DEFAULT — não mexe em mobile/produção.

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'combo'
  CHECK (kind IN ('combo', 'pacote'));

-- Backfill: quem tem produto no meio é combo (serviço+produto); só-serviço é pacote.
UPDATE packages p
SET kind = CASE
  WHEN EXISTS (
    SELECT 1 FROM package_items pi
    WHERE pi.package_id = p.id AND pi.product_id IS NOT NULL
  ) THEN 'combo'
  ELSE 'pacote'
END;

-- Índice pra listagem por tipo (cada tela filtra por kind)
CREATE INDEX IF NOT EXISTS idx_packages_business_kind
  ON packages (business_id, kind) WHERE active = true;
