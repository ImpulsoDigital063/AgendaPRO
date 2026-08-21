-- v128 · limite de profissionais valendo no BANCO (21/08/2026)
--
-- Até aqui o limite do plano existia só na tela (PLAN_LIMITS em
-- ProfissionaisTab): Solo 2, Equipe 5, mais os slots avulsos vendidos em
-- subscriptions.extra_professional_slots. Não havia trava no servidor —
-- qualquer chamada fora da tela cadastrava além do plano.
--
-- Enquanto o limite era só empurrão comercial, tudo bem. Agora o Eduardo vai
-- VENDER slot (R$19 avulso · R$30 o pacote de 3), então isso vira furo de
-- receita: o cliente paga por cinco e cadastra sete.
--
-- A regra copia a tela, sem inventar: recepção NÃO conta (v47), e profissional
-- inativo CONTA (desativar não devolve slot — é o que a tela já faz).
--
-- Conferido antes de aplicar: nenhum dos 28 negócios está acima do próprio
-- limite hoje, então ninguém é barrado retroativamente.

create or replace function check_professional_limit()
returns trigger as $$
declare
  v_plan text;
  v_extras int;
  v_limite int;
  v_atual int;
begin
  -- Recepção não ocupa vaga de profissional.
  if coalesce(NEW.is_receptionist, false) then
    return NEW;
  end if;

  select s.plan, coalesce(s.extra_professional_slots, 0)
    into v_plan, v_extras
  from subscriptions s
  where s.business_id = NEW.business_id;

  -- Sem assinatura ainda (cadastro em andamento): não é hora de barrar.
  if v_plan is null then
    return NEW;
  end if;

  v_limite := case when v_plan = 'equipe' then 5 else 2 end + v_extras;

  select count(*) into v_atual
  from professionals p
  where p.business_id = NEW.business_id
    and coalesce(p.is_receptionist, false) = false;

  if v_atual >= v_limite then
    raise exception
      'Limite de % profissionais do plano % atingido. Fale com a Impulso pra liberar mais vagas.',
      v_limite, case when v_plan = 'equipe' then 'Equipe' else 'Solo' end;
  end if;

  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_check_professional_limit on professionals;
create trigger trg_check_professional_limit
  before insert on professionals
  for each row
  execute function check_professional_limit();

comment on function check_professional_limit() is
  'Trava do limite de profissionais por plano (Solo 2 · Equipe 5 + extra_professional_slots). Espelha a regra da tela: recepção não conta, inativo conta. Sem subscription, não barra (cadastro em andamento).';
