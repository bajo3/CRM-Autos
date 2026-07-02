-- Los buckets documentos/catalogos tenian policies de INSERT/SELECT/DELETE
-- pero NO de UPDATE en storage.objects. Cualquier upload con upsert:true
-- sobre un path ya existente (ej.: regenerar el PDF de un presupuesto)
-- hace un UPDATE y violaba RLS. Aditivo: solo agrega las dos policies
-- faltantes, mismo criterio (carpeta = empresa del usuario) que INSERT.
create policy documentos_update on storage.objects
  for update
  using (bucket_id = 'documentos' and (storage.foldername(name))[1] = (auth_empresa_id())::text)
  with check (bucket_id = 'documentos' and (storage.foldername(name))[1] = (auth_empresa_id())::text);

create policy catalogos_update on storage.objects
  for update
  using (bucket_id = 'catalogos' and (storage.foldername(name))[1] = (auth_empresa_id())::text)
  with check (bucket_id = 'catalogos' and (storage.foldername(name))[1] = (auth_empresa_id())::text);
