-- v142 · qual pacote de avisos o negócio contratou
--
-- null = NÃO contratou, e é o padrão de propósito. O módulo é opcional e
-- cada mensagem tem custo real na conta da Impulso: sem esta coluna, todo
-- negócio com uma regra ligada manda de graça na fatura do Eduardo.
--
-- Foi exatamente o que aconteceu com o Studio Priscila Martins em 24/08 —
-- ligou as cinco regras 52 minutos depois de se cadastrar, sem ninguém
-- pedir e sem contratar nada. Naquele dia o canal era grátis. Agora não é.

alter table public.businesses
  add column if not exists avisos_pacote text;

alter table public.businesses
  drop constraint if exists businesses_avisos_pacote_check;

alter table public.businesses
  add constraint businesses_avisos_pacote_check
  check (avisos_pacote is null or avisos_pacote in ('essencial','padrao','plus','pro','alto'));

comment on column public.businesses.avisos_pacote is
  'Pacote de avisos por WhatsApp contratado. null = não contratou e não envia. Catálogo em src/lib/mensagens/pacotes.ts';
