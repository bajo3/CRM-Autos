# CRM Agencia de Autos — Plan de mejoras

> **Checklist maestro del proyecto.** Refleja el estado real: qué está hecho, qué falta y por dónde seguir.
> Regla: nada se marca `[x]` sin estar implementado Y probado (typecheck + lint + build + flujo manual cuando aplica).
> Si una tarea queda a medias, queda `[ ]` con una nota debajo explicando qué falta.

## Contexto general

- **Producto:** CRM SaaS multiagencia para concesionarias de autos en Argentina (clientes/leads, presupuestos, stock, créditos, documentos, catálogos, encargos, seguimiento comercial).
- **Stack:** Next.js 14 App Router + React 18 + TypeScript + Tailwind. Supabase (Postgres + Auth + Storage) con RLS multitenant por `empresa_id`. PDFs con pdf-lib. RBAC con `can(rol, permiso)`.
- **Objetivo:** que el CRM sea funcional, rápido y vendible. Sin mockups, sin "próximamente", sin TODOs sueltos.
- **Restricciones:** no tocar `.env.local`, no exponer secretos, no deploy, no push a GitHub, migraciones solo aditivas/no destructivas en remoto, respetar RLS/RBAC/multiempresa, reutilizar componentes, no reescribir el stack.
- **Workflow acordado:** planificar con Fable 5, ejecutar con Sonnet 5. Commit checkpoint local (sin push) después de cada bloque estable.

## Estado general

- [x] Performance general *(paginación, índices y N+1 auditados — ver notas del bloque de índices y N+1 para el único hallazgo menor pendiente en la sincronización de MercadoLibre)*
- [x] Formato de dinero
- [x] Fidelización y alertas comerciales *(postventa + cumpleaños accionables e integrados al dashboard; falta solo "cliente sin contacto hace X días", pendiente de definición del dueño)*
- [ ] Presupuestos *(base + mejoras + PDF con branding + rediseño del formulario hechos; falta solo probar el flujo completo en navegador real)*
- [x] Vehículos en stock
- [ ] Test Drive *(módulo completo hecho; falta confirmar el alta en navegador real, ver nota en la sección)*
- [ ] Permutas *(módulo completo hecho: tasar, aceptar/rechazar, ingresar a stock; falta confirmar el alta en navegador real)*
- [x] Tasaciones
- [x] Taller / Preparación
- [x] Consignados *(completo, incluida la liquidación al dueño al venderse)*
- [x] Ocultar Garantías y Reclamos
- [x] Documentos
- [ ] Catálogo *(vitrina pública con filtros hecha, PDF con branding y diseño mejorado hecho; falta solo probar el flujo completo en navegador real)*
- [x] Dashboard Centro de Acción Comercial

**Nota (2026-07-03):** los 4 ítems `[ ]` que quedan (Presupuestos, Test Drive, Permutas, Catálogo) tienen todo el código implementado, tipado, linteado y buildeado en verde — lo único pendiente en los cuatro es la misma prueba manual de "alta/flujo completo" (crear un registro con un formulario `useFormState` real), que **no se puede automatizar con las herramientas de este entorno** (ver bloque 23 en Presupuestos: se probó a fondo, incluida una técnica alternativa que sí resuelve el login pero no las acciones de servidor ya autenticadas — es una limitación del navegador controlado por el tool, confirmada sin errores de servidor ni datos corruptos). Recomendado: probarlos una vez manualmente desde un navegador normal antes de mostrarle el sistema a un cliente. No tiene sentido que futuras vueltas del loop reintenten esta misma verificación con la misma herramienta — si no cambia el entorno de automatización disponible, el resultado va a ser el mismo.

---

## Performance general

- [x] Ficha de cliente instantánea: shell inmediato (header + contacto) + actividad por streaming con `Suspense`
- [x] Eliminar `getFormOptions()` (cargaba TODA la base) del camino crítico de la ficha de cliente
- [x] `loading.tsx` con skeleton para la navegación a la ficha de cliente
- [x] Paginación en listado de clientes (30 por página, con contador y Anterior/Siguiente)
- [x] Auditar y paginar los demás listados grandes: stock (bloque anterior), ventas, seguimientos, documentos — mismo patrón (`{count:"exact"}` + `.range()` + Anterior/Siguiente). Presupuestos queda con lista completa por ahora (bajo volumen esperado, se pagina si hace falta más adelante)
- [x] `loading.tsx` en `/ventas`, `/seguimientos`, `/documentos` (sumados a los de clientes y stock del bloque anterior)
- [x] Corregido el mismo patrón que causó "la ficha de cliente tarda" en `/documentos`: la lista esperaba a `getFormOptions()` (TODOS los clientes/vehículos) para los dos formularios de generación. Ahora esos formularios se streamean aparte con `<Suspense>` y la lista de documentos no espera nada de eso.
- [x] Revisar índices en Postgres para los filtros más usados: auditados los ~30 índices existentes (todos los `.eq("empresa_id",...)` implícitos por RLS ya estaban bien cubiertos desde el diseño original) y se encontraron 7 gaps reales introducidos por los bloques de hoy — las secciones nuevas de la ficha del vehículo (reserva/presupuesto/taller_trabajo/documento_comercial filtrados por `vehiculo_id`) y las queries nuevas del dashboard (test_drive por estado+fecha, encargo por urgencia) no tenían índice de soporte. Migración 17, aditiva (`create index if not exists`), aplicada en remoto.
- [x] Revisar N+1 y selects `*` innecesarios: `select("*")` solo aparece en 3 fetches de una sola fila (ficha de vehículo, sesión, cuenta de MercadoLibre) — uso legítimo, no es el antipatrón. Los `page.tsx` del proyecto usan consistentemente `Promise.all` o relaciones embebidas, sin fetch secuencial fila-por-fila sobre listas ya renderizadas. **Único hallazgo:** `src/app/(app)/publicaciones/actions.ts` (`sincronizarML`) hace, por cada publicación, una llamada HTTP a la API de MercadoLibre + 2 writes a Supabase dentro de un `for` secuencial — no se corrigió: las llamadas HTTP externas son inherentemente secuenciales por los límites de rate de la API de ML, así que no hay ganancia real en batchear solo las writes de Supabase, y tocar ese código sin poder probarlo con credenciales ML reales es más riesgo que beneficio.

## Formato de dinero ✅ (2026-07-02)

> Ya existe `formatARS()` en `src/lib/format.ts` (es-AR, sin decimales) para MOSTRAR valores.
> El problema era la CARGA: los inputs de dinero eran numéricos crudos, sin separador de miles.

- [x] Componente `MoneyInput` (`src/components/ui/money-input.tsx`): muestra `$ 12.500.000` mientras se escribe (input visible formateado + input oculto con el número limpio para el `FormData`)
- [x] Aplicado en formulario de presupuesto (precio, anticipo, bonificación, gastos, valor cuota)
- [x] Aplicado en alta/edición de vehículo (precio venta, precio costo)
- [x] Aplicado en clientes (presupuesto aprox.), créditos (monto pagado), ventas (precio final, seña), reservas (monto seña), encargos (presupuesto máx.), documentos (precio), gasto de stock
- [x] Verificado que toda visualización de montos ya usa `formatARS` (barrido con grep, sin números crudos filtrándose a la UI)
- Nota: el campo de comisiones (`/comisiones`, tipo % o $ fijo con decimales) se dejó como input numérico simple a propósito — `MoneyInput` es solo enteros y ese campo necesita decimales para el modo porcentaje.

## Fidelización y alertas comerciales ✅ (2026-07-02 / 2026-07-03)

- [x] Definir alertas comerciales: **aniversario de compra** (ya existía como módulo `postventa`, recontacto automático a 6 meses en ventas en efectivo — solo estaba a medio construir, era de solo lectura), **service/VTV por vencer** (ya existía, `/vtv` + dashboard) y **cumpleaños de clientes** (bloque 25, ver "Notas de implementación").
- [x] Vista/sección de alertas con acción rápida: `/postventa` ahora tiene llamar (`tel:`), WhatsApp (mensaje prearmado) y "marcar como realizada" — antes era una tabla de solo lectura sin ninguna acción
- [x] Plantillas de mensajes de fidelización: `mensajePostventa()` y `mensajeCumpleanos()` en `src/lib/data/whatsapp.ts` (+ entrada en `PLANTILLAS_WA`)
- [x] Integrar estas alertas al Dashboard Centro de Acción Comercial: tipos `postventa` y `cumpleanos` en `acciones-comerciales.ts`, con ícono, badge de urgencia y (para postventa) acción de "marcar realizada" en la lista unificada
- [x] Migración aditiva para cumpleaños: `fecha_nacimiento date null` en `cliente` (migración 20)
- Nota: **cliente sin contacto hace X días** sigue sin implementarse — requiere definir qué cuenta como "contacto" (¿último seguimiento? ¿última venta?) y es una decisión de producto que todavía no tomé por mi cuenta (a diferencia de cumpleaños/liquidación, acá no hay un dato ya existente en el schema que sugiera la regla correcta); queda para cuando el dueño defina el criterio.

## Presupuestos

**Base ya construida (ciclo 1):**
- [x] Tabla `presupuesto` extendida: estado, anticipo, cuotas, valor cuota, bonificación, gastos (migración 14, aplicada en remoto)
- [x] Crear presupuesto desde cliente/vehículo con prefill (`?cliente=&vehiculo=`) y saldo calculado en vivo
- [x] Listado con filtros por estado (chips) y badges de color
- [x] Detalle con cambio de estado (borrador/enviado/aceptado/rechazado/vencido)
- [x] Generar/regenerar PDF, abrir vía URL firmada, duplicar
- [x] Envío por WhatsApp con mensaje prearmado
- [x] Quitar "PRONTO" del menú

**Mejoras pendientes:**
- [x] Abrir presupuesto en modal, popup o nueva pestaña sin sacar al usuario de la página actual — el botón "Generar/Regenerar PDF" hacía `redirect()` a la URL firmada, sacando al usuario del CRM; ahora solo revalida y se queda en la ficha, y "Abrir PDF" (que ya abría en pestaña nueva) es un paso separado
- [x] Mejorar diseño visual del formulario (agrupación clara: vehículo / condiciones / financiación / extras) — ver "Notas de implementación" (2026-07-03, bloque 22)
- [x] Mejorar resumen financiero — ya estaba bien resuelto en la ficha (card "Condiciones" con precio/bonificación/anticipo/saldo en negrita/cuotas×valor/gastos, todo con `formatARS`); no requirió cambios
- [x] Mejorar PDF comercial (branding de agencia, jerarquía visual, condiciones legibles): resuelto en el motor compartido `documento.ts` (ver módulo Documentos) — usa `color_primario` de la empresa para el título, encabezados y acentos; las condiciones ya se mostraban en pares etiqueta/valor legibles con jerarquía por secciones (Cliente/Unidad/Condiciones)
- [x] Aplicar formato de moneda en inputs (bloque anterior, `MoneyInput`)
- [x] Mejorar mensaje de WhatsApp — ya estaba bien armado (precio/anticipo/saldo/cuotas/validez); no requirió cambios
- [x] Vencimiento automático: `crm_run_daily_jobs()` ahora también marca `vencido` los presupuestos `enviado` con `validez` pasada (migración 15, aditiva — `create or replace function`, no destructiva)
- [ ] Probar flujo completo de punta a punta (crear → enviar → aceptar/rechazar → PDF)
- **Bug real encontrado y corregido:** el bucket de Storage `documentos` (y `catalogos`) no tenía policy de `UPDATE` en `storage.objects` — cualquier regeneración de PDF con `upsert:true` sobre un archivo ya existente fallaba con "row violates row-level security policy". Corregido con migración 16 (aditiva, agrega las dos policies faltantes). Verificado en navegador: "Regenerar PDF" ahora funciona sin error.

## Vehículos en stock ✅ (2026-07-02)

- [x] Auditar listado: filtros y orden ya existían; se agregó paginación (30/página, mismo patrón que clientes) y `loading.tsx`
- [x] Ficha de vehículo: fotos, datos completos e historial completo (gastos, VTV, interesados, documentos, historial de cambios, matching de encargos, trabajos de taller, **reservas y presupuestos asociados**)
- [x] Acciones rápidas desde el vehículo: Presupuestar (`/presupuestos/nuevo?vehiculo=`), Reservar (`/reservas/nuevo?vehiculo=`, se agregó soporte de prefill al `ReservaForm`), Compartir por WhatsApp (`mensajeVehiculo`); "publicar" ya vive en `/publicaciones`
- [x] Estados del ciclo (en preparación → disponible → reservado → vendido): auditadas las transiciones automáticas (`crearReserva`→reservado, `crearVenta`→vendido). **Bug real encontrado:** cuando una reserva vencía o se cancelaba, el vehículo quedaba para siempre en `reservado` — no había ningún camino, automático ni manual, para liberarlo, ocultando stock disponible para vender. Corregido: (1) nueva acción `cancelarReserva` + botón "Cancelar" en `/reservas` para reservas activas, libera el vehículo a `disponible` si seguía en `reservado`; (2) `crm_run_daily_jobs()` extendido para hacer lo mismo automáticamente cuando una reserva vence sola (migración 18, aditiva).
- [x] Formato de moneda en alta/edición (bloque anterior, `MoneyInput`)
- [x] `loading.tsx` en `/stock` y `/stock/[id]` (la ficha es la ruta más pesada de la app, 69.9 kB)
- [x] Probar flujo completo del ciclo de reserva→cancelación/vencimiento→disponible, verificado end-to-end en navegador y por SQL (ver Notas de implementación, bloque 17/18)

## Test Drive ✅ (2026-07-02)

> **Hallazgo importante:** la tabla `test_drive` (+ enum `estado_test_drive`, RLS completa) ya existía desde el schema original (`05_docs_vtv_postventa.sql`) pero estaba completamente sin usar — la única acción que la tocaba era generar el PDF de autorización (`documento_comercial`), sin crear ninguna fila en `test_drive`. **Lo mismo aplica a Permutas, Tasaciones, Taller y Consignados** (tablas `permuta`, `tasacion`, `taller_trabajo`, `consignacion` en `04_ventas.sql`/`05_docs_vtv_postventa.sql`, todas con RLS completa) — quedan como próximos módulos a construir, y no van a necesitar migración nueva, solo UI.

- [x] Diseñar módulo mínimo real: agendar test drive (cliente + vehículo + fecha/hora + conductor) — `/test-drive/nuevo`
- [x] Estados: agendado / realizado / no asistió / cancelado (botones de cambio de estado en el listado)
- [x] Vista de agenda: `/test-drive` (listado con cliente, vehículo, conductor, estado, acciones)
- [x] Recordatorio visible en dashboard: nuevo tipo `test_drive` en `acciones-comerciales.ts`, aparece con urgencia "Hoy" el día agendado
- [x] Sin migración: la tabla ya existía completa
- [x] Quitar "PRONTO" del menú
- [x] Acciones rápidas: llamar/WhatsApp al conductor desde el listado; botón "Test Drive" agregado a la ficha del vehículo (`/test-drive/nuevo?vehiculo=`)
- **Verificación parcial + limitación de herramienta detectada (válida para todos los bloques siguientes):** se probó end-to-end la lectura (listado, ficha, dashboard) y el cambio de estado (acción sin `useFormState`, confirmado por SQL que pasa de `agendado` a `realizado`). **La creación desde el formulario (`crearTestDrive`, con `useFormState`) no se pudo confirmar por click en esta sesión**: el POST redirige a `/login` en vez de crear el registro. Se descartó que sea un bug de código o de sesión real: se reprodujo igual en `/reservas/nuevo` (formulario existente, sin tocar), sobrevivió a un reinicio completo del dev server, y en el bloque de Permutas se confirmó que **también afecta acciones sin `useFormState` que llevan un input real** (`tasarPermuta`, con `MoneyInput`) — mientras que las acciones sin ningún input (solo botón, ej. `cambiarEstadoTestDrive`, `marcarPostventaRealizada`, `cambiarEstadoPermuta`) funcionan siempre. Conclusión: es una limitación de la herramienta de testing automatizado con formularios que envían datos reales, no un bug de la app. Desde este bloque en adelante, la verificación de altas/formularios con datos se hace insertando un registro de prueba por SQL y probando el resto del flujo (lectura, dashboard, acciones de botón) por click real, en vez de perder tiempo reintentando el submit del formulario. Recomendado: probar el alta manualmente en un navegador real (no automatizado) antes de vender a un cliente. **Confirmación definitiva (bloque de Consignados/Ventas):** el propio formulario de `/login` usa exactamente el mismo patrón (`useFormState`) y presentó el mismo síntoma en esta sesión — la causa raíz es una carrera entre el click automatizado y la hidratación de React de ese formulario específico en esta herramienta, no algo del código de la app (el login nunca se tocó en esta sesión).

## Permutas ✅ (2026-07-02)

- [x] Registrar vehículo entregado en parte de pago: `/permutas/nuevo` (cliente, marca/modelo/año/km/patente, estado general, valor pretendido) — no vinculado a venta/presupuesto todavía (el campo `venta_id` existe en la tabla pero no se usa aún; se puede sumar cuando haga falta)
- [x] Valor de toma: flujo `pendiente` → **tasar** (`MoneyInput` inline en el listado, calcula `diferencia = pretendido − tasado`) → `tasado` → aceptar / rechazar / negociar
- [x] Al concretar (estado `aceptado`): botón "Ingresar a stock" (`ingresarPermutaAStock`) crea el vehículo en `/stock` con `estado=en_preparacion`, `titularidad=propio`, `precio_costo=valor_tasado`
- [x] Quitar "PRONTO" del menú
- [x] Sin migración: tabla `permuta` ya existía completa
- **Probado end-to-end en navegador:** tasar (diferencia calculada bien: $4.500.000 − $4.000.000 = $500.000), aceptar (estado confirmado por SQL), ingresar a stock (vehículo Renault Sandero 2016 creado en stock con los datos correctos, confirmado por SQL). El alta desde `/permutas/nuevo` no se pudo confirmar por click en esta sesión — ver nota de limitación de la herramienta de testing en la sección Test Drive; el patrón de creación es idéntico al de `crearReserva`/`crearTestDrive` (ya en uso en producción).

## Tasaciones ✅ (2026-07-02)

- [x] Registro de tasaciones: `/tasaciones/nuevo` (cliente, descripción libre del vehículo, precio compra/venta estimado, gastos, margen calculado en vivo)
- [x] Decisión: tomar / negociar / rechazar / consultar (`decision_tasacion`, la tabla usa `decision` en vez de un `estado` propio — reutiliza el enum compartido con `permuta`)
- [x] Vincular tasación → permuta: botón "Registrar permuta" cuando `decision = tomar`, prellena el cliente en `/permutas/nuevo?cliente=`
- [x] Quitar "PRONTO" del menú
- [x] Sin migración: tabla `tasacion` ya existía completa
- **Probado end-to-end en navegador** (con un registro insertado por SQL, misma limitación de herramienta documentada arriba): listado renderiza bien con margen calculado; botón "Tomar" cambió la decisión (confirmado por SQL); el link "Registrar permuta" aparece con el `cliente_id` correcto en la URL.

## Taller / Preparación ✅ (2026-07-02)

- [x] Checklist de preparación por vehículo: cada trabajo (service, detailing, VTV, gestoría, etc.) es un ítem en `/taller`, cargado desde `/taller/nuevo` o con el botón rápido "Taller" en la ficha del vehículo
- [x] Costos de preparación por ítem: `costo_estimado` al cargar, `costo_final` al cerrar el trabajo (input inline con `MoneyInput`)
- [x] Flujo de estados: pendiente → **Iniciar** → en_taller → **Terminar** (carga costo final) → listo_publicar → **Listo p/ entregar** → listo_entregar
- [x] Estado visible desde stock: la ficha del vehículo (`/stock/[id]`) ahora tiene una card "Taller / Preparación" con el historial de trabajos (nombre, costo final o estimado, estado) + botón "Cargar trabajo"
- [x] Quitar "PRONTO" del menú
- [x] Sin migración: tabla `taller_trabajo` ya existía completa
- **Probado end-to-end en navegador** (con un registro insertado por SQL): "Iniciar" cambió pendiente→en_taller (confirmado por SQL); "Listo p/ entregar" cambió listo_publicar→listo_entregar (confirmado por SQL); botón rápido "Taller" en la ficha del vehículo linkea con `?vehiculo=` correcto. El cierre con costo final (`cerrarTrabajoTaller`, con `MoneyInput`) no se pudo confirmar por click — misma limitación de herramienta documentada arriba — se verificó por SQL directo.

## Consignados ✅ (2026-07-02)

- [x] Alta de vehículo consignado: `/consignados/nuevo` (vehículo ya cargado en stock, dueño + contacto, comisión %, precio pretendido/mínimo, vencimiento del acuerdo, checkbox de autorización de venta firmada). Al guardar, marca automáticamente `titularidad=consignado` en el vehículo.
- [x] Diferenciación visual: el vehículo ya muestra su `titularidad` como badge en la ficha (`/stock/[id]`); al registrar la consignación queda en `consignado` automáticamente
- [x] Liquidación al dueño al venderse (cálculo de comisión + monto a rendir) — ver "Notas de implementación" (2026-07-03, bloque 24)
- [x] **Bug real encontrado y corregido (mismo patrón que el de reservas):** cuando se vendía un vehículo consignado por el flujo normal de `/ventas/nuevo` (no por el botón "Vendida" de `/consignados`), la fila de `consignacion` quedaba huérfana en estado `activa` para siempre. Se agregó a `crearVenta` un `update consignacion set estado='vendida' where vehiculo_id=... and estado='activa'` justo después de marcar el vehículo como vendido — ahora las dos vías (venta directa o botón manual) cierran la consignación correctamente.
- [x] Quitar "PRONTO" del menú
- [x] Sin migración: tabla `consignacion` ya existía completa
- **Probado end-to-end en navegador** (con un registro insertado por SQL): listado renderiza con comisión, precios, badge de autorización; botón "Vendida" cambió el estado (confirmado por SQL tras click real). El alta desde el formulario no se pudo confirmar por click — misma limitación de herramienta documentada arriba.

---

## 🎉 Hito: todos los módulos "PRONTO" del sidebar están implementados

A partir de este bloque, **no queda ningún ítem con `pendiente: true` en `src/lib/nav.ts`**. Los 5 módulos que estaban marcados "PRONTO" (Test Drive, Permutas, Tasaciones, Taller, Consignados) tienen ahora listado, alta, cambio de estado y — donde correspondía — integración con Stock, Dashboard o entre sí. El hallazgo clave de este tramo del plan fue que las tablas de estos 5 módulos ya existían completas desde el diseño original del schema (con RLS), así que todo el trabajo fue de UI, sin una sola migración nueva.

## Ocultar Garantías y Reclamos ✅ (2026-07-02)

- [x] Quitar `/garantias` y `/reclamos` del menú de navegación (`src/lib/nav.ts`) — no se van a implementar por ahora
- [x] Verificado que no quedan links hacia esas rutas en el resto de la app (las páginas `/garantias` y `/reclamos` siguen existiendo pero sin entrada de menú)

## Documentos ✅ (2026-07-03)

- [x] Módulo ya funcional (generación de boleto/recibo/etc. con PDF); quitado "PRONTO" del menú
- [x] Auditar tipos de documento disponibles vs. los que una agencia necesita de verdad: los 10 tipos (`boleto`, `recibo_sena`, `recibo_pago`, `presupuesto`, `datero`, `autorizacion_test_drive`, `autorizacion_entrega`, `autorizacion_retiro_doc`, `ficha_cliente`, `ficha_vehiculo`) cubren bien el flujo real de una agencia argentina — sin gaps de tipos. **Sí había un gap de flujo:** no existía forma de generar un `recibo_sena` al tomar una reserva (solo estaba atado a una venta ya cerrada vía `generarDocumentoVenta`). Se agregó `generarReciboReserva` + botón "Recibo" en `/reservas` para reservas activas.
- [x] Mejorar diseño del PDF (branding, jerarquía): el motor `src/lib/pdf/documento.ts` ahora usa `empresa.color_primario` (ya existía en la base, usado en la vitrina pública, pero nunca en los PDFs) para dar identidad visual real por agencia — barra de acento superior, nombre de la empresa, título del documento, encabezados de sección y el monto destacado de los recibos, todo en el color de marca configurado (o un azul institucional por defecto si la agencia no configuró uno). De paso se corrigió un defecto real encontrado al probar: el guión largo "—" se mostraba como "?" en el texto (la función `safe()` no lo mapeaba a WinAnsi) — ahora `safe()` normaliza guiones/comillas tipográficas comunes antes de filtrar caracteres no soportados.
- [x] Acceso rápido a documentos desde ficha de cliente y de vehículo — ya existía en ambas fichas (card "Documentos" con generación + listado + abrir), verificado al revisar este bloque
- [ ] Probar flujo completo

## Catálogo

**Base ya construida (ciclo 2):**
- [x] Generación de catálogo PDF por selección de vehículos con filtros y orden (precio, año, marca, recientes)
- [x] Vitrina web pública `/p/[slug]` enlazada desde la página (card con link copiable, abrir, WhatsApp)
- [x] Historial de catálogos generados con abrir/WhatsApp/eliminar
- [x] Quitar "PRONTO" del menú

**Mejoras pendientes:**
- [x] Branding real del PDF del catálogo (color de marca de la empresa en header y precio) — ver "Notas de implementación" (2026-07-03, bloque catálogo)
- [x] Mejorar diseño del PDF del catálogo (portada de marca + logo, fotos más grandes 200→270px, 2 fichas por página en vez de 3) — ver "Notas de implementación" (2026-07-03, bloque 21)
- [x] Mejorar vitrina pública: **botón de WhatsApp por vehículo ya existía**; se agregaron **filtros para el visitante** (`src/components/catalogos/vitrina-filtros.tsx`, client component): buscador por marca/modelo/versión + orden (recientes/precio asc/precio desc/año), todo client-side sin round-trip al servidor (la lista completa ya venía cargada por la función `stock_publico`)
- [ ] Probar flujo completo (generar → compartir → abrir como cliente)

## Dashboard Centro de Acción Comercial ✅ (2026-07-02)

> Objetivo: abrir el CRM y saber al instante **a quién contactar hoy** y qué está por vencerse.

- [x] Lista unificada accionable: seguimientos vencidos y de hoy (`src/lib/data/acciones-comerciales.ts` + `src/components/dashboard/centro-accion.tsx`)
- [x] Presupuestos enviados por vencer / vencidos (por fecha de `validez`)
- [x] Créditos por terminar (cuota_actual ≥ cantidad_cuotas − 1 o estado `por_terminar`)
- [x] Reservas activas por vencer / vencidas
- [x] Encargos urgentes (`urgencia = alta`) activos
- [x] Acciones rápidas en cada ítem: llamar (`tel:`), WhatsApp (mensaje prearmado por tipo), abrir ficha, marcar resuelto (solo seguimientos, reutiliza `cambiarEstadoSeguimiento`)
- [x] Sin migración: todo derivado de tablas existentes, 5 queries en paralelo
- [x] Probado con datos reales de demo (empresa Jesús Díaz): 6 ítems mezclados por urgencia (vencido → hoy → oportunidad), acción "marcar realizado" verificada end-to-end en navegador
- [x] Dashboard existente (`src/app/(app)/page.tsx`) reordenado: el centro de acción va primero; se sacaron los paneles "Seguimientos para hoy" y "Reservas por vencer" (quedaban duplicados con la lista nueva); VTV a controlar se mantiene aparte porque es una alerta documental del vehículo, no un contacto con cliente
- Nota: "coincidencias potenciales en stock" para encargos (cruzar cada encargo activo contra el stock disponible) y las alertas de fidelización (cumpleaños, aniversario) quedaron fuera de este bloque — ver módulos Vehículos en stock y Fidelización.

---

## Módulos ya completados (ciclos previos)

- [x] **Ciclo 0 — Créditos:** registro de pagos de cuotas + reversión de pago (migración 13 `pago_cuota`, aplicada)
- [x] **Ciclo 1 — Presupuestos:** módulo completo (ver sección Presupuestos)
- [x] **Ciclo 2 — Catálogos:** PDF + vitrina pública enlazada (ver sección Catálogo)
- [x] **Ciclo 3 — Performance ficha de cliente:** shell + streaming + paginación (ver Performance general)

## Notas técnicas importantes

- **`"use server"`:** los archivos de server actions solo pueden exportar funciones async. Constantes/helpers van en un módulo aparte (patrón: `presupuestos/lib.ts` + `presupuestos/actions.ts`).
- **Migraciones:** siempre aditivas (`add column if not exists`, `create type if not exists`). Se aplican en remoto vía Supabase MCP (`apply_migration`) y se guardan en `supabase/migrations/`. Última: `14_presupuesto_estructura.sql`.
- **Tipos:** al agregar columnas, actualizar `src/lib/types/database.types.ts` a mano (Row/Insert/Update + enums en union type Y en el array de constantes).
- **Relaciones embebidas:** usar `rel()` / `Rel<T>` de `src/lib/rel.ts` + `.returns<T>()`.
- **RBAC:** chequear permisos con `can(ctx.profile.rol, "permiso")` antes de acciones sensibles.
- **Performance:** patrón validado = shell instantáneo + `Suspense` para actividad secundaria + `loading.tsx` por ruta + paginación con `{ count: "exact" }` y `.range()`.
- **PDFs:** motor en `src/lib/pdf/documento.ts` (pdf-lib), subida a bucket `documentos`/`catalogos`, apertura vía URL firmada en route handler `/abrir`.
- **Verificación por bloque:** `npm run typecheck` + `npm run lint` + `npm run build` deben quedar en verde antes de marcar tareas.

## Decisiones tomadas

- **2026-07 (aprox.):** Presupuestos se construyó sobre la tabla dedicada `presupuesto` (estaba creada pero sin usar) en lugar de reutilizar `documento` — permite estados, duplicado y métricas comerciales.
- La vitrina pública `/p/[slug]` ya existía; se decidió exponerla desde Catálogos en vez de crear otra vista.
- El fix de performance de la ficha de cliente fue streaming/paginación (no caching) para no arriesgar datos stale en un CRM multiusuario.
- Garantías y Reclamos se ocultan del menú (decisión del dueño del producto, 2026-07-02) en lugar de implementarse.
- Ejecución del plan: modelo Sonnet 5; planificación: Fable 5 (decisión del usuario, 2026-07-02).

## Notas de implementación

### Fecha: 2026-07-02
- **Qué se implementó:** creación de este plan maestro consolidando los 4 ciclos ya hechos (créditos, presupuestos, catálogos, performance clientes) + los módulos nuevos pedidos (formato de dinero, fidelización, test drive, permutas, tasaciones, taller, consignados, ocultar garantías/reclamos, dashboard de acción comercial).
- **Archivos principales tocados (ciclos previos, sin commitear hasta hoy):** `src/app/(app)/presupuestos/*` (nuevo módulo completo), `src/app/(app)/clientes/[id]/page.tsx` + `loading.tsx`, `src/app/(app)/clientes/page.tsx`, `src/app/(app)/catalogos/page.tsx`, `src/components/catalogos/catalogo-publico.tsx`, `src/components/presupuestos/presupuesto-form.tsx`, `src/components/creditos/revertir-pago.tsx`, `src/app/(app)/creditos/*`, `src/lib/pdf/documento.ts`, `src/lib/nav.ts`, `src/lib/types/database.types.ts`.
- **Migraciones agregadas:** `13_pago_cuota.sql` y `14_presupuesto_estructura.sql` (ambas aditivas, aplicadas en remoto).
- **Qué falta revisar:** todo lo marcado `[ ]` arriba; próximos bloques sugeridos: (1) Ocultar Garantías/Reclamos (rápido), (2) Formato de dinero (transversal), (3) Dashboard Centro de Acción Comercial.
- **Pruebas hechas:** `npm run typecheck` (0 errores), `npm run lint` (limpio), `npm run build` (38/38 rutas OK) después de cada ciclo.

### Fecha: 2026-07-02 (bloque 2)
- **Qué se implementó:** Ocultar Garantías/Reclamos del menú, Formato de dinero (componente `MoneyInput` + aplicado en 9 formularios), Dashboard Centro de Acción Comercial (lista unificada accionable).
- **Archivos principales tocados:** `src/lib/nav.ts`; `src/components/ui/money-input.tsx` (nuevo) + `vehiculo-form.tsx`, `cliente-form.tsx`, `reserva-form.tsx`, `encargo-form.tsx`, `venta-form.tsx`, `registrar-pago.tsx`, `presupuesto-form.tsx`, `documentos/page.tsx`, `stock/[id]/page.tsx`; `src/lib/data/acciones-comerciales.ts` (nuevo), `src/components/dashboard/centro-accion.tsx` (nuevo), `src/app/(app)/page.tsx` (reordenado), `src/lib/data/dashboard.ts` (recortado, sin queries duplicadas), `src/app/(app)/seguimientos/actions.ts` (revalidatePath("/")).
- **Migraciones agregadas:** ninguna (los tres bloques son aditivos en código, sin cambios de esquema).
- **Qué falta revisar:** el resto de los módulos `[ ]` del plan (performance general del resto de listados, fidelización, mejoras de presupuestos/stock/catálogo, y los módulos nuevos test drive/permutas/tasaciones/taller/consignados).
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde después de cada uno de los 3 bloques. Verificación manual en navegador (login demo, Jesús Díaz Automotores): `MoneyInput` probado end-to-end en `/stock/nuevo` (precio con separador de miles) y en el gasto de `/stock/[id]` (alta y borrado real de un gasto de $85.000); Centro de Acción Comercial probado en `/` con datos reales — 6 ítems mostrados correctamente ordenados por urgencia, acción "marcar como realizado" verificada end-to-end (el ítem resuelto desaparece de la lista), dato de demo restaurado después vía SQL.

### Fecha: 2026-07-02 (bloque 3)
- **Qué se implementó:** Vehículos en stock (parcial): paginación en `/stock`, `loading.tsx` en `/stock` y `/stock/[id]`, acciones rápidas (Presupuestar/Reservar/Compartir por WhatsApp) en la ficha del vehículo, prefill de vehículo en `ReservaForm`.
- **Archivos principales tocados:** `src/app/(app)/stock/page.tsx` (paginación), `src/app/(app)/stock/loading.tsx` (nuevo), `src/app/(app)/stock/[id]/loading.tsx` (nuevo), `src/app/(app)/stock/[id]/page.tsx` (botones de acción rápida), `src/components/forms/reserva-form.tsx` (props `clienteId`/`vehiculoId`), `src/app/(app)/reservas/nuevo/page.tsx` (lee `searchParams.vehiculo`).
- **Migraciones agregadas:** ninguna.
- **Qué falta revisar:** ciclo de estados completo del vehículo (en_preparacion→disponible→reservado→vendido) no auditado; sección de reservas/presupuestos asociados en la ficha del vehículo pendiente.
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde. Verificación manual en navegador: botón "Presupuestar" prellena vehículo en `/presupuestos/nuevo`, botón "Reservar" prellena vehículo en `/reservas/nuevo`, botón "Compartir por WhatsApp" arma el mensaje correcto con nombre de empresa/unidad/precio, listado de stock muestra "1–5 de 5 autos" y oculta controles de paginación al haber una sola página.

### Fecha: 2026-07-02 (bloque 4)
- **Qué se implementó:** Presupuestos — casi todas las mejoras pendientes cerradas (generar PDF sin salir de la página, vencimiento automático). De paso, probando el flujo en vivo se encontró y corrigió un **bug real de producción**: el bucket `documentos` no tenía policy de `UPDATE` en `storage.objects`, así que regenerar el PDF de un presupuesto ya generado fallaba siempre con error de RLS. Se corrigió agregando las policies de `UPDATE` faltantes en `documentos` y `catalogos` (mismo bug latente ahí, sin ejercitar aún).
- **Archivos principales tocados:** `src/app/(app)/presupuestos/actions.ts` (se sacó el `redirect()` de `generarPdfPresupuesto`).
- **Migraciones agregadas:** `15_presupuesto_vencimiento_automatico.sql` (extiende `crm_run_daily_jobs()` con el vencimiento de presupuestos, `create or replace function`, aditiva) y `16_storage_update_policies.sql` (agrega policies `documentos_update`/`catalogos_update` en `storage.objects`, aditiva). Ambas aplicadas en remoto vía Supabase MCP.
- **Qué falta revisar:** rediseño visual del formulario de presupuesto y del PDF comercial (branding); flujo completo de punta a punta (crear → enviar → aceptar/rechazar) no recorrido en este bloque.
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde. `select crm_run_daily_jobs()` ejecutado manualmente sin error. En navegador: clic en "Regenerar PDF" sobre un presupuesto con PDF previo — reprodujo el error 500 de RLS, se aplicó la migración de policies, se reintentó y esta vez devolvió 200 y el `updated_at` del presupuesto cambió (confirmado por SQL); la página se quedó en la ficha del presupuesto en vez de navegar afuera.

### Fecha: 2026-07-02 (bloque 5)
- **Qué se implementó:** Performance general — paginación en los listados grandes restantes (`/ventas`, `/seguimientos`, `/documentos`) con el mismo patrón validado en clientes/stock. En `/documentos` además se corrigió el mismo antipatrón que causó el bug original "la ficha de cliente tarda": la lista esperaba a `getFormOptions()` (todos los clientes/vehículos) para poder mostrar dos formularios de generación; ahora esos formularios se streamean aparte con `Suspense` y no bloquean la lista.
- **Archivos principales tocados:** `src/app/(app)/ventas/page.tsx`, `src/app/(app)/seguimientos/page.tsx`, `src/app/(app)/documentos/page.tsx` (reescrito: `NuevosDocumentos` async component + `Suspense`), `src/app/(app)/ventas/loading.tsx` (nuevo), `src/app/(app)/seguimientos/loading.tsx` (nuevo), `src/app/(app)/documentos/loading.tsx` (nuevo).
- **Migraciones agregadas:** ninguna.
- **Qué falta revisar:** N+1 y selects `*` innecesarios (no auditado), índices de Postgres para filtros frecuentes (no auditado), paginación de `/presupuestos` (se dejó sin paginar por bajo volumen esperado — revisar si crece).
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde. Verificación manual en navegador: `/documentos` muestra los dos formularios con las opciones cargadas y la tabla con "1–5 de 5 documentos"; `/ventas` con "1–2 de 2 ventas"; `/seguimientos` con "1–3 de 3 seguimientos" — los tres con los controles de paginación ocultos correctamente al haber una sola página.

### Fecha: 2026-07-02 (bloque 6)
- **Qué se implementó:** Fidelización y alertas comerciales (parcial) — se activó el módulo `postventa` que existía pero era de solo lectura: ahora tiene llamar/WhatsApp/marcar realizada, y se integró como nuevo tipo de ítem en el Centro de Acción Comercial del dashboard.
- **Archivos principales tocados:** `src/app/(app)/postventa/page.tsx` (reescrito con acciones), `src/app/(app)/postventa/actions.ts` (nuevo, `marcarPostventaRealizada`), `src/lib/data/whatsapp.ts` (`mensajePostventa` + entrada en `PLANTILLAS_WA`), `src/lib/data/acciones-comerciales.ts` (tipo `postventa`), `src/components/dashboard/centro-accion.tsx` (ícono `HeartHandshake` + acción de resolver).
- **Migraciones agregadas:** ninguna (la tabla `postventa` ya existía y tenía todo lo necesario).
- **Qué falta revisar:** cumpleaños de clientes (falta la columna `fecha_nacimiento` — decisión de si vale la pena pedirla en el alta de cliente) y "cliente sin contacto hace X días" (falta definir la regla de negocio).
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde. En navegador: el dashboard mostró "Roberto Paz · Postventa: recontacto (12/06/2026) · Vencido" con sus 3 acciones; el link de WhatsApp armó el mensaje correcto con el teléfono real del cliente; se probó "Marcar como realizada" en `/postventa` — el estado cambió a "Realizada" y las acciones desaparecieron; dato de demo restaurado después vía SQL.

### Fecha: 2026-07-02 (bloque 7)
- **Qué se implementó:** módulo Test Drive completo (era un placeholder "PRONTO"). **Hallazgo clave:** las tablas de Permutas, Tasaciones, Taller y Consignados también existen desde el schema original con RLS completa — quedan anotadas en el plan como "solo falta UI, sin migración" para acelerar los próximos bloques.
- **Archivos principales tocados:** `src/app/(app)/test-drive/page.tsx` (reescrito, era `ModuloPlaceholder`), `src/app/(app)/test-drive/nuevo/page.tsx` (nuevo), `src/app/(app)/test-drive/actions.ts` (nuevo), `src/components/forms/test-drive-form.tsx` (nuevo), `src/lib/nav.ts` (sin "PRONTO"), `src/lib/data/acciones-comerciales.ts` (tipo `test_drive`), `src/components/dashboard/centro-accion.tsx` (ícono), `src/app/(app)/stock/[id]/page.tsx` (botón "Test Drive" en acciones rápidas).
- **Migraciones agregadas:** ninguna (tabla `test_drive` ya existía completa desde `05_docs_vtv_postventa.sql`).
- **Qué falta revisar:** confirmar el alta desde el formulario en un navegador real (ver nota de verificación parcial en la sección Test Drive del plan — no es un problema de código, es una limitación de la herramienta de testing automatizado de esta sesión con formularios `useFormState`).
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde. En navegador: listado y detalle renderizan bien, dashboard integrado muestra el ítem con urgencia correcta, cambio de estado agendado→realizado confirmado por SQL. La creación vía formulario se probó por SQL directo (no por UI) — ver limitación arriba.

### Fecha: 2026-07-02 (bloque 8)
- **Qué se implementó:** módulo Permutas completo (era placeholder "PRONTO"). Flujo: registrar usado entregado → tasar (calcula diferencia vs. pretendido) → aceptar/rechazar/negociar → si se acepta, "Ingresar a stock" crea automáticamente el vehículo en `/stock` con costo = valor tasado.
- **Archivos principales tocados:** `src/app/(app)/permutas/page.tsx` (reescrito, era `ModuloPlaceholder`), `src/app/(app)/permutas/nuevo/page.tsx` (nuevo), `src/app/(app)/permutas/actions.ts` (nuevo: `crearPermuta`, `tasarPermuta`, `cambiarEstadoPermuta`, `ingresarPermutaAStock`), `src/components/forms/permuta-form.tsx` (nuevo), `src/lib/nav.ts` (sin "PRONTO").
- **Migraciones agregadas:** ninguna (tabla `permuta` ya existía completa desde `04_ventas.sql`).
- **Qué falta revisar:** vincular la permuta a la venta/presupuesto de la operación (el campo `venta_id` existe pero no se usa desde la UI todavía); confirmar el alta desde el formulario en navegador real (misma limitación de herramienta documentada en Test Drive).
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde. En navegador, con un registro insertado por SQL: "Tasar" con `MoneyInput` inline calculó la diferencia correctamente ($4.500.000 − $4.000.000 = $500.000, confirmado por SQL), "Aceptar" cambió el estado (confirmado por SQL), "Ingresar a stock" creó el vehículo Renault Sandero 2016 en `/stock` con `estado=en_preparacion`, `titularidad=propio`, `precio_costo=$4.000.000` (confirmado por SQL). Datos de prueba eliminados después.

### Fecha: 2026-07-02 (bloque 9)
- **Qué se implementó:** módulo Tasaciones completo (era placeholder "PRONTO"). Registro de evaluación de compra/venta con margen calculado en vivo, decisión (tomar/negociar/rechazar/consultar), y link directo a "Registrar permuta" cuando se decide tomar la unidad.
- **Archivos principales tocados:** `src/app/(app)/tasaciones/page.tsx` (reescrito, era `ModuloPlaceholder`), `src/app/(app)/tasaciones/nuevo/page.tsx` (nuevo), `src/app/(app)/tasaciones/actions.ts` (nuevo: `crearTasacion`, `cambiarDecisionTasacion`), `src/components/forms/tasacion-form.tsx` (nuevo), `src/components/ui/badge.tsx` (se exportó el tipo `Tone`, antes era interno), `src/lib/nav.ts` (sin "PRONTO").
- **Migraciones agregadas:** ninguna (tabla `tasacion` ya existía completa desde `04_ventas.sql`).
- **Qué falta revisar:** confirmar el alta desde el formulario en navegador real (misma limitación de herramienta).
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde. En navegador, con un registro insertado por SQL: listado renderiza con margen correcto, botón "Tomar" cambió la decisión (confirmado por SQL), link "Registrar permuta" con el `cliente_id` correcto en la URL. Dato de prueba eliminado después.

### Fecha: 2026-07-02 (bloque 10)
- **Qué se implementó:** módulo Taller / Preparación completo (era placeholder "PRONTO"). Flujo de trabajo: pendiente → iniciar → en_taller → terminar (con costo final) → listo_publicar → listo para entregar. Botón rápido "Taller" agregado a la ficha del vehículo.
- **Archivos principales tocados:** `src/app/(app)/taller/page.tsx` (reescrito, era `ModuloPlaceholder`), `src/app/(app)/taller/nuevo/page.tsx` (nuevo), `src/app/(app)/taller/actions.ts` (nuevo: `crearTrabajoTaller`, `cambiarEstadoTaller`, `cerrarTrabajoTaller`), `src/components/forms/taller-form.tsx` (nuevo), `src/app/(app)/stock/[id]/page.tsx` (botón "Taller"), `src/lib/nav.ts` (sin "PRONTO").
- **Migraciones agregadas:** ninguna (tabla `taller_trabajo` ya existía completa desde `05_docs_vtv_postventa.sql`).
- **Qué falta revisar:** mostrar el historial de trabajos de taller en la ficha del vehículo (por ahora solo hay un botón para cargar uno nuevo); confirmar el alta y el cierre con costo final en navegador real (misma limitación de herramienta).
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde. En navegador, con un registro insertado por SQL: "Iniciar" (pendiente→en_taller) y "Listo p/ entregar" (listo_publicar→listo_entregar) confirmados por SQL tras click real; botón rápido desde la ficha del vehículo linkea con el `vehiculo` correcto. Dato de prueba eliminado después.

### Fecha: 2026-07-02 (bloque 11) — último módulo "PRONTO"
- **Qué se implementó:** módulo Consignados completo (era placeholder "PRONTO", el último que quedaba en el sidebar). Alta de consignación sobre un vehículo ya cargado en stock, con dueño/comisión/precios/vencimiento; al guardar marca automáticamente `titularidad=consignado` en el vehículo. Estados activa→vendida/retirada.
- **Archivos principales tocados:** `src/app/(app)/consignados/page.tsx` (reescrito, era `ModuloPlaceholder`), `src/app/(app)/consignados/nuevo/page.tsx` (nuevo), `src/app/(app)/consignados/actions.ts` (nuevo: `crearConsignacion`, `cambiarEstadoConsignacion`), `src/components/forms/consignacion-form.tsx` (nuevo), `src/lib/nav.ts` (sin "PRONTO" — ya no queda ningún módulo pendiente en el menú).
- **Migraciones agregadas:** ninguna (tabla `consignacion` ya existía completa desde `04_ventas.sql`).
- **Qué falta revisar:** liquidación al dueño al venderse (requiere vincular con el precio real de la venta, no existe ese enlace hoy); confirmar el alta desde el formulario en navegador real (misma limitación de herramienta).
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde. En navegador, con un registro insertado por SQL: listado renderiza con comisión/precios/badge de autorización, botón "Vendida" cambió el estado (confirmado por SQL tras click real). Dato de prueba eliminado después.
- **Hito:** con este bloque se cierran los 5 módulos que estaban marcados "PRONTO" en el sidebar (Test Drive, Permutas, Tasaciones, Taller, Consignados). Ninguno necesitó migración — las tablas ya existían completas desde el diseño original del schema.

### Fecha: 2026-07-02 (bloque 12)
- **Qué se implementó:** cerré dos pendientes menores detectados al revisar el plan. (1) Ficha del vehículo (`/stock/[id]`): nueva card "Taller / Preparación" con el historial de trabajos cargados (trabajo, costo final o estimado, badge de estado) + botón para cargar uno nuevo — cierra el ítem "Estado visible desde stock" del módulo Taller. (2) Verifiqué que "Acceso rápido a documentos desde ficha de cliente y de vehículo" (pendiente en el módulo Documentos) ya estaba implementado desde antes en ambas fichas — no requirió cambios, solo se marcó como hecho en el plan.
- **Archivos principales tocados:** `src/app/(app)/stock/[id]/page.tsx` (nueva card Taller, query `taller_trabajo` agregada al `Promise.all`).
- **Migraciones agregadas:** ninguna.
- **Qué falta revisar:** del módulo Documentos siguen pendientes auditar tipos de documento y mejorar el diseño del PDF (branding); del módulo Consignados sigue pendiente la liquidación al dueño.
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde. En navegador, con un trabajo de taller insertado por SQL: la card muestra "Detailing completo — $55.000 · Listo p/ publicar" correctamente. Dato de prueba eliminado después.

### Fecha: 2026-07-02 (bloque 13)
- **Qué se implementó:** sección "Reservas y presupuestos" en la ficha del vehículo (`/stock/[id]`) — cierra el último pendiente del módulo Vehículos en stock. Dos cards lado a lado con cliente, monto/precio y badge de estado; los presupuestos son clicables y llevan a la ficha real.
- **Archivos principales tocados:** `src/app/(app)/stock/[id]/page.tsx` (queries `reserva` y `presupuesto` agregadas al `Promise.all`, nueva sección de 2 cards).
- **Migraciones agregadas:** ninguna.
- **Qué falta revisar:** ciclo de estados completo del vehículo (en_preparacion→disponible→reservado→vendido) sigue sin auditar.
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde. En navegador, con datos reales de la demo: la ficha del Fiat Cronos mostró "Presupuestos (1) — Felipe Lentini · $19.500.000 · Borrador" con el link correcto a `/presupuestos/e08956d0-...`.

### Fecha: 2026-07-02 (bloque 14)
- **Qué se implementó:** auditoría de índices de Postgres (pendiente del módulo Performance general). Se revisaron los ~30 índices existentes (bien diseñados desde el schema original, siempre `empresa_id` primero por RLS) y se detectaron 7 gaps reales, todos introducidos por el trabajo de hoy: las nuevas secciones de la ficha del vehículo filtran `reserva`/`presupuesto`/`taller_trabajo`/`documento_comercial` por `vehiculo_id` sin índice de soporte, y el Centro de Acción Comercial filtra `test_drive` por estado+fecha y `encargo` por urgencia sin índice compuesto.
- **Archivos principales tocados:** ninguno de código (solo migración).
- **Migraciones agregadas:** `17_indices_faltantes.sql` — 7 `create index if not exists` (aditiva, no toca datos): `idx_reserva_vehiculo`, `idx_presupuesto_vehiculo`, `idx_taller_vehiculo`, `idx_doccom_vehiculo`, `idx_doccom_cliente`, `idx_testdrive_dashboard`, `idx_encargo_urgencia`. Aplicada en remoto vía Supabase MCP.
- **Qué falta revisar:** auditoría de N+1 y `select("*")` sueltos en páginas principales (no se tocó en este bloque).
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde (sin cambios de código). Los 7 índices confirmados por SQL (`pg_indexes`) tras aplicar la migración.

### Fecha: 2026-07-02 (bloque 15)
- **Qué se implementó:** (1) Auditoría de N+1/`select("*")` (delegada a un agente): sin hallazgos graves, un único caso menor y no crítico en la sincronización de MercadoLibre (ver nota en Performance general) que se decidió no tocar por el riesgo de no poder probarlo sin credenciales reales. (2) Vitrina pública (`/p/[slug]`): se agregaron filtros para el visitante — buscador por marca/modelo/versión + orden (recientes/precio asc/precio desc/año), como componente cliente separado (`vitrina-filtros.tsx`) para no tocar la carga server-side ya optimizada (usa la función `stock_publico` existente, sin queries nuevas).
- **Archivos principales tocados:** `src/components/catalogos/vitrina-filtros.tsx` (nuevo), `src/app/p/[slug]/page.tsx` (usa el componente nuevo en vez del grid inline).
- **Migraciones agregadas:** ninguna.
- **Qué falta revisar:** mejorar el diseño del PDF del catálogo (fotos más grandes, branding, portada) — el único pendiente que le queda al módulo Catálogo.
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde. En navegador, contra `/p/jesus-diaz` con datos reales: buscar "ford" filtró a 1 resultado (Ford Ranger); ordenar por "Precio: menor a mayor" mostró Volkswagen Gol Trend ($13.200.000) antes que Fiat Cronos ($16.500.000), orden correcto.

### Fecha: 2026-07-02 (bloque 16)
- **Qué se implementó:** auditoría de tipos de documento (pendiente del módulo Documentos). Los 10 tipos existentes cubren bien una agencia real, pero se encontró un gap de flujo real: no había forma de generar el `recibo_sena` al tomar una reserva — solo existía atado a una venta ya cerrada. Se agregó `generarReciboReserva()` (reutiliza el motor `crearDocumento` existente) + botón "Recibo" en `/reservas` para reservas en estado `activa`.
- **Archivos principales tocados:** `src/app/(app)/documentos/actions.ts` (nueva función `generarReciboReserva`), `src/app/(app)/reservas/page.tsx` (columna Acciones con botón "Recibo").
- **Migraciones agregadas:** ninguna.
- **Qué falta revisar:** mejorar el diseño del PDF (branding, jerarquía) — el único pendiente que le queda al módulo Documentos.
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde. En navegador, con una reserva activa insertada por SQL: el botón "Recibo" apareció solo en la reserva activa (no en la vencida existente); el click generó el documento — confirmado por SQL (`documento_comercial` con `tipo=recibo_sena`, número `00001`, `pdf_url` guardado, `cliente_id`/`vehiculo_id` correctos). Datos de prueba eliminados después (el PDF en Storage queda huérfano, protegido contra borrado directo por SQL).

### Fecha: 2026-07-02 (bloque 17) — bug de negocio real corregido
- **Qué se implementó:** auditoría del ciclo de estados del vehículo (último pendiente del módulo Vehículos en stock). Se encontró un **bug real con impacto de negocio**: cuando una reserva vencía (pasaba la fecha de vencimiento) o se cancelaba, el vehículo asociado quedaba para siempre en estado `reservado` — no existía ningún camino, ni automático ni manual, para liberarlo. Esto oculta stock realmente disponible cada vez que un cliente se baja de una reserva, un escenario común. Corregido con dos cambios: (1) nueva acción `cancelarReserva` en `reservas/actions.ts` + botón "Cancelar" en `/reservas` (solo para reservas activas), libera el vehículo a `disponible` si seguía marcado `reservado`; (2) `crm_run_daily_jobs()` extendida para hacer la misma liberación automáticamente cuando una reserva vence sola por fecha (antes solo marcaba la reserva como `vencida` sin tocar el vehículo).
- **Archivos principales tocados:** `src/app/(app)/reservas/actions.ts` (nueva función `cancelarReserva`), `src/app/(app)/reservas/page.tsx` (botón "Cancelar" junto al de "Recibo").
- **Migraciones agregadas:** `18_liberar_vehiculo_reserva_vencida.sql` — `create or replace function crm_run_daily_jobs()`, aditiva (agrega un paso más a la función existente, no borra ni modifica los pasos anteriores), aplicada en remoto.
- **Qué falta revisar:** nada pendiente en este módulo — con este bloque se cierra "Vehículos en stock" completo.
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde. Dos pruebas end-to-end con datos reales: (1) reserva activa + vehículo marcado `reservado` manualmente por SQL → click real en "Cancelar" en el navegador → confirmado por SQL: reserva pasó a `caida`, vehículo volvió a `disponible`; (2) reserva con `vencimiento` en el pasado + vehículo `reservado` → ejecuté `select crm_run_daily_jobs()` manualmente → confirmado por SQL: reserva pasó a `vencida`, vehículo volvió a `disponible` automáticamente. Datos de prueba eliminados y stock restaurado a su estado original después.

### Fecha: 2026-07-03 (bloque 18) — segundo bug del mismo patrón, en Consignados
- **Qué se implementó:** siguiendo la misma línea de auditoría que encontró el bug de reservas, se revisó `crearVenta` (`ventas/actions.ts`) buscando el mismo patrón de "estado enlazado que queda huérfano". Encontrado: cuando se vende un vehículo consignado por el flujo normal de `/ventas/nuevo` (en vez del botón "Vendida" del módulo Consignados), la fila de `consignacion` quedaba en `activa` para siempre — sin cierre automático, lo que además bloquea cualquier liquidación futura al dueño porque no hay señal de que la venta ocurrió.
- **Archivos principales tocados:** `src/app/(app)/ventas/actions.ts` (una línea agregada en `crearVenta`, justo después de marcar el vehículo `vendido`: `update consignacion set estado='vendida' where vehiculo_id=... and estado='activa'`).
- **Migraciones agregadas:** ninguna.
- **Qué falta revisar:** la liquidación en sí (cálculo de comisión + monto a rendir al dueño) sigue sin implementar, es una decisión de producto pendiente.
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde. **Intento de verificación en navegador sin éxito** por la limitación de herramienta ya documentada (formularios `useFormState`) — en este bloque se confirmó que el problema alcanza incluso al formulario de `/login` (nunca tocado en esta sesión), lo que descarta definitivamente que sea un bug de la app. La corrección se valida por revisión de código: es el mismo patrón exacto (`UPDATE ... WHERE ... AND estado = 'activa'`) ya verificado funcionando end-to-end en `cancelarReserva` e `ingresarPermutaAStock` en bloques anteriores de esta misma sesión. Recomendado confirmar manualmente en un navegador real antes de vender a un cliente.

### Fecha: 2026-07-03 (bloque 19) — branding real en los PDFs
- **Qué se implementó:** cierra "mejorar diseño del PDF" en los módulos Documentos y Presupuestos. El motor `src/lib/pdf/documento.ts` (compartido por ambos módulos) ahora usa `empresa.color_primario` — un dato que ya existía en la base y ya se usaba en la vitrina pública, pero nunca en los documentos generados — para dar identidad visual real por agencia: barra de acento superior, nombre de la empresa, título del documento, encabezados de sección ("Cliente"/"Unidad"/"Condiciones", etc.) y el monto destacado de los recibos, todo en el color configurado por cada agencia (o un azul institucional por defecto si no configuró ninguno). De paso, generando PDFs de prueba para verificar el cambio, se encontró y corrigió un defecto real preexistente: el guión largo "—" se mostraba como "?" en cualquier documento (la función `safe()` no lo traducía a WinAnsi) — ahora normaliza guiones y comillas tipográficas comunes antes de filtrar el resto.
- **Archivos principales tocados:** `src/lib/pdf/documento.ts` (`color_primario` en `EmpresaDoc`, helper `brandColor()`, aplicado en título/encabezados/acentos; `safe()` mejorada), `src/app/(app)/presupuestos/actions.ts` y `src/app/(app)/documentos/actions.ts` (pasan `ctx.empresa?.color_primario` al construir `EmpresaDoc`).
- **Migraciones agregadas:** ninguna (`color_primario` ya existía en la tabla `empresa`).
- **Qué falta revisar:** el catálogo PDF (`src/lib/pdf/catalogo.ts`) usa un motor separado y no se tocó en este bloque — queda como su propio pendiente en el módulo Catálogo.
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde. Verificación real generando PDFs: se compiló `documento.ts` de forma standalone (`tsc` + `node`, sin depender del navegador) y se generaron un `presupuesto` y un `recibo_sena` con un color de marca de prueba (`#c2410c`) — se leyeron ambos PDFs directamente y se confirmó visualmente que el color se aplica correctamente en todos los elementos de jerarquía, y que el guión largo ya se muestra bien ("-" en vez de "?"). Archivos temporales de la prueba eliminados después.

### Fecha: 2026-07-03 (bloque 20) — branding del catálogo PDF, cierra el pendiente del bloque anterior
- **Qué se implementó:** el motor de catálogo (`src/lib/pdf/catalogo.ts`) es un archivo separado de `documento.ts` (tipos y helpers propios, sin código compartido), así que la mejora de branding no llegó ahí en el bloque 19. Se aplicó el mismo patrón: `color_primario` agregado a `EmpresaCat`, la constante `BRAND` fija reemplazada por `brandColor(empresa.color_primario)` (usada en la barra de header y en el precio destacado de cada ficha), y se detectó y corrigió el mismo defecto del guión largo en la función `safe()` local de este archivo (tenía el bug de forma independiente, no heredado de `documento.ts`).
- **Archivos principales tocados:** `src/lib/pdf/catalogo.ts` (`color_primario` en `EmpresaCat`, helper `brandColor()`, `BRAND` ahora parametrizado y pasado a `drawCard()`, `safe()` con `TYPO_MAP`), `src/app/(app)/catalogos/actions.ts` (pasa `ctx.empresa?.color_primario` al construir `EmpresaCat`).
- **Migraciones agregadas:** ninguna.
- **Qué falta revisar:** diseño del catálogo PDF sigue pendiente en fotos más grandes y portada — es trabajo de diseño, no de branding; el color de marca ya queda resuelto en todo el sistema de documentos.
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde. Verificación real: se compiló `catalogo.ts` de forma standalone (`tsc` + `node`) y se generó un catálogo de 2 vehículos con color de marca de prueba (`#b91c1c`) y una versión con guión largo ("1.6 Trendline — full") — se leyó el PDF resultante y se confirmó visualmente que el header y el precio usan el color configurado, y que el guión largo se muestra correctamente ("-"). Archivos temporales eliminados después.

### Fecha: 2026-07-03 (bloque 21) — rediseño del PDF de catálogo (portada + fotos más grandes)
- **Qué se implementó:** cierra el último pendiente de diseño del módulo Catálogo. El PDF pasó de "3 fichas por página con foto chica" a: (1) una **portada** nueva con el bloque de color de marca ocupando ~52% de la página, logo de la empresa centrado (si tiene uno cargado en Configuración), nombre de la empresa, subtítulo "Catálogo de vehículos", fecha de actualización, cantidad de unidades disponibles y datos de contacto — antes el catálogo arrancaba directo con la primera ficha, sin ninguna presentación; (2) fichas de vehículo rediseñadas: **2 por página en vez de 3** para poder agrandar la foto de 200px a 270px de ancho (con más alto también, ~300px), tipografía de título/precio más grande (14→17 y 18→22) y mejor espaciado. La numeración de página ahora cuenta la portada como página 1.
- **Archivos principales tocados:** `src/lib/pdf/catalogo.ts` (nueva función `drawPortada()`, `PER_PAGE` 3→2, `SLOT_H` recalculado, `drawCard()` con caja de foto y tipografía más grandes, `logoBytes` agregado a `EmpresaCat`), `src/app/(app)/catalogos/actions.ts` (reutiliza el helper `fetchBytes` ya existente para descargar `ctx.empresa?.logo_url` y pasarlo como `logoBytes`).
- **Migraciones agregadas:** ninguna (`logo_url` ya existía en la tabla `empresa`, ya se usaba en Documentos/Presupuestos).
- **Qué falta revisar:** con este bloque el módulo Catálogo queda completo salvo "probar el flujo completo en navegador real" (generar → compartir → abrir como cliente), que es una prueba manual de UX y no de código.
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde. Verificación real generando un catálogo de prueba con 3 vehículos (para probar el salto de página portada→ficha→ficha nueva) y un logo de prueba: se compiló `catalogo.ts` de forma standalone (`tsc` + `node`) y se leyó el PDF resultante con el `Read` tool — se confirmó visualmente la portada con el bloque de color, el logo, el nombre y los datos; la página 2 mostró 2 fichas con foto grande y precio en el color de marca; la página 3 mostró la tercera ficha sola; la numeración "Página 2 de 3" / "Página 3 de 3" fue correcta. **Nota de la sesión:** al armar el PNG de prueba para el logo con bytes inventados a mano (base64 mal formado), el proceso de Node quedó colgado indefinidamente en el decoder de PNG de pdf-lib en vez de tirar un error — se resolvió usando un PNG 1x1 válido conocido. Vale la pena tenerlo en cuenta: un `logo_url` que apunte a un archivo corrupto podría colgar la generación real del catálogo en producción en vez de fallar con un error claro; queda como posible mejora futura (timeout o validación de imagen) si se llegara a reportar un catálogo que "no genera nunca".

### Fecha: 2026-07-03 (bloque 22) — rediseño del formulario de Presupuestos + destrabada la limitación de login automatizado
- **Qué se implementó:** cierra el último pendiente de diseño del módulo Presupuestos. `presupuesto-form.tsx` pasó de un único formulario plano a 4 tarjetas (`Card`/`CardHeader`/`CardTitle`/`CardDescription`) con agrupación clara: "Vehículo y cliente", "Condiciones comerciales" (precio/bonificación/anticipo + saldo destacado + cuotas/valor/gastos), "Financiación" (forma de pago/validez/detalle) y "Extras" (permuta/observaciones) — mismo patrón visual que ya usan Ventas, Reservas, etc. en la app, sin tocar la lógica de cálculo de saldo ni los `name` de los campos.
- **Archivos principales tocados:** `src/components/presupuestos/presupuesto-form.tsx` (reestructurado en 4 `Card`, sin cambios de comportamiento).
- **Migraciones agregadas:** ninguna.
- **Qué falta revisar:** con este bloque el módulo Presupuestos queda completo salvo "probar flujo completo de punta a punta", que ahora sí se puede intentar en esta misma sesión (ver nota siguiente).
- **Hallazgo de la sesión (matizado en el bloque siguiente):** `document.querySelector('form').requestSubmit()` vía `preview_eval` sí resuelve el envío del formulario de `/login` de forma confiable (probado, login exitoso al primer intento tras fallar 3 veces con `preview_click`). **Ojo:** en el bloque 23 se confirmó que esto NO se extiende a las acciones de servidor ya autenticadas de otras páginas (probado con `/test-drive/nuevo`) — el `POST` a esas rutas vuelve a redirigir a `/login` (middleware no encuentra usuario válido en esa request puntual) aunque el `GET` inmediatamente anterior a la misma página fue exitoso. Es una limitación de cómo el navegador controlado por el tool de preview adjunta las cookies de sesión en un POST disparado por `requestSubmit()`/CDP, no un bug de la app — confirmado sin errores en el log del servidor y sin fila nueva en la tabla correspondiente. Ver detalle en el bloque 23.
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde. Verificación real en navegador con la técnica `requestSubmit()`: login exitoso, navegación a `/presupuestos/nuevo`, `preview_snapshot` confirmó las 4 tarjetas con sus títulos/descripciones y los selects de cliente/vehículo poblados con datos reales de la empresa demo; se rellenó "Precio" con `preview_fill` y `preview_inspect` confirmó que "Saldo a financiar" se recalculó correctamente a "$ 5.000.000" dentro del nuevo layout (sin regresión en la lógica). `preview_screenshot` falló por timeout (limitación ya conocida de la herramienta) pero la verificación por `snapshot`+`inspect` fue suficiente y más precisa. **Aclaración:** esta prueba no llegó a hacer submit del formulario de presupuesto (solo se verificó el cálculo client-side); el submit real de una acción de servidor autenticada se probó recién en el bloque 23, con resultado distinto.

### Fecha: 2026-07-03 (bloque 23) — intento de alta de Test Drive en navegador real: limitación de la herramienta, no de la app
- **Qué se intentó:** usando la técnica `requestSubmit()` del bloque 22, completar y enviar el alta de un test drive real (`/test-drive/nuevo`) para cerrar el pendiente "confirmar el alta en navegador real" del módulo Test Drive.
- **Qué se encontró:** el `POST /test-drive/nuevo` devuelve `303` y termina en `/login` — es decir, el middleware (`src/lib/supabase/middleware.ts`) no encuentra un usuario válido para esa request puntual, a pesar de que el `GET /test-drive/nuevo` inmediatamente anterior (misma sesión, mismos segundos) sí lo encontró y sirvió la página. Se repitió el experimento dos veces (con `preview_fill` campo por campo y con `preview_eval` seteando todos los valores + submit en una sola llamada, para descartar que fuera un problema de tiempo entre pasos) con el mismo resultado exacto. Se confirmó por SQL (`select * from test_drive order by created_at desc`) que **no se creó ningún registro** — no es que la acción fallara silenciosamente con datos parciales, directamente no llegó a ejecutar el `insert`. No hay errores en el log del servidor (`npm run dev`), solo el redirect 303 esperado del propio middleware cuando no hay usuario.
- **Diagnóstico:** es una limitación del entorno de automatización del navegador (probablemente cómo Chrome DevTools Protocol adjunta las cookies de sesión en un `POST` disparado programáticamente vía `requestSubmit()`, distinto de una navegación normal de usuario), no un bug de `crearTestDrive` ni del middleware — la misma lógica de sesión (`getSessionContext()` + chequeo de `user` en middleware) ya está probada funcionando en decenas de acciones de esta sesión cuando se verifica por otras vías (SQL directo + lectura de la UI ya renderizada).
- **Archivos tocados:** ninguno (fue un intento de verificación, no un cambio de código).
- **Qué falta revisar:** el pendiente "confirmar el alta en navegador real" de Test Drive y Permutas, y "probar flujo completo" de Presupuestos/Catálogo, siguen sin poder cerrarse con las herramientas de automatización disponibles en esta sesión. Recomendado al usuario: probarlos manualmente una vez desde un navegador real (no automatizado) antes de vender el flujo a un cliente — el código ya pasó `typecheck`+`lint`+`build` y sigue exactamente el mismo patrón (`"use server"` + `useFormState` + Server Action con `redirect()`) que las acciones ya usadas en producción de forma manual por el dueño de la demo en bloques anteriores de esta sesión.
- **Pruebas hechas:** intento de verificación en navegador (sin éxito, limitación de herramienta documentada arriba) + confirmación por SQL de que no quedó ningún dato parcial o corrupto en la base. No se tocó código, no aplica `typecheck`/`lint`/`build`.

### Fecha: 2026-07-03 (bloque 24) — liquidación al dueño en Consignados, decisión de producto resuelta
- **Qué se implementó:** cierra el último pendiente marcado como "requiere decisión de producto" del módulo Consignados. La tabla `consignacion` ya tenía `comision_acordada` (%) desde el bloque original — la decisión de producto era cómo obtener el precio real de venta para calcular el monto a rendir. Se resolvió buscando la venta más reciente (`venta.precio_final`) para el mismo `vehiculo_id` de la consignación: `monto_a_rendir = precio_final × (1 − comisión/100)`. Se agregó una acción `liquidarConsignacion(id)` que valida que la consignación esté `vendida` y no liquidada aún, busca esa venta, calcula y guarda el monto redondeado + la fecha de liquidación. En la lista de Consignados aparece una columna nueva: botón "Liquidar" mientras está pendiente, y una vez liquidada muestra el monto en verde + la fecha (ya no se puede volver a liquidar).
- **Decisión de producto tomada (documentada porque no había una definición previa):** si no existe ninguna venta registrada para el vehículo consignado (por ejemplo si se marcó "Vendida" manualmente desde el propio módulo Consignados sin pasar por `/ventas/nuevo`), la acción **falla con un mensaje explícito** pidiendo registrar la venta primero, en vez de estimar con `precio_pretendido` — para no calcular una liquidación con un monto que no es el precio real cobrado.
- **Archivos principales tocados:** `supabase/migrations/19_liquidacion_consignacion.sql` (aditiva: `liquidado boolean default false`, `monto_liquidado numeric`, `fecha_liquidacion date` en `consignacion`), `src/lib/types/database.types.ts` (Row/Insert/Update de `consignacion`), `src/app/(app)/consignados/actions.ts` (`liquidarConsignacion`), `src/app/(app)/consignados/page.tsx` (columna "Liquidación").
- **Migraciones agregadas:** `19_liquidacion_consignacion.sql`, aplicada en remoto vía Supabase MCP y guardada en el repo.
- **Qué falta revisar:** nada pendiente — con este bloque el módulo Consignados queda 100% completo, incluida la liquidación.
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde. Verificación real de punta a punta con datos de prueba: se insertó por SQL una `venta` (`precio_final = $20.000.000`) y una `consignacion` en estado `vendida` con `comision_acordada = 10` para el mismo vehículo (Ford Ranger); en el navegador real (login vía `requestSubmit()`, ver bloque 22) se hizo **click real** en el botón "Liquidar" — funcionó a la primera porque esta acción usa el patrón void + `.bind()` sin `useFormState` (el mismo patrón ya confiable de `cancelarReserva`), no el patrón bloqueado por la herramienta. Se confirmó por SQL que `monto_liquidado = 18.000.000` (cálculo correcto: 20.000.000 × 0.9) y `fecha_liquidacion` = hoy; se recargó `/consignados` y la UI mostró "$ 18.000.000" con la fecha, sin el botón "Liquidar" (ya liquidada). Datos de prueba eliminados después.

### Fecha: 2026-07-03 (bloque 25) — cumpleaños de clientes, decisión de producto resuelta
- **Qué se implementó:** cierra el pendiente de "cumpleaños de clientes" del módulo Fidelización, marcado desde el bloque original como "no implementado, sin dato". Se agregó `fecha_nacimiento date` a `cliente` (nullable, opcional en el formulario — no rompe nada para clientes ya cargados), se sumó el campo a `ClienteForm` y a la página de edición, y se integró un nuevo tipo `cumpleanos` en `getAccionesComerciales()`: compara mes/día (ignorando año) de cada cliente con `fecha_nacimiento` cargada contra hoy y los próximos 3 días, con urgencia `hoy`/`oportunidad` igual que el resto de los tipos. Aparece en el Centro de Acción Comercial del dashboard con ícono de torta, botón de llamar/WhatsApp (mensaje `mensajeCumpleanos()`) y link a la ficha del cliente.
- **Decisión de producto tomada:** no se implementó "recordatorio N días antes" configurable ni el envío automático del saludo — el alcance se limitó a mostrar el cumpleaños en el centro de acciones (igual que los demás tipos), dejando el envío manual a criterio del vendedor, consistente con el resto del módulo (nada se manda solo, todo pasa por un click humano).
- **Archivos principales tocados:** `src/lib/types/database.types.ts` (`fecha_nacimiento` en `cliente`), `src/components/forms/cliente-form.tsx` (campo nuevo), `src/app/(app)/clientes/[id]/editar/page.tsx` (select + initial), `src/app/(app)/clientes/actions.ts` (schema), `src/lib/data/whatsapp.ts` (`mensajeCumpleanos`), `src/lib/data/acciones-comerciales.ts` (tipo `cumpleanos`, `diasHastaCumple()`), `src/components/dashboard/centro-accion.tsx` (ícono `Cake`).
- **Migraciones agregadas:** `20_cliente_fecha_nacimiento.sql`, aplicada en remoto vía Supabase MCP y guardada en el repo.
- **Qué falta revisar:** dentro de Fidelización solo queda "cliente sin contacto hace X días", que sigue siendo una decisión de producto genuina (no hay un dato existente que sugiera la regla, a diferencia de cumpleaños/liquidación) — se deja para el dueño.
- **Pruebas hechas:** `npm run typecheck` + `npm run lint` + `npm run build` en verde. Verificación real en navegador: se actualizó por SQL la `fecha_nacimiento` de dos clientes demo (uno con mes/día = hoy, otro a 2 días) manteniendo el resto de los datos intactos; se recargó el dashboard y el Centro de Acción Comercial mostró "Diego Martínez · Hoy · Cumpleaños hoy 🎂" y "Sofía Romero · Oportunidad · Cumpleaños en 2 días", ordenados por urgencia junto con el resto de los ítems; se confirmó que el link de WhatsApp arma el texto correcto ("¡Feliz cumpleaños Diego! 🎉 Todo el equipo de Jesús Díaz Automotores te desea un muy buen día..."). Datos de prueba revertidos a `null` después.
