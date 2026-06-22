-- =============================================================
-- 10_hardening_storage_funcs — Advisors de seguridad (Fase 2)
-- =============================================================

-- El bucket 'vehiculos' es público: las imágenes se sirven por URL pública
-- sin necesidad de una policy SELECT. Quitarla evita el listado del bucket.
drop policy if exists "veh_fotos_public_read" on storage.objects;

-- Los helpers de tenant los necesita 'authenticated' (los usan las policies RLS),
-- pero el grant por defecto a PUBLIC también los expone a 'anon'.
-- Revocamos de PUBLIC y concedemos solo a authenticated.
revoke execute on function public.auth_empresa_id() from public;
revoke execute on function public.auth_rol() from public;
grant execute on function public.auth_empresa_id() to authenticated;
grant execute on function public.auth_rol() to authenticated;
