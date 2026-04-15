-- v5 — Storage bucket para fotos de profissionais
-- Rodar no SQL Editor do Supabase. Idempotente.

-- 1. Bucket público professional-photos (leitura pública, escrita autenticada)
insert into storage.buckets (id, name, public)
values ('professional-photos', 'professional-photos', true)
on conflict (id) do update set public = true;

-- 2. Policies de storage.objects escopadas ao dono do negócio.
--    Path esperado: <business_id>/<professional_id>.<ext>
--    O primeiro segmento do name precisa ser um business_id pertencente ao user.

-- Drop das policies antigas (caso rodando de novo)
drop policy if exists "pp_public_read" on storage.objects;
drop policy if exists "pp_owner_insert" on storage.objects;
drop policy if exists "pp_owner_update" on storage.objects;
drop policy if exists "pp_owner_delete" on storage.objects;

-- Leitura: qualquer um vê as fotos (usadas na tela pública /[slug]/agendar)
create policy "pp_public_read"
on storage.objects for select
using (bucket_id = 'professional-photos');

-- Insert: só o dono do business pode adicionar arquivos naquele business_id/
create policy "pp_owner_insert"
on storage.objects for insert
with check (
  bucket_id = 'professional-photos'
  and exists (
    select 1 from public.businesses b
    where b.id::text = (storage.foldername(name))[1]
      and b.owner_id = auth.uid()
  )
);

-- Update: idem
create policy "pp_owner_update"
on storage.objects for update
using (
  bucket_id = 'professional-photos'
  and exists (
    select 1 from public.businesses b
    where b.id::text = (storage.foldername(name))[1]
      and b.owner_id = auth.uid()
  )
);

-- Delete: idem (usuário pode trocar/remover foto)
create policy "pp_owner_delete"
on storage.objects for delete
using (
  bucket_id = 'professional-photos'
  and exists (
    select 1 from public.businesses b
    where b.id::text = (storage.foldername(name))[1]
      and b.owner_id = auth.uid()
  )
);
