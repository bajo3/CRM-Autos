alter table public.consignacion
  add column if not exists liquidado boolean not null default false,
  add column if not exists monto_liquidado numeric,
  add column if not exists fecha_liquidacion date;
