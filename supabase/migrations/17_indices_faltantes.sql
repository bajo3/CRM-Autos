-- Auditoria de indices: la ficha del vehiculo (bloques de hoy) filtra
-- reserva/presupuesto/taller_trabajo/documento_comercial por
-- vehiculo_id, y el dashboard (Centro de Accion Comercial) filtra
-- test_drive/encargo por columnas sin indice compuesto. Todo aditivo,
-- create index if not exists, no toca datos.

create index if not exists idx_reserva_vehiculo on public.reserva(vehiculo_id);
create index if not exists idx_presupuesto_vehiculo on public.presupuesto(vehiculo_id);
create index if not exists idx_taller_vehiculo on public.taller_trabajo(vehiculo_id);
create index if not exists idx_doccom_vehiculo on public.documento_comercial(vehiculo_id);
create index if not exists idx_doccom_cliente on public.documento_comercial(cliente_id);

-- Centro de Accion Comercial: test_drive agendados por fecha, y
-- encargos urgentes.
create index if not exists idx_testdrive_dashboard on public.test_drive(empresa_id, estado, fecha);
create index if not exists idx_encargo_urgencia on public.encargo(empresa_id, urgencia);
