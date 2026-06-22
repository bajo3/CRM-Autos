-- =============================================================
-- 06_hardening — Atiende advisors de seguridad de Supabase.
-- Ver /docs/DECISIONES_TECNICAS.md (DT-009).
-- =============================================================

-- Fijar search_path en el trigger genérico de updated_at.
alter function public.set_updated_at() set search_path = public;

-- handle_new_user es un trigger; no debe ser invocable directo vía RPC.
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- Los helpers de tenant solo devuelven el empresa_id/rol del propio caller y son
-- requeridos por las policies RLS (deben quedar ejecutables por authenticated).
-- Revocamos solo a anon, que no tiene profile y no los necesita.
revoke execute on function public.auth_empresa_id() from anon;
revoke execute on function public.auth_rol() from anon;
