-- Vincula la consignación a un cliente existente (opcional): evita re-tipear
-- nombre/contacto del dueño si ya es un cliente cargado en el CRM.
alter table consignacion add column if not exists cliente_id uuid references cliente(id) on delete set null;
create index if not exists idx_consignacion_cliente_id on consignacion(cliente_id);
