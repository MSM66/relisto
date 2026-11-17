-- Fotos: armario privado (solo su dueño) y vitrina pública (solo lectura para todos).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wardrobe', 'wardrobe', false, 3145728, array['image/jpeg','image/png','image/webp']),
       ('listings', 'listings', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "armario: fotos propias leer" on storage.objects;
create policy "armario: fotos propias leer" on storage.objects for select to authenticated
  using (bucket_id in ('wardrobe', 'listings') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "armario: fotos propias subir" on storage.objects;
create policy "armario: fotos propias subir" on storage.objects for insert to authenticated
  with check (bucket_id in ('wardrobe', 'listings') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "armario: fotos propias cambiar" on storage.objects;
create policy "armario: fotos propias cambiar" on storage.objects for update to authenticated
  using (bucket_id in ('wardrobe', 'listings') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "armario: fotos propias borrar" on storage.objects;
create policy "armario: fotos propias borrar" on storage.objects for delete to authenticated
  using (bucket_id in ('wardrobe', 'listings') and (storage.foldername(name))[1] = auth.uid()::text);
