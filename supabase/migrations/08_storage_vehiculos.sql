-- =============================================================
-- 08_storage_vehiculos — Bucket de fotos de vehículos
-- Path: {empresa_id}/{vehiculo_id}/{archivo}
-- =============================================================

insert into storage.buckets (id, name, public)
values ('vehiculos', 'vehiculos', true)
on conflict (id) do nothing;

-- Lectura pública (las imágenes se muestran por URL pública).
create policy "veh_fotos_public_read" on storage.objects
  for select using (bucket_id = 'vehiculos');

-- Subir: solo a la carpeta de la propia empresa.
create policy "veh_fotos_insert" on storage.objects
  for insert with check (
    bucket_id = 'vehiculos'
    and (storage.foldername(name))[1] = public.auth_empresa_id()::text
  );

-- Borrar: solo archivos de la propia empresa.
create policy "veh_fotos_delete" on storage.objects
  for delete using (
    bucket_id = 'vehiculos'
    and (storage.foldername(name))[1] = public.auth_empresa_id()::text
  );
