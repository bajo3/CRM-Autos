-- =============================================================
-- 12_storage_catalogos — Bucket público de catálogos PDF.
-- Path: {empresa_id}/{catalogo_id}.pdf
-- Público: el link se comparte por WhatsApp a clientes (sin sesión).
-- =============================================================

insert into storage.buckets (id, name, public)
values ('catalogos', 'catalogos', true)
on conflict (id) do nothing;

-- Lectura pública (se comparte el link).
create policy "catalogos_public_read" on storage.objects
  for select using (bucket_id = 'catalogos');

-- Subir / borrar: solo la carpeta de la propia empresa.
create policy "catalogos_insert" on storage.objects
  for insert with check (
    bucket_id = 'catalogos'
    and (storage.foldername(name))[1] = public.auth_empresa_id()::text
  );

create policy "catalogos_delete" on storage.objects
  for delete using (
    bucket_id = 'catalogos'
    and (storage.foldername(name))[1] = public.auth_empresa_id()::text
  );
