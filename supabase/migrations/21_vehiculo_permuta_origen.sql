alter table public.vehiculo
  add column if not exists permuta_origen_id uuid references public.permuta(id);
