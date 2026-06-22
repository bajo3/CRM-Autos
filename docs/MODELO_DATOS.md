# Modelo de datos

PostgreSQL (Supabase). **28 tablas**, todas (excepto `empresa`) con columna `empresa_id` y **RLS** que filtra por la empresa del usuario autenticado.

## Principio multitenant

- Cada tabla de dominio tiene `empresa_id uuid not null references empresa(id)`.
- La función `auth_empresa_id()` (SECURITY DEFINER) devuelve el `empresa_id` del usuario actual leyendo su `profile`.
- Policies RLS uniformes por tabla: `using (empresa_id = auth_empresa_id())` para select/insert/update/delete.
- `empresa_id` se **denormaliza** en tablas hijas (ej. `foto_vehiculo`) para mantener las policies simples y rápidas.

## Núcleo

### empresa (tenant)
`id, nombre, slug, cuit, telefono, email, direccion, localidad, provincia, logo_url, color_primario, vtv_calendario (jsonb), activa, timestamps`
- `vtv_calendario`: mapa dígito→mes configurable por empresa (default Provincia de Buenos Aires).

### profile (usuario, 1:1 con auth.users)
`id (=auth.users.id), empresa_id, nombre, apellido, email, telefono, rol, permisos (jsonb), activo, timestamps`
- `rol`: enum `rol_usuario` (dueno, encargado, vendedor, administrativo, gestoria, solo_lectura).
- `permisos` jsonb: reservado para overrides finos a futuro.
- Trigger `handle_new_user` crea el profile automáticamente al registrarse, tomando `empresa_id` y `rol` de `raw_user_meta_data`.

## Stock

| Tabla | Campos destacados |
|-------|-------------------|
| **vehiculo** | marca, modelo, version, anio, kilometros, patente, `ultimo_digito` (generado), chasis, motor, color, combustible, transmision, precio_venta, precio_costo, `margen_estimado` (generado), ubicacion, estado, titularidad, estado_documental, fecha_ingreso, flags de publicación (web/ml/redes/destacado/ocultar_precio…), slug_publico, checklist_ingreso (jsonb) |
| **foto_vehiculo** | vehiculo_id, url, orden, es_principal |
| **documento_vehiculo** | vehiculo_id, tipo (cédula/título/vtv/seguro/…), tiene, archivo_url |
| **gasto_vehiculo** | vehiculo_id, tipo, fecha, concepto, monto, responsable, comprobante_url |

- `ultimo_digito` = último dígito de la patente (para cálculo de VTV).
- `margen_estimado` = `precio_venta - precio_costo` (columna generada).

## Comercial

| Tabla | Campos destacados |
|-------|-------------------|
| **cliente** | nombre, apellido, telefono, whatsapp, email, dni_cuit, localidad, origen, estado, vendedor_id, vehiculo_interes_id, presupuesto_aprox, proximo_seguimiento |
| **seguimiento** | cliente_id, vendedor_id, fecha, hora, motivo, estado, notas |
| **consulta** | cliente_id, vehiculo_id, canal, fecha, pendiente — relación N:M cliente↔auto |
| **encargo** | cliente_id, marca/modelo buscado, anio_min/max, km_max, presupuesto_max, caja, combustible, urgencia, estado, vendedor_id |

## Operaciones

| Tabla | Campos destacados |
|-------|-------------------|
| **venta** | cliente_id, vehiculo_id, vendedor_id, fecha_venta, precio_final, sena, `saldo` (generado), forma_pago, tiene_permuta, tiene_credito, estado_entrega, checklist_entrega (jsonb) |
| **credito** | venta_id, cantidad_cuotas, fecha_inicio, fecha_fin_estimada, cuota_actual, estado, alerta_disparada |
| **postventa** | venta_id, cliente_id, fecha_alerta (venta efectivo + 6 meses), realizada |
| **reserva** | cliente_id, vehiculo_id, monto_sena, fecha_reserva, vencimiento, medio_pago, recibo_url, estado |
| **permuta** | cliente_id, venta_id, datos del usado, valor_pretendido, valor_tasado, diferencia, estado |
| **tasacion** | cliente_id, descripcion, precio_compra/venta_estimado, gastos_estimados, margen_estimado, decision |
| **comision** | venta_id, vendedor_id, tipo (fija/porcentaje), valor, comision_calculada, estado, fecha_pago |
| **consignacion** | vehiculo_id, dueno_nombre/contacto, comision_acordada, precio_pretendido/minimo, autorizacion_venta, vencimiento, estado |

## Documentación / postventa

| Tabla | Campos destacados |
|-------|-------------------|
| **vtv** | vehiculo_id, patente, ultimo_digito, jurisdiccion, mes_sugerido, fecha_vencimiento, estado, comprobante_url |
| **documento_comercial** | tipo (boleto/recibo/datero/…), numero, cliente_id, vehiculo_id, venta_id, fecha_emision, datos (jsonb snapshot), pdf_url, created_by |
| **test_drive** | cliente_id, vehiculo_id, fecha, hora, conductor_nombre, dni, licencia, firma_url, autorizacion_pdf, obs previas/posteriores, estado |
| **presupuesto** | cliente_id, vehiculo_id, vendedor_id, precio, forma_pago, financiacion, permuta, validez, pdf_url |
| **catalogo_pdf** | nombre, filtros (jsonb), vehiculo_ids (uuid[]), pdf_url, created_by |
| **publicacion** | vehiculo_id, canal (web/ml/redes), estado, link, fecha_pub, fecha_update |
| **garantia** | vehiculo_id, cliente_id, tipo, duracion, fecha_inicio/fin, cubre, no_cubre |
| **reclamo** | cliente_id, vehiculo_id, fecha, motivo, responsable, estado, costo_asociado, resolucion |
| **taller_trabajo** | vehiculo_id, trabajo, responsable, taller_externo, costo_estimado/final, fechas, estado |
| **historial_cambio** | usuario_id, fecha, accion, entidad, entidad_id, valor_anterior/nuevo (jsonb) |

## Enums principales

`rol_usuario`, `estado_vehiculo`, `titularidad_vehiculo`, `combustible`, `transmision`, `estado_documental`, `tipo_doc_vehiculo`, `tipo_gasto`, `origen_lead`, `estado_lead`, `estado_seguimiento`, `estado_encargo`, `urgencia`, `forma_pago`, `estado_entrega`, `estado_credito`, `estado_reserva`, `estado_tasacion`, `decision_tasacion`, `tipo_comision`, `estado_comision`, `estado_consignacion`, `estado_vtv`, `tipo_doc_comercial`, `estado_test_drive`, `canal_publicacion`, `estado_publicacion`, `estado_reclamo`, `estado_taller`.

Definiciones exactas en `supabase/migrations/`. Tipos TS generados en `src/lib/types/database.types.ts`.
