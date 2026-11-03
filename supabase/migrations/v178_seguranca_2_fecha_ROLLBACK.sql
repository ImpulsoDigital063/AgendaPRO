-- ROLLBACK de v178 · volta EXATAMENTE ao estado de produção lido em 03/11/2026
-- (pg_policies / pg_get_functiondef). Só usar se o passo 2 quebrar algo.
-- Reabre as falhas de segurança — corrigir o que quebrou e reaplicar v178.
begin;

alter policy "publico ver negocio" on public.businesses to public;
alter policy "publico ver profissionais" on public.professionals to public;
grant select, insert, update, delete on public.businesses to anon;
grant select, insert, update, delete on public.professionals to anon;

create policy "clients_authenticated_all" on public.clients
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.clients to anon, authenticated;

create policy "coupons_public_read" on public.coupons for select using (true);
create policy "coupon_redemptions_public_read" on public.coupon_redemptions for select using (true);
grant select, insert, update, delete on public.coupons to anon;
grant select, insert, update, delete on public.coupon_redemptions to anon;

create or replace function public.replace_professional_hours(p_professional_id uuid, p_hours jsonb, p_updated_by_name text default null::text)
 returns setof working_hours
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
  declare
    v_caller_id uuid := auth.uid();
    v_business_owner uuid;
    v_prof_auth_user uuid;
  begin
    if v_caller_id is null then
      raise exception 'Não autenticado' using errcode = 'P0001';
    end if;
    select b.owner_id, p.auth_user_id
    into v_business_owner, v_prof_auth_user
    from public.professionals p
    join public.businesses b on b.id = p.business_id
    where p.id = p_professional_id;
    if v_business_owner is null then
      raise exception 'Profissional não encontrado' using errcode = 'P0002';
    end if;
    if v_caller_id <> v_business_owner and v_caller_id <> v_prof_auth_user then
      raise exception 'Sem permissão pra editar horários deste profissional'
        using errcode = '42501';
    end if;
    delete from public.working_hours where professional_id = p_professional_id;
    if jsonb_array_length(p_hours) > 0 then
      return query
      insert into public.working_hours (
        professional_id, day_of_week, start_time, end_time, slot_duration,
        updated_by_name, updated_at
      )
      select
        p_professional_id,
        (h->>'day_of_week')::int,
        (h->>'start_time')::time,
        (h->>'end_time')::time,
        (h->>'slot_duration')::int,
        p_updated_by_name,
        now()
      from jsonb_array_elements(p_hours) h
      returning *;
    end if;
  end;
$function$;
grant execute on function public.replace_professional_hours(uuid, jsonb, text) to public, anon;

create or replace function public.tem_acesso_ao_negocio(p_business_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1 from businesses b
    where b.id = p_business_id and b.owner_id = auth.uid()
  ) or exists (
    select 1 from professionals p
    where p.business_id = p_business_id and p.auth_user_id = auth.uid()
  );
$function$;

alter policy "profissional ve servicos do negocio" on public.services
  using (exists (select 1 from public.professionals p
                  where p.business_id = p.business_id and p.auth_user_id = auth.uid()));

alter policy "inserir log" on public.activity_log to public with check (true);

alter policy "pp_auth_insert" on storage.objects with check (bucket_id = 'professional-photos' and auth.uid() is not null);
alter policy "pp_auth_update" on storage.objects
  using (bucket_id = 'professional-photos' and auth.uid() is not null)
  with check (bucket_id = 'professional-photos' and auth.uid() is not null);
alter policy "pp_auth_delete" on storage.objects using (bucket_id = 'professional-photos' and auth.uid() is not null);
alter policy "product-photos · auth upload" on storage.objects with check (bucket_id = 'product-photos' and auth.uid() is not null);
alter policy "product-photos · auth update" on storage.objects using (bucket_id = 'product-photos' and auth.uid() is not null);
alter policy "product-photos · auth delete" on storage.objects using (bucket_id = 'product-photos' and auth.uid() is not null);

grant execute on function public.next_invoice_number(uuid) to public, anon;
grant execute on function public.salvar_push_subscription(text, text, text, text) to public, anon;
grant execute on function public.remover_push_subscription(text) to public, anon;

commit;
notify pgrst, 'reload schema';
