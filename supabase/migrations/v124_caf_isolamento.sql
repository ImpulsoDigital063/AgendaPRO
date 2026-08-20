-- v124 · isolamento do CAF (20/08/2026)
--
-- Fundação do projeto do Gustavo (CAF Centro Avançado de Fisioterapia). NADA
-- aqui muda comportamento de negócio nenhum: cria as chaves, as colunas e as
-- tabelas, e liga as chaves SÓ no CAF no bloco final.
--
-- A regra que vale linha por linha: os outros 26 negócios ativos (e todo mundo
-- que se cadastrar depois) não podem sentir nada. Por isso três chaves nascem
-- FALSE — recurso novo ninguém ganha sem pedir — e uma nasce TRUE.
--
-- ⚠️ prof_registra_pagamento nasce TRUE de propósito. Ela não LIGA recurso
-- novo, ela DESLIGA algo que já existe: hoje a profissional confirma pagamento
-- e escolhe a forma pelo celular dela (api/profissional/action). Se essa coluna
-- nascesse FALSE, eu tirava isso da equipe do Olímpio, do Realli e de todo
-- mundo de uma vez. Nasce ligada, desligo só no CAF.
--
-- Idempotente: pode rodar de novo sem estragar nada.

-- ─────────────────────────────────────────────────────────────
-- 1. CHAVES por negócio
-- ─────────────────────────────────────────────────────────────
alter table businesses add column if not exists agendamento_simultaneo  boolean not null default false;
alter table businesses add column if not exists convenios_enabled       boolean not null default false;
alter table businesses add column if not exists comissao_valor_fixo     boolean not null default false;
alter table businesses add column if not exists prof_registra_pagamento boolean not null default true;

comment on column businesses.agendamento_simultaneo is
  'Permite mais de um agendamento no mesmo horário para o mesmo profissional. Default false: a trava de overbooking (trigger v9 + constraint no_overlap v40) segue valendo pra todo mundo.';
comment on column businesses.convenios_enabled is
  'Liga o módulo de convênio PJ (empresas, funcionários, extrato). Default false.';
comment on column businesses.comissao_valor_fixo is
  'Comissão do profissional vira VALOR FIXO por serviço, no lugar da porcentagem de professionals.commission_percentage. Default false.';
comment on column businesses.prof_registra_pagamento is
  'TRUE = profissional pode confirmar pagamento e escolher a forma no app dela (comportamento histórico). FALSE = ela só marca atendido; o recebimento fica com Adm/recepção. Default TRUE pra não remover capacidade de quem já usa.';

-- ─────────────────────────────────────────────────────────────
-- 2. CAMPOS DE PREÇO E COMISSÃO no serviço (nascem nulos)
-- ─────────────────────────────────────────────────────────────
alter table services add column if not exists commission_amount          numeric(10,2);
alter table services add column if not exists convenio_price             numeric(10,2);
alter table services add column if not exists convenio_commission_amount numeric(10,2);

comment on column services.commission_amount is
  'Valor FIXO em R$ que o profissional recebe por este serviço no preço público. Só é lido quando businesses.comissao_valor_fixo = true. Null = cai na porcentagem de sempre.';
comment on column services.convenio_price is
  'Preço praticado quando o atendimento é por convênio (empresa). Null = convênio paga o preço público.';
comment on column services.convenio_commission_amount is
  'Valor FIXO em R$ da comissão no atendimento por convênio. Normalmente igual ao commission_amount: o dono absorve o desconto do convênio e paga a comissão cheia (regra do Gustavo, 19/08).';

-- ─────────────────────────────────────────────────────────────
-- 3. EMPRESAS (convênio) e quem atende por elas
-- ─────────────────────────────────────────────────────────────
create table if not exists companies (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses(id) on delete cascade,
  name             text not null,
  cnpj             text,
  contato_nome     text,
  contato_telefone text,
  contato_email    text,
  ativo            boolean not null default true,
  created_at       timestamptz not null default now()
);

comment on table companies is
  'Empresa conveniada (CAF · 20/08/2026). Os atendimentos dos funcionários dela acumulam no nome da empresa, que paga depois — não entra no caixa do dia.';

create index if not exists companies_business_idx on companies(business_id);

-- Quais profissionais podem atender POR aquela empresa. São vários por empresa
-- (Gustavo, áudio 09:57: "eu tenho convênios que vai ter três, às vezes quatro
-- profissionais"), e o mesmo profissional pode estar em várias empresas.
-- Quem não está aqui não pode atender pela empresa.
create table if not exists company_professionals (
  company_id      uuid not null references companies(id) on delete cascade,
  professional_id uuid not null references professionals(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (company_id, professional_id)
);

create index if not exists company_professionals_prof_idx on company_professionals(professional_id);

-- ─────────────────────────────────────────────────────────────
-- 4. VÍNCULOS nas tabelas que já existem
-- ─────────────────────────────────────────────────────────────
alter table customers    add column if not exists company_id uuid references companies(id) on delete set null;
alter table appointments add column if not exists company_id uuid references companies(id) on delete set null;

comment on column customers.company_id is
  'Funcionário de empresa conveniada. Null = paciente particular (é o caso de 100% da base hoje).';
comment on column appointments.company_id is
  'Atendimento feito PELA empresa (convênio). Preenchido = não entra no caixa do dia, vai pro acumulado da empresa.';

create index if not exists customers_company_idx    on customers(company_id)    where company_id is not null;
create index if not exists appointments_company_idx on appointments(company_id) where company_id is not null;

-- ─────────────────────────────────────────────────────────────
-- 5. RLS — mesmo padrão do resto do projeto
-- ─────────────────────────────────────────────────────────────
alter table companies             enable row level security;
alter table company_professionals enable row level security;

drop policy if exists companies_dono on companies;
create policy companies_dono on companies for all to authenticated
  using      (business_id in (select id from businesses where owner_id = auth.uid()))
  with check (business_id in (select id from businesses where owner_id = auth.uid()));

-- Equipe do negócio LÊ (precisa pra ver a empresa no card do atendimento),
-- mas não cria nem apaga empresa.
drop policy if exists companies_equipe_leitura on companies;
create policy companies_equipe_leitura on companies for select to authenticated
  using (business_id in (select business_id from professionals where auth_user_id = auth.uid()));

drop policy if exists company_professionals_dono on company_professionals;
create policy company_professionals_dono on company_professionals for all to authenticated
  using      (company_id in (select c.id from companies c join businesses b on b.id = c.business_id where b.owner_id = auth.uid()))
  with check (company_id in (select c.id from companies c join businesses b on b.id = c.business_id where b.owner_id = auth.uid()));

drop policy if exists company_professionals_equipe_leitura on company_professionals;
create policy company_professionals_equipe_leitura on company_professionals for select to authenticated
  using (company_id in (select c.id from companies c join professionals p on p.business_id = c.business_id where p.auth_user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- 6. LIGA AS CHAVES — só no CAF
-- ─────────────────────────────────────────────────────────────
update businesses set
  agendamento_simultaneo  = true,
  convenios_enabled       = true,
  comissao_valor_fixo     = true,
  prof_registra_pagamento = false
where slug = 'caf-centro-avancado-de-fisioterapia';

-- ─────────────────────────────────────────────────────────────
-- 7. CONFERÊNCIA (o resultado tem que ser 1 linha alterada e o resto zerado)
-- ─────────────────────────────────────────────────────────────
select
  count(*) filter (where agendamento_simultaneo)      as com_simultaneo,
  count(*) filter (where convenios_enabled)           as com_convenio,
  count(*) filter (where comissao_valor_fixo)         as com_comissao_fixa,
  count(*) filter (where not prof_registra_pagamento) as sem_pagamento_prof,
  count(*)                                            as total_negocios
from businesses;
