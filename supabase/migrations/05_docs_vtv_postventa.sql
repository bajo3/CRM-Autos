-- =============================================================
-- 05_docs_vtv_postventa — VTV, documentos comerciales, test drive,
-- presupuestos, catálogos, publicaciones, garantías, reclamos,
-- taller, historial de cambios
-- =============================================================

create type estado_vtv as enum ('vigente','por_vencer','vencida','pendiente');
create type tipo_doc_comercial as enum (
  'boleto','recibo_sena','recibo_pago','presupuesto','datero',
  'autorizacion_test_drive','autorizacion_entrega','autorizacion_retiro_doc',
  'ficha_cliente','ficha_vehiculo'
);
create type estado_test_drive as enum ('agendado','realizado','cancelado','no_asistio');
create type canal_publicacion as enum ('web','mercadolibre','redes');
create type estado_publicacion as enum ('borrador','publicado','pausado','vendido');
create type estado_reclamo as enum ('nuevo','en_revision','en_taller','resuelto','rechazado');
create type estado_taller as enum ('pendiente','en_taller','listo_publicar','listo_entregar');

create table public.vtv (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  vehiculo_id uuid references public.vehiculo(id) on delete cascade,
  patente     text,
  ultimo_digito text,
  jurisdiccion text default 'Buenos Aires',
  mes_sugerido int,
  fecha_vencimiento date,
  estado      estado_vtv not null default 'pendiente',
  comprobante_url text,
  observaciones text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_vtv_empresa on public.vtv(empresa_id, fecha_vencimiento);

create table public.documento_comercial (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  tipo        tipo_doc_comercial not null,
  numero      text,                          -- numeración interna
  cliente_id  uuid references public.cliente(id) on delete set null,
  vehiculo_id uuid references public.vehiculo(id) on delete set null,
  venta_id    uuid references public.venta(id) on delete set null,
  fecha_emision date not null default now(),
  datos       jsonb not null default '{}'::jsonb,  -- snapshot autocompletado
  pdf_url     text,
  created_by  uuid references public.profile(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index idx_doccom_empresa on public.documento_comercial(empresa_id);

create table public.test_drive (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  cliente_id  uuid references public.cliente(id) on delete set null,
  vehiculo_id uuid references public.vehiculo(id) on delete set null,
  fecha       date,
  hora        time,
  conductor_nombre text,
  dni         text,
  licencia    text,
  telefono    text,
  firma_url   text,
  autorizacion_pdf text,
  obs_previas text,
  obs_posteriores text,
  estado      estado_test_drive not null default 'agendado',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_testdrive_empresa on public.test_drive(empresa_id);

create table public.presupuesto (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  cliente_id  uuid references public.cliente(id) on delete set null,
  vehiculo_id uuid references public.vehiculo(id) on delete set null,
  vendedor_id uuid references public.profile(id) on delete set null,
  precio      numeric(14,2),
  forma_pago  forma_pago,
  financiacion text,
  permuta     text,
  validez     date,
  observaciones text,
  pdf_url     text,
  created_at  timestamptz not null default now()
);
create index idx_presupuesto_empresa on public.presupuesto(empresa_id);

create table public.catalogo_pdf (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  nombre      text,
  filtros     jsonb not null default '{}'::jsonb,
  vehiculo_ids uuid[] not null default '{}',
  pdf_url     text,
  created_by  uuid references public.profile(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index idx_catalogo_empresa on public.catalogo_pdf(empresa_id);

create table public.publicacion (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  vehiculo_id uuid references public.vehiculo(id) on delete cascade,
  canal       canal_publicacion not null,
  estado      estado_publicacion not null default 'borrador',
  link        text,
  fecha_pub   date,
  fecha_update date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_publicacion_empresa on public.publicacion(empresa_id);

create table public.garantia (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  vehiculo_id uuid references public.vehiculo(id) on delete set null,
  cliente_id  uuid references public.cliente(id) on delete set null,
  tipo        text,
  duracion    text,
  fecha_inicio date,
  fecha_fin   date,
  cubre       text,
  no_cubre    text,
  created_at  timestamptz not null default now()
);
create index idx_garantia_empresa on public.garantia(empresa_id);

create table public.reclamo (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  cliente_id  uuid references public.cliente(id) on delete set null,
  vehiculo_id uuid references public.vehiculo(id) on delete set null,
  fecha       date not null default now(),
  motivo      text,
  responsable text,
  estado      estado_reclamo not null default 'nuevo',
  costo_asociado numeric(14,2),
  resolucion  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_reclamo_empresa on public.reclamo(empresa_id, estado);

create table public.taller_trabajo (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  vehiculo_id uuid references public.vehiculo(id) on delete set null,
  trabajo     text,
  responsable text,
  taller_externo text,
  costo_estimado numeric(14,2),
  costo_final    numeric(14,2),
  fecha_ingreso  date,
  fecha_salida_estimada date,
  estado      estado_taller not null default 'pendiente',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_taller_empresa on public.taller_trabajo(empresa_id, estado);

create table public.historial_cambio (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  usuario_id  uuid references public.profile(id) on delete set null,
  fecha       timestamptz not null default now(),
  accion      text not null,
  entidad     text,
  entidad_id  uuid,
  valor_anterior jsonb,
  valor_nuevo    jsonb
);
create index idx_historial_empresa on public.historial_cambio(empresa_id, fecha desc);

create trigger trg_vtv_updated before update on public.vtv for each row execute function public.set_updated_at();
create trigger trg_testdrive_updated before update on public.test_drive for each row execute function public.set_updated_at();
create trigger trg_publicacion_updated before update on public.publicacion for each row execute function public.set_updated_at();
create trigger trg_reclamo_updated before update on public.reclamo for each row execute function public.set_updated_at();
create trigger trg_taller_updated before update on public.taller_trabajo for each row execute function public.set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['vtv','documento_comercial','test_drive','presupuesto','catalogo_pdf','publicacion','garantia','reclamo','taller_trabajo','historial_cambio'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select using (empresa_id = public.auth_empresa_id())', t||'_sel', t);
    execute format('create policy %I on public.%I for insert with check (empresa_id = public.auth_empresa_id())', t||'_ins', t);
    execute format('create policy %I on public.%I for update using (empresa_id = public.auth_empresa_id()) with check (empresa_id = public.auth_empresa_id())', t||'_upd', t);
    execute format('create policy %I on public.%I for delete using (empresa_id = public.auth_empresa_id())', t||'_del', t);
  end loop;
end$$;
