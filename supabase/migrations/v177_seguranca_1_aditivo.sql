-- v177 · SEGURANÇA, PASSO 1 de 2 (03/11/2026) — ADITIVO
--
-- Rodar ANTES do deploy do código. Não fecha nada, não quebra nada: só cria
-- caminhos novos que o código passa a usar, para que o passo 2 (v178) possa
-- fechar o que hoje está aberto sem derrubar tela nenhuma.
--
-- Contexto (auditoria 02/11, provado no catálogo de produção):
--   · clients: policy `clients_authenticated_all` = true → qualquer login lê,
--     altera e apaga os 1.477 clientes de TODOS os negócios.
--   · businesses / professionals: leitura pública de TODAS as colunas
--     (CPF, conta, Pix, CNPJ...), para anon e para login de outro negócio.
--   · coupons / coupon_redemptions: leitura pública.
-- Equipe (recepção, gerente, profissional) hoje lê o próprio negócio e os
-- colegas POR CAUSA dessas policies abertas. Antes de fechar, ganha policy
-- própria aqui.

-- 1. Acha-ou-cria cliente universal por telefone, devolvendo SÓ o id.
create or replace function public.resolver_cliente(
  p_nome text,
  p_telefone text,
  p_email text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id  uuid;
  v_tel text := btrim(coalesce(p_telefone, ''));
begin
  if auth.uid() is null then
    raise exception 'Não autenticado' using errcode = 'P0001';
  end if;
  -- só quem opera algum negócio (dono ou equipe ativa)
  if not exists (select 1 from businesses where owner_id = auth.uid())
     and not exists (select 1 from professionals where auth_user_id = auth.uid() and active) then
    raise exception 'Sem negócio' using errcode = '42501';
  end if;
  if v_tel = '' then
    return null;
  end if;

  select id into v_id
    from clients
   where fone = public.fone_canon(v_tel)
   order by created_at
   limit 1;
  if v_id is not null then
    return v_id;  -- existente: NÃO altera nome/email (linha é de todos os negócios)
  end if;

  begin
    insert into clients (name, phone, email)
    values (coalesce(nullif(btrim(p_nome), ''), 'Cliente'), v_tel, nullif(btrim(coalesce(p_email, '')), ''))
    returning id into v_id;
  exception when unique_violation then
    select id into v_id from clients where fone = public.fone_canon(v_tel) order by created_at limit 1;
  end;
  return v_id;
end;
$$;
revoke all on function public.resolver_cliente(text, text, text) from public, anon;
grant execute on function public.resolver_cliente(text, text, text) to authenticated;

-- 2. Acesso por pasta do storage (primeira pasta = id do negócio).
--    Nome que não é uuid (10 arquivos antigos na raiz) → false, sem erro de cast.
create or replace function public.tem_acesso_pasta(p_pasta text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_pasta ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.tem_acesso_ao_negocio(p_pasta::uuid)
    else false
  end
$$;
revoke all on function public.tem_acesso_pasta(text) from public, anon;
grant execute on function public.tem_acesso_pasta(text) to authenticated;

-- 3. Equipe lê o PRÓPRIO negócio, os colegas e os cupons sem depender do público.
drop policy if exists "equipe ve negocio" on public.businesses;
create policy "equipe ve negocio" on public.businesses
  for select to authenticated
  using (public.tem_acesso_ao_negocio(id));

drop policy if exists "equipe ve profissionais" on public.professionals;
create policy "equipe ve profissionais" on public.professionals
  for select to authenticated
  using (public.tem_acesso_ao_negocio(business_id));

drop policy if exists "equipe ve cupons" on public.coupons;
create policy "equipe ve cupons" on public.coupons
  for select to authenticated
  using (public.tem_acesso_ao_negocio(business_id));

drop policy if exists "equipe ve resgates de cupom" on public.coupon_redemptions;
create policy "equipe ve resgates de cupom" on public.coupon_redemptions
  for select to authenticated
  using (exists (
    select 1 from public.coupons c
     where c.id = coupon_redemptions.coupon_id
       and public.tem_acesso_ao_negocio(c.business_id)
  ));

-- 4. clients: quem atende a pessoa (atendimento ou ficha no negócio) lê e edita.
--    Convive com a policy aberta até o passo 2 removê-la.
drop policy if exists "equipe ve clientes do negocio" on public.clients;
create policy "equipe ve clientes do negocio" on public.clients
  for select to authenticated
  using (
    exists (select 1 from public.appointments a
             where a.client_id = clients.id and public.tem_acesso_ao_negocio(a.business_id))
    or exists (select 1 from public.customers cu
                where cu.fone = clients.fone and public.tem_acesso_ao_negocio(cu.business_id))
  );

drop policy if exists "equipe edita clientes do negocio" on public.clients;
create policy "equipe edita clientes do negocio" on public.clients
  for update to authenticated
  using (
    exists (select 1 from public.appointments a
             where a.client_id = clients.id and public.tem_acesso_ao_negocio(a.business_id))
    or exists (select 1 from public.customers cu
                where cu.fone = clients.fone and public.tem_acesso_ao_negocio(cu.business_id))
  )
  with check (true);

create index if not exists idx_appointments_client_id
  on public.appointments (client_id) where client_id is not null;
