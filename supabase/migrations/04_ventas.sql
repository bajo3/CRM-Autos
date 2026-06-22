-- =============================================================
-- 04_ventas — Ventas, reservas, créditos, postventa, permutas,
-- tasaciones, comisiones, consignaciones
-- =============================================================

create type forma_pago as enum ('efectivo','transferencia','credito','mixto','permuta');
create type estado_entrega as enum ('pendiente','en_preparacion','listo','entregado');
create type estado_credito as enum ('activo','por_terminar','finalizado','cancelado');
create type estado_reserva as enum ('activa','vencida','caida','convertida');
create type estado_tasacion as enum ('pendiente','tasado','aceptado','rechazado','en_negociacion');
create type decision_tasacion as enum ('tomar','rechazar','consultar','negociar');
create type tipo_comision as enum ('fija','porcentaje');
create type estado_comision as enum ('pendiente','pagada','cancelada');
create type estado_consignacion as enum ('activa','vencida','vendida','retirada');

create table public.venta (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresa(id) on delete cascade,
  cliente_id    uuid references public.cliente(id) on delete set null,
  vehiculo_id   uuid references public.vehiculo(id) on delete set null,
  vendedor_id   uuid references public.profile(id) on delete set null,
  fecha_venta   date not null default now(),
  precio_final  numeric(14,2) not null default 0,
  sena          numeric(14,2) not null default 0,
  saldo         numeric(14,2) generated always as (coalesce(precio_final,0) - coalesce(sena,0)) stored,
  forma_pago    forma_pago not null default 'efectivo',
  tiene_permuta boolean not null default false,
  tiene_credito boolean not null default false,
  doc_pendiente text,
  estado_entrega estado_entrega not null default 'pendiente',
  checklist_entrega jsonb not null default '{}'::jsonb,
  observaciones text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_venta_empresa on public.venta(empresa_id, fecha_venta);

create table public.credito (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresa(id) on delete cascade,
  venta_id      uuid not null references public.venta(id) on delete cascade,
  cantidad_cuotas int not null default 12,
  fecha_inicio  date not null default now(),
  fecha_fin_estimada date,
  cuota_actual  int not null default 0,
  estado        estado_credito not null default 'activo',
  -- Avisar en la anteúltima cuota (cuota_actual = cantidad_cuotas - 1).
  alerta_disparada boolean not null default false,
  observaciones text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_credito_empresa on public.credito(empresa_id, estado);

create table public.postventa (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  venta_id    uuid references public.venta(id) on delete cascade,
  cliente_id  uuid references public.cliente(id) on delete set null,
  fecha_alerta date not null,           -- venta efectivo + 6 meses
  realizada   boolean not null default false,
  notas       text,
  created_at  timestamptz not null default now()
);
create index idx_postventa_empresa on public.postventa(empresa_id, fecha_alerta);

create table public.reserva (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  cliente_id  uuid references public.cliente(id) on delete set null,
  vehiculo_id uuid references public.vehiculo(id) on delete set null,
  monto_sena  numeric(14,2) not null default 0,
  fecha_reserva date not null default now(),
  vencimiento date,
  medio_pago  forma_pago,
  recibo_url  text,
  estado      estado_reserva not null default 'activa',
  observaciones text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_reserva_empresa on public.reserva(empresa_id, estado, vencimiento);

create table public.permuta (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  cliente_id  uuid references public.cliente(id) on delete set null,
  venta_id    uuid references public.venta(id) on delete set null,
  marca       text, modelo text, anio int, kilometros int, patente text,
  estado_general text,
  valor_pretendido numeric(14,2),
  valor_tasado     numeric(14,2),
  diferencia       numeric(14,2),
  estado      estado_tasacion not null default 'pendiente',
  observaciones text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_permuta_empresa on public.permuta(empresa_id);

create table public.tasacion (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  cliente_id  uuid references public.cliente(id) on delete set null,
  descripcion text,
  precio_compra_estimado numeric(14,2),
  precio_venta_estimado  numeric(14,2),
  gastos_estimados       numeric(14,2),
  margen_estimado        numeric(14,2),
  decision    decision_tasacion,
  observaciones text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_tasacion_empresa on public.tasacion(empresa_id);

create table public.comision (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  venta_id    uuid references public.venta(id) on delete cascade,
  vendedor_id uuid references public.profile(id) on delete set null,
  tipo        tipo_comision not null default 'porcentaje',
  valor       numeric(14,2) not null default 0,   -- monto fijo o % según tipo
  comision_calculada numeric(14,2),
  estado      estado_comision not null default 'pendiente',
  fecha_pago  date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_comision_empresa on public.comision(empresa_id, estado);

create table public.consignacion (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  vehiculo_id uuid references public.vehiculo(id) on delete set null,
  dueno_nombre text,
  dueno_contacto text,
  comision_acordada numeric(14,2),
  precio_pretendido numeric(14,2),
  precio_minimo     numeric(14,2),
  doc_recibida      text,
  autorizacion_venta boolean not null default false,
  vencimiento date,
  estado      estado_consignacion not null default 'activa',
  observaciones text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_consignacion_empresa on public.consignacion(empresa_id, estado);

create trigger trg_venta_updated before update on public.venta for each row execute function public.set_updated_at();
create trigger trg_credito_updated before update on public.credito for each row execute function public.set_updated_at();
create trigger trg_reserva_updated before update on public.reserva for each row execute function public.set_updated_at();
create trigger trg_permuta_updated before update on public.permuta for each row execute function public.set_updated_at();
create trigger trg_tasacion_updated before update on public.tasacion for each row execute function public.set_updated_at();
create trigger trg_comision_updated before update on public.comision for each row execute function public.set_updated_at();
create trigger trg_consignacion_updated before update on public.consignacion for each row execute function public.set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['venta','credito','postventa','reserva','permuta','tasacion','comision','consignacion'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select using (empresa_id = public.auth_empresa_id())', t||'_sel', t);
    execute format('create policy %I on public.%I for insert with check (empresa_id = public.auth_empresa_id())', t||'_ins', t);
    execute format('create policy %I on public.%I for update using (empresa_id = public.auth_empresa_id()) with check (empresa_id = public.auth_empresa_id())', t||'_upd', t);
    execute format('create policy %I on public.%I for delete using (empresa_id = public.auth_empresa_id())', t||'_del', t);
  end loop;
end$$;
