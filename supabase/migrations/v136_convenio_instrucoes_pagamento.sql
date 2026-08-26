-- v136 · Instruções de pagamento por empresa conveniada (26/08/2026)
--
-- O extrato em PDF existe pra ser pago, e não dizia por onde. Só que "por onde"
-- muda por empresa: a Prefeitura de Ribeirão Preto tem processo de empenho —
-- o próprio Gustavo disse em 25/08 que "ainda não fechou o processo com a
-- prefeitura" — enquanto uma transportadora paga em PIX e pronto.
--
-- Por isso o campo é livre e por empresa, não uma chave PIX global do negócio:
-- o dono escreve o que aquele cliente precisa ler (chave, banco, nº de empenho,
-- e-mail do financeiro). Vazio = nada é impresso, sem placeholder e sem
-- rodapé fantasma no documento que vai pro RH.

alter table companies
  add column if not exists instrucoes_pagamento text;

comment on column companies.instrucoes_pagamento is
  'Texto livre impresso no rodapé do extrato/fatura em PDF dessa empresa (chave PIX, dados bancários, nº de empenho). Vazio = nada é impresso.';
