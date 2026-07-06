-- =============================================================
-- 23_autorizacion_conducir — nuevo tipo de documento comercial:
-- autorización del titular para que un tercero conduzca el vehículo.
-- Aditivo: solo agrega un valor al enum existente.
-- =============================================================

-- ALTER TYPE ... ADD VALUE no puede correr dentro de una transacción con
-- otros comandos en Postgres viejo. Se deja como único statement del archivo
-- y se usa IF NOT EXISTS para que sea idempotente / re-ejecutable.
alter type tipo_doc_comercial add value if not exists 'autorizacion_conducir';
