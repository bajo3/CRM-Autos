-- =============================================================
-- 02_stock — Vehículos y entidades asociadas
-- =============================================================

create type estado_vehiculo as enum (
  'disponible','en_preparacion','publicado','no_publicado',
  'pausado','reservado','en_negociacion','vendido','consignado'
);
create type titularidad_vehiculo as enum ('propio','consignado','tercero');
create type combustible as enum ('nafta','diesel','gnc','hibrido','electrico');
create type transmision as enum ('manual','automatica');
create type estado_documental as enum ('completo','incompleto','pendiente','observado');
create type tipo_doc_vehiculo as enum (
  'cedula','titulo','vtv','seguro','verificacion_policial',
  'informe_dominio','libre_deuda','manuales','segunda_llave','comprobantes'
);
create type tipo_gasto as enum (
  'lavado','detailing','mecanica','cubiertas','bateria','gestoria',
  'verificacion_policial','vtv','publicidad','traslado','reparaciones','otros'
);

create table public.vehiculo (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresa(id) on delete cascade,
  marca         text not null,
  modelo        text not null,
  version       text,
  anio          int,
  kilometros    int,
  patente       text,
  ultimo_digito text generated always as (substring(upper(patente) from '([0-9])[^0-9]*$')) stored,
  chasis        text,
  motor         text,
  color         text,
  combustible   combustible,
  transmision   transmision,
  precio_venta  numeric(14,2),
  precio_costo  numeric(14,2),
  margen_estimado numeric(14,2) generated always as (coalesce(precio_venta,0) - coalesce(precio_costo,0)) stored,
  ubicacion     text,
  estado        estado_vehiculo not null default 'disponible',
  titularidad   titularidad_vehiculo not null default 'propio',
  estado_documental estado_documental not null default 'pendiente',
  observaciones text,
  fecha_ingreso date default now(),
  -- Publicaciones
  publicado_web   boolean not null default false,
  publicado_ml    boolean not null default false,
  publicado_redes boolean not null default false,
  destacado       boolean not null default false,
  ocultar_precio  boolean not null default false,
  mostrar_financiacion boolean not null default true,
  mostrar_whatsapp boolean not null default true,
  slug_publico    text,
  ml_link         text,
  ml_estado       text,
  ml_fecha_pub    date,
  -- Checklists (jsonb de items -> bool). Ver FUNCIONES_CRM.md.
  checklist_ingreso jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_vehiculo_empresa on public.vehiculo(empresa_id);
create index idx_vehiculo_estado on public.vehiculo(empresa_id, estado);

create table public.foto_vehiculo (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  vehiculo_id uuid not null references public.vehiculo(id) on delete cascade,
  url         text not null,
  orden       int not null default 0,
  es_principal boolean not null default false,
  created_at  timestamptz not null default now()
);
create index idx_foto_vehiculo on public.foto_vehiculo(vehiculo_id);

create table public.documento_vehiculo (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  vehiculo_id uuid not null references public.vehiculo(id) on delete cascade,
  tipo        tipo_doc_vehiculo not null,
  tiene       boolean not null default false,
  archivo_url text,
  observaciones text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_doc_vehiculo on public.documento_vehiculo(vehiculo_id);

create table public.gasto_vehiculo (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  vehiculo_id uuid not null references public.vehiculo(id) on delete cascade,
  tipo        tipo_gasto not null default 'otros',
  fecha       date not null default now(),
  concepto    text,
  monto       numeric(14,2) not null default 0,
  responsable text,
  comprobante_url text,
  observaciones text,
  created_at  timestamptz not null default now()
);
create index idx_gasto_vehiculo on public.gasto_vehiculo(vehiculo_id);

create trigger trg_vehiculo_updated before update on public.vehiculo
  for each row execute function public.set_updated_at();
create trigger trg_doc_vehiculo_updated before update on public.documento_vehiculo
  for each row execute function public.set_updated_at();

-- RLS uniforme por empresa
do $$
declare t text;
begin
  foreach t in array array['vehiculo','foto_vehiculo','documento_vehiculo','gasto_vehiculo'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select using (empresa_id = public.auth_empresa_id())', t||'_sel', t);
    execute format('create policy %I on public.%I for insert with check (empresa_id = public.auth_empresa_id())', t||'_ins', t);
    execute format('create policy %I on public.%I for update using (empresa_id = public.auth_empresa_id()) with check (empresa_id = public.auth_empresa_id())', t||'_upd', t);
    execute format('create policy %I on public.%I for delete using (empresa_id = public.auth_empresa_id())', t||'_del', t);
  end loop;
end$$;
