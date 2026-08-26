-- v134 · Comissão por serviço (item 6 · Studio Isis Melo)
--
-- A regra dela: a porcentagem é do SERVIÇO, não da pessoa. A mesma profissional
-- recebe 50% numa manicure (material do studio) e 70% numa podologia (material
-- dela), no mesmo dia.
--
-- ── POR QUE PERCENTUAL E NÃO VALOR ────────────────────────────────────────
-- O CAF congela o VALOR (appointments.commission_amount, v127): valor gravado
-- manda e o desconto da comanda não abate — lá o dono absorve o desconto de
-- propósito.
--
-- Aqui não serve. O item 4 do escopo dela é justamente "comissão sobre o valor
-- COM desconto" (regra Luana · getApptDiscountMap). Se eu gravasse valor, o
-- desconto pararia de abater e o item 6 mataria o item 4.
--
-- Então congelo a PORCENTAGEM no atendimento. As telas seguem fazendo
-- (total − desconto rateado) × pct — só que o pct passa a vir do atendimento
-- quando existir, em vez de vir sempre da pessoa.
--
-- Ganho de tabela: reajustar um serviço vale daqui pra frente. O que já foi
-- atendido guarda a porcentagem do dia e não é reescrito.
--
-- Idempotente.

-- ─────────────────────────────────────────────────────────────
-- 1. FOTO DA PORCENTAGEM NO ATENDIMENTO
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS commission_percent numeric(5,2) NULL;

COMMENT ON COLUMN public.appointments.commission_percent IS
  'Foto da porcentagem de comissao no momento em que o atendimento nasceu (so em negocio com businesses.comissao_por_servico). Null = usar professionals.commission_percentage, que e o padrao da casa.';

-- ─────────────────────────────────────────────────────────────
-- 2. O TRIGGER GANHA O SEGUNDO CAMINHO
-- ─────────────────────────────────────────────────────────────
-- Precedência, explícita:
--   1º comissao_valor_fixo   (CAF)   → grava commission_amount, em R$
--   2º comissao_por_servico  (Isis)  → grava commission_percent, em %
--   3º nenhum dos dois               → nada gravado, telas usam o % da pessoa
--
-- Um negócio não deveria ter as duas chaves ligadas; se tiver, valor fixo vence
-- (é o mais específico) e o percentual fica null.

create or replace function snapshot_commission_amount()
returns trigger as $$
declare
  usa_valor_fixo boolean;
  usa_por_servico boolean;
  v_comissao numeric(10,2);
  v_percent numeric(5,2);
  precisa_recalcular boolean;
begin
  if TG_OP = 'INSERT' then
    -- Valor mandado explicitamente (import, correção) manda.
    precisa_recalcular := NEW.commission_amount is null and NEW.commission_percent is null;
  else
    -- Mexeu no valor OU na porcentagem na mão? É intenção humana, respeita e sai.
    if NEW.commission_amount is distinct from OLD.commission_amount
       or NEW.commission_percent is distinct from OLD.commission_percent then
      return NEW;
    end if;
    precisa_recalcular :=
      (NEW.service_id is distinct from OLD.service_id)
      or (NEW.company_id is distinct from OLD.company_id);
  end if;

  if not precisa_recalcular then
    return NEW;
  end if;

  select b.comissao_valor_fixo, b.comissao_por_servico
    into usa_valor_fixo, usa_por_servico
  from businesses b where b.id = NEW.business_id;

  -- ── caminho 1 · CAF · comissão em R$ ──────────────────────
  if coalesce(usa_valor_fixo, false) then
    if NEW.service_id is null then
      -- Sem serviço não há valor de onde tirar. Zera pra cair na porcentagem,
      -- em vez de manter a comissão de um serviço que não é mais esse.
      NEW.commission_amount := null;
      return NEW;
    end if;

    select case
             when NEW.company_id is null then s.commission_amount
             else coalesce(s.convenio_commission_amount, s.commission_amount)
           end
      into v_comissao
    from services s where s.id = NEW.service_id;

    NEW.commission_amount := v_comissao;
    return NEW;
  end if;

  -- ── caminho 2 · Isis · comissão em % ──────────────────────
  if coalesce(usa_por_servico, false) then
    if NEW.service_id is null then
      NEW.commission_percent := null;
      return NEW;
    end if;

    select s.commission_percent into v_percent
    from services s where s.id = NEW.service_id;

    -- Serviço sem porcentagem própria cai na da pessoa (null aqui = fallback).
    NEW.commission_percent := v_percent;
    return NEW;
  end if;

  -- ── nenhum dos dois · base inteira · nada muda ────────────
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_snapshot_commission_amount on appointments;
create trigger trg_snapshot_commission_amount
  before insert or update on appointments
  for each row
  execute function snapshot_commission_amount();

comment on function snapshot_commission_amount() is
  'Fotografa a comissao no atendimento. comissao_valor_fixo (CAF) grava R$ em commission_amount; comissao_por_servico (Isis) grava % em commission_percent; sem chave nenhuma, nao grava nada e as telas usam a porcentagem do profissional.';
