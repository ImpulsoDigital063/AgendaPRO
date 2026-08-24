-- v130 · fatura de convênio congelada (24/08/2026)
--
-- Até aqui o extrato era CONSULTA: ele mandava o PDF de agosto pro RH com
-- R$285, lançava um atendimento retroativo, e o extrato daquele mês passava a
-- mostrar outro número. Quando o RH conferisse, quem parecia errado era ele.
--
-- A fatura resolve congelando o que foi enviado: número, período, total e a
-- FOTO das linhas no momento do fechamento. O extrato do mês continua vivo
-- (é a operação); a fatura é o documento.
--
-- `snapshot` guarda as linhas como foram enviadas. Se o atendimento mudar
-- depois, a fatura antiga continua contando a história daquele dia.

create table if not exists company_invoices (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  company_id    uuid not null references companies(id) on delete cascade,
  numero        int  not null,
  competencia   text not null,             -- 'YYYY-MM'
  periodo_ini   date not null,
  periodo_fim   date not null,
  qtd           int  not null default 0,
  total         numeric(10,2) not null default 0,
  status        text not null default 'aberta',   -- aberta · paga · cancelada
  snapshot      jsonb not null default '[]'::jsonb,
  enviada_em    timestamptz,
  enviada_para  text,
  paga_em       timestamptz,
  created_at    timestamptz not null default now()
);

comment on table company_invoices is
  'Fatura FECHADA de convênio: o que foi enviado pra empresa naquele dia, com a foto das linhas. O extrato da tela é consulta viva; isto é documento.';

create index if not exists company_invoices_company_idx on company_invoices(company_id);
create unique index if not exists company_invoices_numero_idx on company_invoices(business_id, numero);

-- Atendimento sabe em qual fatura entrou (e não entra em duas).
alter table appointments add column if not exists company_invoice_id uuid references company_invoices(id) on delete set null;
create index if not exists appointments_company_invoice_idx on appointments(company_invoice_id) where company_invoice_id is not null;

-- Numeração por negócio, igual à das comandas.
create or replace function next_company_invoice_number(p_business uuid)
returns int as $$
declare n int;
begin
  select coalesce(max(numero), 0) + 1 into n from company_invoices where business_id = p_business;
  return n;
end;
$$ language plpgsql;

alter table company_invoices enable row level security;

drop policy if exists company_invoices_dono on company_invoices;
create policy company_invoices_dono on company_invoices for all to authenticated
  using      (business_id in (select id from businesses where owner_id = auth.uid()))
  with check (business_id in (select id from businesses where owner_id = auth.uid()));

drop policy if exists company_invoices_equipe_leitura on company_invoices;
create policy company_invoices_equipe_leitura on company_invoices for select to authenticated
  using (business_id in (select business_id from professionals where auth_user_id = auth.uid()));
