-- =================================================================
-- V30 — LIMITE DE PROFISSIONAIS POR PLANO (defesa em profundidade)
-- =================================================================
--
-- Antes: tabela professionals aceitava qualquer quantidade de inserts.
-- Cliente Solo (R$67/mês) podia cadastrar 50 profissionais → quebra
-- modelo de negócio e diferenciação de tier.
--
-- Limites oficiais (PRICING em src/config/pricing.ts):
--   solo:    2 profissionais (admin/dono + 1 colaborador)
--   equipe:  5 profissionais (incluindo dono)
--
-- Esta migration cria um trigger BEFORE INSERT em professionals que:
--   1. Lê o plan da subscription do business
--   2. Conta professionals atuais (qualquer status — desativados
--      ainda ocupam vaga porque desativar é só "pausa", não revoga
--      cadastro do funcionário; pra liberar vaga, tem que REMOVER)
--   3. Bloqueia INSERT se exceder limite com RAISE EXCEPTION
--
-- Defesa em profundidade: a UI desabilita o botão Adicionar quando
-- chega no limite, mas o trigger garante que NUNCA passa, mesmo se
-- alguém manipular o supabase client direto via console do browser.
--
-- IDEMPOTENTE.
-- =================================================================

create or replace function check_professional_limit()
returns trigger as $$
declare
  current_plan text;
  prof_count int;
  max_allowed int;
begin
  -- 1. Plan da subscription (1 subscription por business)
  select s.plan into current_plan
  from public.subscriptions s
  where s.business_id = NEW.business_id
  limit 1;

  -- 2. Limite por plano
  if current_plan = 'solo' then
    max_allowed := 2;
  elsif current_plan = 'equipe' then
    max_allowed := 5;
  else
    -- Sem subscription (estado pós-cadastro pré-ativação) ou plano
    -- desconhecido: deixa criar. O profissional default do cadastro
    -- é criado nesse estado — bloquear quebraria onboarding.
    return NEW;
  end if;

  -- 3. Conta profissionais existentes do business
  select count(*) into prof_count
  from public.professionals
  where business_id = NEW.business_id;

  -- 4. Bloqueia se exceder
  if prof_count >= max_allowed then
    raise exception
      'Plano % permite no máximo % profissionais. Pra adicionar mais, faça upgrade entrando em contato com a Impulso.',
      current_plan, max_allowed
      using errcode = 'P0001',
            hint = 'Você pode remover profissionais não usados ou fazer upgrade pro plano Equipe (5 vagas).';
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_professional_limit on public.professionals;
create trigger trg_professional_limit
  before insert on public.professionals
  for each row execute function check_professional_limit();

-- =================================================================
-- VALIDAÇÃO PÓS-MIGRATION
-- =================================================================
-- Lista businesses com count atual vs limite:
--   select b.id, b.name, s.plan,
--          count(p.id) as profs,
--          case s.plan
--            when 'solo' then 2
--            when 'equipe' then 5
--            else null
--          end as max_allowed
--   from businesses b
--   left join subscriptions s on s.business_id = b.id
--   left join professionals p on p.business_id = b.id
--   group by b.id, b.name, s.plan
--   order by profs desc;
