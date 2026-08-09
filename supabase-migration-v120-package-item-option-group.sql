-- v120 · MATERIAL ALTERNATIVO NO COMBO ("todas as cores dentro")
--
-- Problema real (Studio Mood / Izanara, 08-09/08/2026): o combo aponta pra UM
-- material. Como o mesmo cabelo existe em 3 cores — e dentro da marca ainda há
-- vários tipos de cacho — ela teria que criar um combo por cor, por cacho, por
-- serviço. Multiplica até virar inviável.
--
-- Solução SEM mexer no cadastro de produto dela (produto por cor continua
-- valendo · ver feedback_agendapro_produto_por_cor_nao_variante): um item de
-- material do combo passa a poder ter ALTERNATIVAS. As linhas de package_items
-- que compartilham o mesmo `option_group` são opções entre si — na hora de
-- aplicar o combo, quem atende escolhe UMA.
--
-- Modelagem: cada opção continua sendo uma linha própria de package_items
-- (product_id, quantity, unit_price intactos). Nada muda pra combo de material
-- único: option_group fica NULL e o comportamento atual segue idêntico.
--
-- Por que uuid e não boolean: um combo pode ter DOIS materiais alternáveis
-- (ex.: cabelo em 3 cores + touca em 2 cores). O grupo diz quais opções
-- disputam a mesma escolha.

ALTER TABLE public.package_items
  ADD COLUMN IF NOT EXISTS option_group uuid;

COMMENT ON COLUMN public.package_items.option_group IS
  'Agrupa itens ALTERNATIVOS do combo (escolhe 1 na aplicação). Linhas com o mesmo option_group são opções do mesmo material — ex: o mesmo cabelo em 3 cores. NULL = item obrigatório, comportamento original. v120.';

-- Busca as opções de um combo sem varrer a tabela.
CREATE INDEX IF NOT EXISTS idx_package_items_option_group
  ON public.package_items (package_id, option_group)
  WHERE option_group IS NOT NULL;

-- Conferência:
-- SELECT column_name, data_type FROM information_schema.columns
--  WHERE table_name = 'package_items' AND column_name = 'option_group';
