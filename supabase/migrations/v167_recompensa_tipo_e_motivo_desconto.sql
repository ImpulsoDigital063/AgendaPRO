-- v167 · Recompensa com tipo + motivo do desconto na comanda (Eduardo, 21/10)
--
-- Até aqui recompensa era só um nome e um custo em pontos, e pagar com
-- "Pontos" tirava o atendimento INTEIRO do faturamento e da comissão, como
-- cortesia. Certo pra "Limpeza de Pele Grátis"; errado pra "Desconto 10% na
-- Limpeza" (Wanessa): os 90% que a cliente paga sumiam do financeiro.
--
-- tipo:
--   'gratis'     → paga o atendimento com pontos (comportamento de antes)
--   'percentual' → `desconto` é % sobre a comanda; o resto paga normal
--   'valor'      → `desconto` é R$ abatido da comanda; o resto paga normal
--
-- invoices.discount_reason: o porquê do desconto, pra aparecer escrito no
-- fluxo de caixa ("Resgate de pontos · Desconto 10% na Limpeza").

alter table public.rewards
  add column if not exists tipo text not null default 'gratis'
    check (tipo in ('gratis', 'percentual', 'valor')),
  add column if not exists desconto numeric(10,2)
    check (desconto is null or desconto > 0);

alter table public.rewards
  drop constraint if exists rewards_desconto_do_tipo;
alter table public.rewards
  add constraint rewards_desconto_do_tipo check (
    tipo = 'gratis'
    or (tipo = 'percentual' and desconto is not null and desconto <= 100)
    or (tipo = 'valor' and desconto is not null)
  );

alter table public.invoices
  add column if not exists discount_reason text;

-- Única recompensa que já era desconto pelo nome: "Desconto 10% na Limpeza de
-- pele" da Wanessa (e a cópia dela na conta de teste clinica-teste-fichas).
-- As outras 12 da base são serviço grátis e ficam no padrão 'gratis'.
update public.rewards set tipo = 'percentual', desconto = 10
where id in ('b05effc6-10f0-4a1c-ad49-feed4a765307', '5355e46a-6161-452a-bace-aa019620b342');
