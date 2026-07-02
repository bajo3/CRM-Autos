-- =============================================================
-- 14_presupuesto_estructura — Presupuestos como entidad real:
-- estado comercial + desglose financiero (anticipo, cuotas, gastos,
-- bonificación). Aditivo y NO destructivo: solo agrega tipo y columnas.
-- La RLS por empresa ya existe (migración 05).
-- =============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_presupuesto') then
    create type estado_presupuesto as enum
      ('borrador', 'enviado', 'aceptado', 'rechazado', 'vencido');
  end if;
end $$;

alter table public.presupuesto
  add column if not exists estado          estado_presupuesto not null default 'borrador',
  add column if not exists anticipo        numeric(14,2),
  add column if not exists cantidad_cuotas int,
  add column if not exists valor_cuota     numeric(14,2),
  add column if not exists bonificacion    numeric(14,2),
  add column if not exists gastos          numeric(14,2),
  add column if not exists updated_at       timestamptz not null default now();

create index if not exists idx_presupuesto_estado
  on public.presupuesto(empresa_id, estado);
