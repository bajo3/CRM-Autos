# Changelog

Formato: por fecha. Cada entrada registra qué se tocó, qué cambió y por qué.

## 2026-06-15 — Etapa 12 (en curso): Historial, seguridad y pulido

### Historial de cambios (auditoría)
- `src/lib/data/historial.ts` (`registrarCambio`, nunca lanza): inserta en `historial_cambio` con empresa + usuario. Enganchado en: **cambio de precio** y **cambio de estado** (`actualizarAuto`), **baja de vehículo** (`eliminarAuto`) y **venta registrada** (`crearVenta`, sobre el vehículo y la venta).
- **Visor** en la ficha del vehículo (`/stock/[id]`): línea de tiempo con acción, detalle (precio/estado antes→después), fecha y usuario.

### Seguridad — chequeos críticos en la base (migración `15_hardening_roles`)
- **DELETE** de `vehiculo`, `cliente` y `venta` restringido por **RLS** a `dueno`/`encargado` (antes solo se chequeaba en la app).
- Trigger `enforce_precio_rol` en `vehiculo`: bloquea el cambio de `precio_venta` si el rol autenticado no es dueño/encargado. En contexto sin sesión (jobs/migraciones/service_role) `auth_rol()` es NULL y no aplica. Verificado.

### Pulido UX
- Páginas propias: **error** (`(app)/error.tsx`, con reintentar), **404** (`not-found.tsx` raíz + `(app)/not-found.tsx`) y **skeleton de carga** (`(app)/loading.tsx`).

### Verificación
- ✅ build (39 páginas) · ✅ lint · ✅ typecheck (0 errores). En producción: `/p/no-existe` renderiza la 404 propia (404), trigger de precio y update de servicio probados en la base.
- _Pendiente de la etapa:_ importación CSV de stock/clientes.

---

## 2026-06-15 — Etapa 11: Reportes, comisiones y exportación

### Reportes (`/reportes`)
- Reemplaza el placeholder. Filtro por rango de fechas (default: mes actual) + **KPIs** (ventas, facturación, ticket promedio, valor de inventario), **ranking de vendedores** (cantidad/facturación/margen), breakdown **por forma de pago** y **stock por estado**. La rentabilidad (margen bruto/neto descontando gastos de los autos vendidos) se muestra solo con `margenes.ver`. Agregaciones en `src/lib/data/reportes.ts` (se traen filas y se agregan en JS; volumen chico por empresa).

### Comisiones (`/comisiones`)
- Reemplaza el placeholder. Por cada venta se calcula la comisión **fija** o **por porcentaje** sobre `precio_final`; estado de pago (pendiente/pagada), **totales por vendedor** y de liquidación (pendiente vs. pagado). Una comisión por venta (se reemplaza al recalcular). Acciones `crearComision`/`marcarPagada`/`marcarPendiente`/`eliminarComision`, gateadas por `margenes.ver`; la vista por `reportes.ver`.

### Exportación CSV
- Route handler `/reportes/export?tipo=ventas|stock|clientes`: CSV con **BOM** y separador `;` para que Excel es-AR lo abra bien. Respeta RLS y oculta el costo a quien no tiene `costos.ver`. Botones de descarga en `/reportes`.

### Verificación
- ✅ build (37 páginas) · ✅ lint · ✅ typecheck (0 errores). En producción: `/reportes`, `/comisiones` y `/reportes/export` existen y quedan protegidas (307→login).

---

## 2026-06-15 — Etapa 10: Publicaciones + MercadoLibre + página pública

### Deploy en Vercel
- El CRM se publicó en **Vercel** (proyecto `crm-autos`, dominio **https://crm-autos-tan.vercel.app**), necesario para que MercadoLibre pueda redirigir el OAuth y enviar webhooks a una URL HTTPS estable. Se eliminó un proyecto Vercel `crm-autos` viejo (v1 abandonada). Env vars de Supabase + ML cargadas (encriptadas) en producción.

### Integración MercadoLibre (migración `13_mercadolibre`)
- **OAuth**: `src/lib/mercadolibre/` (config/state/oauth/client/cuenta). Conexión por empresa con `state` firmado (HMAC), intercambio de `code`, **refresh automático** del token. Tokens en `ml_cuenta` (1×empresa, RLS). Callback `/api/mercadolibre/callback`.
- **Webhook** `/api/mercadolibre/notifications`: registra cada aviso en `ml_notificacion` vía función `SECURITY DEFINER ml_registrar_notificacion` (el webhook llega sin sesión). Verificado end-to-end. Ruta pública en el middleware.
- **Acciones contra la API real** (`/publicaciones/actions.ts`): publicar (categoría predicha + atributos del vehículo), pausar, activar, finalizar, sincronizar estados. Los errores de ML se persisten en `publicacion.mensaje` y se muestran en el panel para iterar.
- Se amplió `publicacion` (`ml_item_id`, `permalink`, `titulo`, `precio`, `mensaje`, `datos`) + índice único `(vehiculo_id, canal)`.

### Panel de publicaciones (`/publicaciones`)
- Reemplaza el placeholder. Tarjeta de conexión ML (conectar/desconectar/sincronizar + cuenta conectada), link a la página pública, y tabla de stock con **estado por canal** (web / redes / MercadoLibre) y sus acciones. Web/redes via flags `vehiculo.publicado_web/redes`.

### Página pública de stock (migración `14_stock_publico`)
- `/p/[slug]` sin login: header con datos/colores de la empresa + grilla de unidades publicadas (`publicado_web`) con foto, specs, precio (respeta `ocultar_precio`) y WhatsApp. Lectura vía función `SECURITY DEFINER stock_publico` (expone solo columnas públicas de empresas activas; evita el bloqueo de RLS para anónimos).

### Verificación
- ✅ build (44 rutas) · ✅ lint · ✅ typecheck (0 errores). En producción: webhook 200 (POST registra fila), `/p/jesus-diaz` 200 con stock, `/publicaciones` protegida (307→login), `/p/inexistente` 404. _Falta probar la creación real de ítems en ML con una cuenta conectada._

---

## 2026-06-15 — Etapa 9: Catálogo PDF y WhatsApp

### Catálogo
- Motor `src/lib/pdf/catalogo.ts`: catálogo de stock A4 con portada (logo/datos de empresa) + fichas de vehículo (foto principal, specs y precio), 3 por página, paginado. Embebe la foto principal de cada unidad (placeholder si no hay).
- Módulo `/catalogos`: filtro por estado/búsqueda, **selección de unidades con checkboxes**, nombre del catálogo y generación. **Historial** con abrir / compartir por WhatsApp / eliminar. Reemplaza el placeholder.
- Bucket **público** `catalogos` (migración `12_storage_catalogos`): el PDF se sube a `{empresa_id}/{catalogo_id}.pdf` y se comparte por **URL pública** (es material de marketing, sin datos personales).

### WhatsApp
- `src/lib/data/whatsapp.ts`: helper `waUrl` + plantillas (`mensajeCatalogo`, `mensajeVehiculo`, `PLANTILLAS_WA`). El catálogo se comparte con un wa.me que prellena el mensaje con el nombre de la agencia y el link.

### Verificación
- ✅ build · ✅ lint · ✅ typecheck (0 errores). Migración `12` aplicada en Supabase.

---

## 2026-06-15 — Etapa 8: Documentos PDF (cierre)

### Plantillas restantes
- Se agregaron al motor `src/lib/pdf/documento.ts` los 6 documentos faltantes: **datero**, **ficha de cliente**, **ficha de vehículo** y **autorizaciones** de **test drive**, **entrega** y **retiro de documentación**. Total: **10 tipos**. Firmas condicionales por tipo (recibos/boleto: vendedor/comprador; autorizaciones: agencia/autorizado; fichas/datero/presupuesto: sin firma).
- `DatosDocumento` ampliado: cliente (email, estado, origen, vendedor, presupuesto), vehículo (versión, precio, estado, combustible, transmisión, ubicación, ingreso), `autorizado` (nombre/DNI/licencia) y `fecha_evento`.

### Generación contextual y acceso
- **Ficha de cliente**: tarjeta Documentos con generación de **ficha de cliente** y **datero** + lista de documentos del cliente.
- **Ficha de vehículo**: tarjeta Documentos con generación de **ficha de vehículo** + lista de documentos del auto.
- **Ficha de venta**: se sumaron **autorización de entrega** y **autorización de retiro de documentación**.
- **/documentos**: nuevo formulario de **autorización de prueba de manejo** (vehículo + datos del conductor).

### Verificación
- ✅ build · ✅ lint · ✅ typecheck (0 errores).

---

## 2026-06-15 — Etapa 8: Documentos PDF (núcleo)

### Motor pdf-lib
- Dependencia **pdf-lib**. Motor `src/lib/pdf/documento.ts`: genera **recibo de seña**, **recibo de pago**, **boleto de compraventa** y **presupuesto** en PDF A4, con encabezado de empresa (logo + datos fiscales), autocompletado de cliente/vehículo/operación, montos, cláusulas y firmas. Sanitiza texto a WinAnsi para no romper el render.

### Numeración y almacenamiento (migración `11_documentos`)
- Tabla `documento_secuencia` + trigger `asignar_numero_documento`: **numeración correlativa por empresa y tipo** (`00001`, `00002`, …, independiente por tipo). Verificado en la base real.
- **Bucket privado `documentos`** (RLS por empresa). Los PDF se suben a `{empresa_id}/{doc_id}.pdf` y se abren por **URL firmada** temporal vía route handler `/documentos/[id]/abrir`.

### Aplicación
- **Módulo `/documentos`**: listado de documentos generados (N.º, tipo, cliente, vehículo, fecha, abrir) + formulario de **alta de presupuesto** (cliente/vehículo/precio/financiación/permuta/validez). Reemplaza el placeholder.
- **Ficha de venta**: tarjeta **Documentos** con botones para generar recibo de seña, recibo de pago y boleto (acción `generarDocumentoVenta`).
- **Permisos**: generación gateada por `documentos.generar`.
- **Reemplazo**: se eliminó el recibo HTML provisional de la Etapa 6 (`(print)/recibo/...` + `PrintButton`); ahora el recibo es PDF numerado, como preveía el roadmap.

### Verificación
- ✅ build (37 rutas) · ✅ lint (sin warnings) · ✅ typecheck (0 errores) · ✅ trigger de numeración probado contra Supabase (y limpiado).

---

## 2026-06-15 — Cierre de Etapas 4, 6 y 7

### Clientes (Etapa 4, completa)
- **Historial de contacto cronológico unificado** en la ficha del cliente: una sola línea de tiempo que une alta, seguimientos, consultas, ventas y reservas, ordenada por fecha. _Por qué:_ el vendedor necesita ver toda la relación con el cliente de un vistazo, no repartida en tarjetas.
- **Registrar contacto**: formulario rápido que carga un seguimiento ya realizado (motivo + notas + fecha) → acción `registrarContacto`.

### Ventas (Etapa 6, completa)
- **Ficha de venta** `/ventas/[id]`: detalle de la operación + **checklist de entrega editable** (10 ítems en `venta.checklist_entrega`, con progreso N/total) + selector de estado de entrega. Acción `actualizarEntrega` (gate `ventas.crear`). Definición compartida en `src/lib/data/checklist.ts`.
- **Recibo de seña/venta** imprimible `/recibo/venta/[id]` (route group `(print)` con layout propio sin sidebar; botón Imprimir/PDF del navegador). Detecta seña vs pago total según el saldo. _Nota:_ el motor de plantillas PDF (pdf-lib, numeración, guardado en ficha) es la Etapa 8.
- Listado de ventas con filas enlazadas a la ficha.

### VTV (Etapa 7, completa)
- Helper `src/lib/data/vtv.ts`: `calcularVtv()` (último dígito + mes sugerido + `fecha_vencimiento` desde `empresa.vtv_calendario`), `estadoPorVencimiento()` y severidad `vtvSeveridad()` (7/30/60 días).
- **Alta de VTV desde la ficha del vehículo**: patente prellenada; si no se carga fecha, se calcula. Acción `crearVtv`.
- **Alertas 30/7 días diferenciadas** por color en el listado de VTV y en la tarjeta VTV de la ficha del vehículo.

### Verificación
- ✅ build (34 rutas) · ✅ lint (sin warnings) · ✅ typecheck (0 errores). Sin migraciones nuevas (usa columnas ya existentes: `venta.checklist_entrega`, `seguimiento.notas`, `empresa.vtv_calendario`).

---

## 2026-06-13 — Fase 2: operación comercial (Etapas 3–6)

### Stock (Etapa 3, completa)
- **Edición y baja** de vehículos: `VehiculoForm` reutilizable (alta + edición), acciones `crear/actualizar/eliminar` con permisos, ruta `/stock/[id]/editar`, botón de baja con confirmación.
- **Fotos**: bucket `vehiculos` en Supabase Storage con policies por empresa (migración `08_storage_vehiculos`). Componente `FotosManager` (subida múltiple, galería, marcar principal, eliminar).
- **Gastos**: alta y baja desde la ficha del vehículo.
- **Documentación**: selector de estado documental editable en la ficha.

### Clientes y seguimientos (Etapa 4)
- **Clientes**: `ClienteForm` reutilizable, alta/edición, ficha `/clientes/[id]` con historial (seguimientos, consultas, ventas, reservas).
- **Consultas** (cliente↔auto): alta desde la ficha del cliente.
- **Seguimientos**: agendar desde la ficha del cliente; acciones "marcar realizado/cancelar" en el listado.

### Encargos (Etapa 5)
- Alta de encargos (`EncargoForm`).
- **Matching automático**: helper `matchEncargosParaVehiculo`; la ficha del auto muestra una alerta verde con los encargos activos compatibles (marca/modelo/año/km/presupuesto) y acceso directo a WhatsApp.

### Ventas, reservas y jobs (Etapa 6)
- **Ventas**: alta (`VentaForm`). Al guardar: con crédito genera el registro de `credito` con cuotas; en efectivo agenda `postventa` a 6 meses; el auto pasa a `vendido`.
- **Reservas**: alta (`ReservaForm`); el auto pasa a `reservado`.
- **Jobs automáticos** (migración `09_jobs` + **pg_cron** diario 09:00): seguimientos→vencido, reservas→vencida, estados de VTV (60/vencida/vigente), créditos (avance de cuota + alerta anteúltima `por_terminar`).

### Verificación
- ✅ build · ✅ lint · ✅ typecheck (0 errores). Jobs ejecutados y verificados sobre datos demo.

---

## 2026-06-13 — Arranque del proyecto (Etapas 1, 2 y base de 3)

### Infraestructura
- **Scaffold** Next.js 14 (App Router) + TypeScript strict + Tailwind + ESLint. _Por qué:_ stack acordado (ver DECISIONES_TECNICAS DT-001).
- **Clientes Supabase** SSR: `src/lib/supabase/{client,server,middleware}.ts`. Middleware que protege rutas y refresca sesión.
- **Upgrade** de `@supabase/supabase-js` y `@supabase/ssr` a última versión. _Por qué:_ las versiones viejas colapsaban los tipos de las queries a `never` con el formato de tipos actual (DT-007).

### Base de datos (Supabase, 7 migraciones)
- `01_core_multitenant`: `empresa`, `profile`, enum `rol_usuario`, helpers `auth_empresa_id()`/`auth_rol()`, trigger `handle_new_user`, RLS núcleo. _Por qué:_ aislamiento multitenant (DT-002, DT-003).
- `02_stock`: `vehiculo` (+ columnas generadas `ultimo_digito`, `margen_estimado`), `foto_vehiculo`, `documento_vehiculo`, `gasto_vehiculo` + enums + RLS.
- `03_clientes`: `cliente`, `seguimiento`, `consulta`, `encargo` + enums + RLS.
- `04_ventas`: `venta` (saldo generado), `credito`, `postventa`, `reserva`, `permuta`, `tasacion`, `comision`, `consignacion` + enums + RLS.
- `05_docs_vtv_postventa`: `vtv`, `documento_comercial`, `test_drive`, `presupuesto`, `catalogo_pdf`, `publicacion`, `garantia`, `reclamo`, `taller_trabajo`, `historial_cambio` + enums + RLS.
- `06_hardening`: search_path fijo + revocaciones de EXECUTE según advisors (DT-009).
- `07_seed_demo`: Jesús Díaz Automotores + 4 usuarios + 5 autos + 5 clientes + encargo/reserva/venta/crédito/VTV/gastos.
- **Tipos TS** generados en `src/lib/types/database.types.ts`.

### Aplicación
- **Auth/Login** real con Supabase (server action `login`/`logout`).
- **App shell**: layout con sidebar (todos los módulos agrupados), topbar con usuario/rol y logout.
- **RBAC**: `src/lib/auth/permissions.ts` (matriz por rol + `can()`).
- **Dashboard** (`src/lib/data/dashboard.ts`): conteos y alertas reales.
- **Stock**: lista con filtros, ficha (specs/rentabilidad/interesados/gastos/VTV), alta con validación zod.
- **Clientes**: lista con filtros + WhatsApp.
- **Listados reales**: seguimientos, encargos, ventas, reservas, créditos, postventa, VTV, usuarios.
- **Placeholders honestos** para 14 módulos con estructura creada (DT-010).
- **UI primitives** propios: button, card, badge, input/select/textarea, table, empty-state, page-header.

### Verificación
- ✅ `npm run build` (30 rutas) · ✅ `npm run lint` · ✅ `npm run typecheck` (0 errores).
- ✅ Login del usuario demo verificado end-to-end contra Supabase Auth.
- ✅ `/` redirige a `/login` sin sesión (middleware).
