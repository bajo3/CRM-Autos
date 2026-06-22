-- =============================================================
-- 13_pago_cuota — Historial estructurado de pagos de cuotas
-- =============================================================
-- PROPUESTA (NO aplicada todavía). Habilita guardar cada pago como
-- una fila (monto, fecha, observación, quién lo registró) en lugar de
-- solo avanzar credito.cuota_actual.
--
-- Mientras esta migración no se aplique, /creditos usa la "versión
-- segura mínima": avanza cuota_actual + estado y deja el detalle del
-- pago en credito.observaciones. Al aplicar esta tabla, la server
-- action `registrarPago` puede extenderse para insertar también acá.
--
-- Sigue el mismo patrón de RLS por empresa del resto del esquema
-- (ver 04_ventas.sql).
-- =============================================================

create table public.pago_cuota (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references public.empresa(id) on delete cascade,
  credito_id     uuid not null references public.credito(id) on delete cascade,
  numero_cuota   int not null,
  monto          numeric(14,2) not null default 0,
  fecha_pago     date not null default now(),
  observaciones  text,
  registrado_por uuid references public.profile(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index idx_pago_cuota_credito on public.pago_cuota(credito_id, numero_cuota);

alter table public.pago_cuota enable row level security;

create policy pago_cuota_sel on public.pago_cuota
  for select using (empresa_id = public.auth_empresa_id());
create policy pago_cuota_ins on public.pago_cuota
  for insert with check (empresa_id = public.auth_empresa_id());
create policy pago_cuota_upd on public.pago_cuota
  for update using (empresa_id = public.auth_empresa_id())
  with check (empresa_id = public.auth_empresa_id());
create policy pago_cuota_del on public.pago_cuota
  for delete using (empresa_id = public.auth_empresa_id());
