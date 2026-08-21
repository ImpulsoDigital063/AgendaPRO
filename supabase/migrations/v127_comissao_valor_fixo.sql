-- v127 · comissão em valor fixo por serviço (21/08/2026)
--
-- Pedido do Gustavo (CAF): "a comissão dos profissionais são fixas e não por
-- porcentagem". No cadastro do serviço ele define o valor em R$, e o dono
-- ABSORVE o desconto do convênio — o profissional recebe cheio mesmo quando a
-- empresa pagou menos.
--
-- POR QUE UMA COLUNA NO ATENDIMENTO, E NÃO LER DO SERVIÇO NA HORA DE EXIBIR:
-- se a tela lesse services.commission_amount, o dia em que ele reajustasse a
-- comissão de R$40 pra R$45 reescreveria a HISTÓRIA inteira — atendimento de
-- dois meses atrás passaria a valer R$45. Isso vira briga com profissional.
-- Aqui o valor é fotografado quando o atendimento nasce. Reajuste vale daí
-- pra frente.
--
-- NULL = não é comissão fixa (ou o serviço não tem valor definido) → a tela cai
-- na porcentagem de sempre. É o que acontece nos outros 27 negócios.

alter table appointments add column if not exists commission_amount numeric(10,2);

comment on column appointments.commission_amount is
  'Foto do valor FIXO de comissão no momento em que o atendimento nasceu (só em negócio com businesses.comissao_valor_fixo). Null = usar a porcentagem do profissional.';

create or replace function snapshot_commission_amount()
returns trigger as $$
declare
  usa_valor_fixo boolean;
  v_comissao numeric(10,2);
begin
  -- Valor mandado explicitamente (import, correção manual) manda.
  if NEW.commission_amount is not null then
    return NEW;
  end if;

  select b.comissao_valor_fixo into usa_valor_fixo
  from businesses b where b.id = NEW.business_id;

  if not coalesce(usa_valor_fixo, false) or NEW.service_id is null then
    return NEW;
  end if;

  -- Atendimento por convênio usa a comissão do convênio; sem ela, cai na do
  -- preço público (é a regra do Gustavo: o dono absorve o desconto).
  select case
           when NEW.company_id is null then s.commission_amount
           else coalesce(s.convenio_commission_amount, s.commission_amount)
         end
    into v_comissao
  from services s where s.id = NEW.service_id;

  NEW.commission_amount := v_comissao;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_snapshot_commission_amount on appointments;
create trigger trg_snapshot_commission_amount
  before insert on appointments
  for each row
  execute function snapshot_commission_amount();

comment on function snapshot_commission_amount() is
  'Fotografa a comissão fixa do serviço no atendimento, só em negócio com comissao_valor_fixo. Demais negócios: no-op (coluna fica null e as telas seguem na porcentagem).';
