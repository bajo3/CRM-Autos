# Etapas de desarrollo

Trabajamos por etapas para no perder el norte. Cada etapa se cierra actualizando CHANGELOG, ESTADO_ACTUAL y PENDIENTES.

Leyenda: ✅ completa · 🟡 en curso · ⬜ pendiente

---

## ✅ Etapa 1 — Base del proyecto
- [x] Revisar stack actual (proyecto vacío → greenfield).
- [x] Ordenar estructura (Next.js App Router, `src/`).
- [x] Crear documentación (`/docs` + README).
- [x] Layout general + navegación principal (sidebar con todos los módulos).
- [x] Dashboard inicial con métricas reales.
- [x] Configuración base de empresa (tabla `empresa` + datos demo). _UI de edición: pendiente._

## ✅ Etapa 2 — Multiempresa y usuarios
- [x] Modelo de empresa (tenant).
- [x] Modelo de usuario (`profile` 1:1 con `auth.users`).
- [x] Roles básicos (6 roles) + trigger de alta de profile.
- [x] Protección de datos por empresa (**RLS** en las 28 tablas).
- [x] Permisos iniciales (`can()` + matriz por rol).

## ✅ Etapa 3 — Stock real
- [x] CRUD de autos: lista + ficha + **alta + edición + baja**.
- [x] Estados de stock (9 estados) + titularidad.
- [x] Ficha de vehículo con specs, rentabilidad y gastos.
- [x] Rentabilidad básica (margen bruto/neto con permiso).
- [x] **Fotos** (subida a Supabase Storage, galería, principal).
- [x] **Gastos** (alta/baja desde la ficha).
- [x] Estado documental editable.
- [ ] Control documental por ítem (`documento_vehiculo`) y checklist de ingreso editable.

## ✅ Etapa 4 — Clientes y leads
- [x] CRUD de clientes: lista + **alta + edición + ficha**.
- [x] Estados comerciales + origen del lead.
- [x] Seguimientos: **agendar** desde la ficha + marcar realizado/cancelar.
- [x] Ficha con historial (seguimientos, consultas, ventas, reservas).
- [x] Relación cliente-auto (alta de consulta desde la ficha).
- [x] **Historial de contacto cronológico unificado** (línea de tiempo con alta, seguimientos, consultas, ventas y reservas) + **registrar contacto** rápido.

## ✅ Etapa 5 — Encargos
- [x] Listado + **alta** de encargos.
- [x] **Matching automático**: la ficha del auto muestra encargos compatibles.
- [ ] Edición de encargos + notificación push al cargar stock.

## ✅ Etapa 6 — Ventas, reservas y postventa
- [x] Listados de ventas, reservas, créditos, postventa.
- [x] **Alta de reserva** (marca el auto reservado).
- [x] **Alta de venta** (forma de pago, permuta, crédito, entrega).
- [x] **Generación de cuotas** + **alerta anteúltima cuota** (job).
- [x] **Postventa automática a 6 meses** para ventas en efectivo.
- [x] **Ficha de venta** `/ventas/[id]` con **checklist de entrega editable** (10 ítems) y estado de entrega.
- [x] **Recibo de seña/venta** imprimible `/recibo/venta/[id]` (HTML → Imprimir/PDF del navegador). _Nota:_ el motor de plantillas PDF (pdf-lib) con numeración y guardado en ficha queda para la Etapa 8.

## ✅ Etapa 7 — VTV y alertas
- [x] Listado de VTV con mes sugerido por dígito.
- [x] **Job de estados** VTV (vencida / por_vencer 60 días / vigente) vía pg_cron.
- [x] **Cálculo automático de `fecha_vencimiento`** desde patente + `empresa.vtv_calendario` (helper `src/lib/data/vtv.ts`).
- [x] **Alta de VTV desde la ficha del vehículo** (patente prellenada; calcula o acepta fecha manual).
- [x] **Alertas 30/7 días diferenciadas** (severidad por color en listado VTV y ficha del vehículo).

## ✅ Etapa 8 — Documentos PDF
- [x] **Motor de plantillas pdf-lib** (`src/lib/pdf/documento.ts`): **10 documentos** — recibo de seña, recibo de pago, boleto de compraventa, presupuesto, datero, ficha de cliente, ficha de vehículo y autorizaciones de test drive / entrega / retiro de documentación.
- [x] **Autocompletado** con datos de cliente / vehículo / operación (snapshot en `documento_comercial.datos`).
- [x] **Numeración interna correlativa** por empresa + tipo (trigger `asignar_numero_documento`, migración `11_documentos`).
- [x] **Logo y datos de la empresa** en el encabezado de cada documento.
- [x] **Guardado en Storage** (bucket privado `documentos`) + apertura por URL firmada (`/documentos/[id]/abrir`).
- [x] **Generación contextual**: recibos / boleto / autorizaciones de entrega y retiro desde la ficha de venta; ficha de cliente y datero desde la ficha del cliente; ficha de vehículo desde la ficha del auto; presupuesto y autorización de test drive desde `/documentos`.
- [x] **Acceso a los documentos generados** desde el módulo `/documentos` y desde las fichas de cliente y de vehículo.

## ✅ Etapa 9 — Catálogo PDF y WhatsApp
- [x] **Generador de catálogo de stock filtrable** (`/catalogos`): filtro por estado/búsqueda + selección de unidades con checkboxes.
- [x] **PDF de catálogo** (`src/lib/pdf/catalogo.ts`): portada + fichas con foto principal, specs y precio, 3 por página, paginado. Guardado en bucket **público** `catalogos` (migración `12_storage_catalogos`).
- [x] **Envío por WhatsApp**: botón con mensaje prellenado + link público del catálogo (`waUrl` + `mensajeCatalogo`).
- [x] **Historial de catálogos** (tabla `catalogo_pdf`): listado con abrir / compartir / eliminar.
- [x] **Plantillas de mensaje de WhatsApp** (`src/lib/data/whatsapp.ts`): catálogo, seguimiento, reserva y por unidad.

## ✅ Etapa 10 — Publicaciones
- [x] **Estados de publicación por canal** (`/publicaciones`): panel con web propia, MercadoLibre y redes por unidad. Web/redes con toggle (flags `vehiculo.publicado_web/redes`); ML con estado real (borrador/publicado/pausado/vendido).
- [x] **OAuth con MercadoLibre**: conectar/desconectar cuenta (flujo `authorization_code`, `state` firmado con HMAC, refresh automático del token). Tokens en `ml_cuenta` (1×empresa, RLS). Callback `/api/mercadolibre/callback`.
- [x] **Webhook de notificaciones** `/api/mercadolibre/notifications`: recibe los avisos de ML y los registra en `ml_notificacion` vía función `SECURITY DEFINER` (verificado end-to-end). Respuesta 200 inmediata.
- [x] **Acciones ML contra la API real**: publicar (crea ítem con categoría predicha + atributos), pausar, activar, finalizar, sincronizar estados. Los errores de ML se guardan en `publicacion.mensaje` y se muestran en el panel.
- [x] **Página pública de stock** `/p/[slug]` (sin login): muestra las unidades con `publicado_web`, con fotos/specs/precio (respeta `ocultar_precio`) y botón de WhatsApp. Lectura vía función `SECURITY DEFINER stock_publico` (RLS-safe).
- [ ] _Pendiente de prueba en vivo:_ la **creación de ítems en ML** (categoría/atributos de autos) requiere afinarse con una cuenta conectada real; el panel expone el error exacto de ML para iterar.

## ✅ Etapa 11 — Reportes
- [x] **Reportes** (`/reportes`): filtro por fechas + KPIs (ventas/facturación/ticket promedio/valor de inventario), **ranking de vendedores**, breakdown por forma de pago y **stock por estado**. Rentabilidad (margen bruto/neto con gastos) gateada por `margenes.ver`. Lógica en `src/lib/data/reportes.ts`.
- [x] **Comisiones calculadas por venta** (`/comisiones`): comisión fija o por porcentaje sobre cada venta, estado de pago (pendiente/pagada), totales por vendedor y de liquidación. Edición gateada por `margenes.ver`.
- [x] **Exportación CSV** (`/reportes/export?tipo=ventas|stock|clientes`): CSV con BOM y `;` para Excel es-AR; respeta RLS y `costos.ver` (oculta costos a quien no los puede ver).

## 🟡 Etapa 12 — Pulido final (en curso)
- [x] **Historial de cambios poblado** en acciones clave: cambio de precio, cambio de estado, baja de vehículo y venta registrada (`src/lib/data/historial.ts` → `historial_cambio`). Visor en la ficha del vehículo.
- [x] **Seguridad (chequeos críticos en la base)** (migración `15_hardening_roles`): DELETE de `vehiculo`/`cliente`/`venta` restringido por RLS a dueño/encargado; trigger `enforce_precio_rol` que bloquea el cambio de `precio_venta` para roles sin permiso.
- [x] **Manejo de errores y estados**: páginas propias de error (`(app)/error.tsx`), 404 (`not-found.tsx` raíz + `(app)/not-found.tsx`) y skeleton de carga (`(app)/loading.tsx`). Responsive ya cubierto con utilidades Tailwind en todas las vistas.
- [ ] **Importación de stock/clientes desde Excel/CSV** (pendiente — diferida).
- [ ] Performance/limpieza final y validaciones extra.
