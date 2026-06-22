-- =============================================================
-- 01_core_multitenant
-- Núcleo multiempresa: empresa, usuarios (profile), roles,
-- helper de aislamiento y RLS base.
-- =============================================================

create extension if not exists "pgcrypto";

-- ---------- Enums núcleo ----------
create type rol_usuario as enum (
  'dueno', 'encargado', 'vendedor', 'administrativo', 'gestoria', 'solo_lectura'
);

-- ---------- Empresa (tenant) ----------
create table public.empresa (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  slug          text unique not null,
  cuit          text,
  telefono      text,
  email         text,
  direccion     text,
  localidad     text,
  provincia     text default 'Buenos Aires',
  logo_url      text,
  color_primario text default '#1e3a8a',
  -- Configuración de jurisdicción VTV (calendario por último dígito de patente).
  -- Default: Provincia de Buenos Aires. Configurable por empresa.
  vtv_calendario jsonb not null default
    '{"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"0":10,"1":11}'::jsonb,
  activa        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- Profile (usuario de aplicación, 1:1 con auth.users) ----------
create table public.profile (
  id          uuid primary key references auth.users(id) on delete cascade,
  empresa_id  uuid references public.empresa(id) on delete cascade,
  nombre      text not null default '',
  apellido    text not null default '',
  email       text,
  telefono    text,
  rol         rol_usuario not null default 'vendedor',
  -- Override de permisos finos a futuro (se documenta en DECISIONES_TECNICAS.md).
  permisos    jsonb not null default '{}'::jsonb,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Helper de aislamiento ----------
-- Devuelve el empresa_id del usuario autenticado. SECURITY DEFINER para
-- evitar recursión de RLS al leer profile dentro de las policies.
create or replace function public.auth_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select empresa_id from public.profile where id = auth.uid()
$$;

create or replace function public.auth_rol()
returns rol_usuario
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.profile where id = auth.uid()
$$;

-- ---------- updated_at trigger genérico ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

-- ---------- Creación automática de profile al registrarse ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile (id, email, nombre, apellido, empresa_id, rol)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellido', ''),
    (new.raw_user_meta_data->>'empresa_id')::uuid,
    coalesce((new.raw_user_meta_data->>'rol')::rol_usuario, 'vendedor')
  )
  on conflict (id) do nothing;
  return new;
end$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RLS empresa + profile ----------
alter table public.empresa enable row level security;
alter table public.profile enable row level security;

-- Empresa: el usuario solo ve / edita su propia empresa.
create policy "empresa_select" on public.empresa
  for select using (id = public.auth_empresa_id());
create policy "empresa_update" on public.empresa
  for update using (id = public.auth_empresa_id() and public.auth_rol() = 'dueno');

-- Profile: ve a colegas de su empresa; edita su propio registro;
-- dueño/encargado pueden gestionar usuarios de la empresa.
create policy "profile_select_own_empresa" on public.profile
  for select using (
    id = auth.uid() or empresa_id = public.auth_empresa_id()
  );
create policy "profile_insert_admin" on public.profile
  for insert with check (
    empresa_id = public.auth_empresa_id()
    and public.auth_rol() in ('dueno', 'encargado')
  );
create policy "profile_update_self_or_admin" on public.profile
  for update using (
    id = auth.uid()
    or (empresa_id = public.auth_empresa_id() and public.auth_rol() in ('dueno', 'encargado'))
  );

create trigger trg_empresa_updated before update on public.empresa
  for each row execute function public.set_updated_at();
create trigger trg_profile_updated before update on public.profile
  for each row execute function public.set_updated_at();
