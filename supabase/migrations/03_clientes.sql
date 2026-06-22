-- =============================================================
-- 03_clientes — Clientes/Leads, seguimientos, consultas, encargos
-- =============================================================

create type origen_lead as enum (
  'whatsapp','instagram','facebook','mercadolibre','web','referido','presencial','otro'
);
create type estado_lead as enum (
  'nuevo','contactado','interesado','agendo_visita','visito_agencia',
  'pidio_financiacion','reservado','vendido','perdido'
);
create type estado_seguimiento as enum ('pendiente','realizado','vencido','cancelado');
create type estado_encargo as enum ('buscando','unidad_encontrada','ofrecido','cerrado','perdido');
create type urgencia as enum ('baja','media','alta');

create table public.cliente (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresa(id) on delete cascade,
  nombre        text not null,
  apellido      text,
  telefono      text,
  whatsapp      text,
  email         text,
  dni_cuit      text,
  localidad     text,
  origen        origen_lead not null default 'otro',
  estado        estado_lead not null default 'nuevo',
  vendedor_id   uuid references public.profile(id) on delete set null,
  vehiculo_interes_id uuid references public.vehiculo(id) on delete set null,
  presupuesto_aprox numeric(14,2),
  observaciones text,
  proximo_seguimiento date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_cliente_empresa on public.cliente(empresa_id);
create index idx_cliente_estado on public.cliente(empresa_id, estado);
create index idx_cliente_vendedor on public.cliente(vendedor_id);

create table public.seguimiento (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  cliente_id  uuid not null references public.cliente(id) on delete cascade,
  vendedor_id uuid references public.profile(id) on delete set null,
  fecha       date not null default now(),
  hora        time,
  motivo      text,
  estado      estado_seguimiento not null default 'pendiente',
  notas       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_seguimiento_empresa on public.seguimiento(empresa_id);
create index idx_seguimiento_fecha on public.seguimiento(empresa_id, fecha, estado);

-- Consulta = relación cliente <-> auto (quién consultó qué unidad)
create table public.consulta (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  cliente_id  uuid not null references public.cliente(id) on delete cascade,
  vehiculo_id uuid not null references public.vehiculo(id) on delete cascade,
  canal       origen_lead,
  fecha       timestamptz not null default now(),
  pendiente   boolean not null default true,
  notas       text
);
create index idx_consulta_vehiculo on public.consulta(vehiculo_id);
create index idx_consulta_cliente on public.consulta(cliente_id);

create table public.encargo (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresa(id) on delete cascade,
  cliente_id    uuid references public.cliente(id) on delete set null,
  marca_buscada text,
  modelo_buscado text,
  anio_min      int,
  anio_max      int,
  km_max        int,
  presupuesto_max numeric(14,2),
  caja          transmision,
  combustible   combustible,
  color_preferido text,
  toma_usado    boolean not null default false,
  urgencia      urgencia not null default 'media',
  estado        estado_encargo not null default 'buscando',
  vendedor_id   uuid references public.profile(id) on delete set null,
  observaciones text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_encargo_empresa on public.encargo(empresa_id, estado);

create trigger trg_cliente_updated before update on public.cliente
  for each row execute function public.set_updated_at();
create trigger trg_seguimiento_updated before update on public.seguimiento
  for each row execute function public.set_updated_at();
create trigger trg_encargo_updated before update on public.encargo
  for each row execute function public.set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['cliente','seguimiento','consulta','encargo'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select using (empresa_id = public.auth_empresa_id())', t||'_sel', t);
    execute format('create policy %I on public.%I for insert with check (empresa_id = public.auth_empresa_id())', t||'_ins', t);
    execute format('create policy %I on public.%I for update using (empresa_id = public.auth_empresa_id()) with check (empresa_id = public.auth_empresa_id())', t||'_upd', t);
    execute format('create policy %I on public.%I for delete using (empresa_id = public.auth_empresa_id())', t||'_del', t);
  end loop;
end$$;
