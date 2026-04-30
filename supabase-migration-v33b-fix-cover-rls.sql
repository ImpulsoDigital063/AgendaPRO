-- =================================================================
-- V33b — FIX RLS bc_owner_* (ambiguidade do `name`)
-- =================================================================
--
-- Bug detectado: na v33 a policy usava
--
--   EXISTS (
--     SELECT 1 FROM public.businesses b
--     WHERE b.id::text = (storage.foldername(name))[1]
--       AND b.owner_id = auth.uid()
--   )
--
-- O Postgres resolveu `name` como `b.name` (coluna do business —
-- "Barbearia Estilo Novo") em vez de `storage.objects.name` (path
-- do arquivo — "<uuid>/cover.webp"). Resultado: foldername(b.name)
-- retornava `{}` e (...)[1] virava NULL → EXISTS sempre falso →
-- todo upload bloqueado com "row violates row-level security".
--
-- Fix: usar IN (SELECT ...) e mover (storage.foldername(name))[1]
-- pra fora da subquery — assim `name` resolve no escopo da policy
-- (storage.objects), sem ambiguidade.
--
-- IDEMPOTENTE.
-- =================================================================

drop policy if exists "bc_owner_insert" on storage.objects;
drop policy if exists "bc_owner_update" on storage.objects;
drop policy if exists "bc_owner_delete" on storage.objects;

create policy "bc_owner_insert"
on storage.objects for insert
with check (
  bucket_id = 'business-covers'
  and (storage.foldername(name))[1] in (
    select b.id::text from public.businesses b
    where b.owner_id = auth.uid()
  )
);

create policy "bc_owner_update"
on storage.objects for update
using (
  bucket_id = 'business-covers'
  and (storage.foldername(name))[1] in (
    select b.id::text from public.businesses b
    where b.owner_id = auth.uid()
  )
);

create policy "bc_owner_delete"
on storage.objects for delete
using (
  bucket_id = 'business-covers'
  and (storage.foldername(name))[1] in (
    select b.id::text from public.businesses b
    where b.owner_id = auth.uid()
  )
);
