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

- [ ] Performance general *(ficha de cliente hecha; falta auditar el resto de listados pesados)*
- [x] Formato de dinero
- [ ] Fidelización y alertas comerciales
- [ ] Presupuestos *(base funcional hecha; faltan mejoras UX/PDF/modal)*
- [ ] Vehículos en stock *(paginación + acciones rápidas hechas; falta auditoría del ciclo de estados completo)*
- [ ] Test Drive
- [ ] Permutas
- [ ] Tasaciones
- [ ] Taller / Preparación
- [ ] Consignados
- [x] Ocultar Garantías y Reclamos
- [ ] Documentos
- [ ] Catálogo *(base funcional hecha; faltan mejoras de PDF y vitrina)*
- [x] Dashboard Centro de Acción Comercial

---

## Performance general

- [x] Ficha de cliente instantánea: shell inmediato (header + contacto) + actividad por streaming con `Suspense`
- [x] Eliminar `getFormOptions()` (cargaba TODA la base) del camino crítico de la ficha de cliente
- [x] `loading.tsx` con skeleton para la navegación a la ficha de cliente
- [x] Paginación en listado de clientes (30 por página, con contador y Anterior/Siguiente)
- [ ] Auditar y paginar los demás listados grandes (stock, ventas, seguimientos, presupuestos, documentos)
- [ ] `loading.tsx` / skeletons en las rutas pesadas restantes
- [ ] Revisar N+1 y selects `*` innecesarios en páginas principales
- [ ] Revisar índices en Postgres para los filtros más usados (solo migración aditiva)

## Formato de dinero ✅ (2026-07-02)

> Ya existe `formatARS()` en `src/lib/format.ts` (es-AR, sin decimales) para MOSTRAR valores.
> El problema era la CARGA: los inputs de dinero eran numéricos crudos, sin separador de miles.

- [x] Componente `MoneyInput` (`src/components/ui/money-input.tsx`): muestra `$ 12.500.000` mientras se escribe (input visible formateado + input oculto con el número limpio para el `FormData`)
- [x] Aplicado en formulario de presupuesto (precio, anticipo, bonificación, gastos, valor cuota)
- [x] Aplicado en alta/edición de vehículo (precio venta, precio costo)
- [x] Aplicado en clientes (presupuesto aprox.), créditos (monto pagado), ventas (precio final, seña), reservas (monto seña), encargos (presupuesto máx.), documentos (precio), gasto de stock
- [x] Verificado que toda visualización de montos ya usa `formatARS` (barrido con grep, sin números crudos filtrándose a la UI)
- Nota: el campo de comisiones (`/comisiones`, tipo % o $ fijo con decimales) se dejó como input numérico simple a propósito — `MoneyInput` es solo enteros y ese campo necesita decimales para el modo porcentaje.

## Fidelización y alertas comerciales

- [ ] Definir alertas comerciales: cumpleaños de clientes, aniversario de compra, service/VTV por vencer, cliente sin contacto hace X días
- [ ] Vista/sección de alertas con acción rápida (WhatsApp con mensaje prearmado por tipo de alerta)
- [ ] Plantillas de mensajes de fidelización (post-venta, cumpleaños, recordatorio VTV)
- [ ] Integrar estas alertas al Dashboard Centro de Acción Comercial
- [ ] Migración aditiva solo si hace falta persistir algo (ej. fecha de nacimiento del cliente)

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
- [ ] Abrir presupuesto en modal, popup o nueva pestaña sin sacar al usuario de la página actual
- [ ] Mejorar diseño visual del formulario (agrupación clara: vehículo / condiciones / financiación / extras)
- [ ] Mejorar resumen financiero (precio − bonificación − anticipo = saldo; cuotas destacadas)
- [ ] Mejorar PDF comercial (branding de agencia, jerarquía visual, condiciones legibles)
- [ ] Aplicar formato de moneda en inputs (ver módulo Formato de dinero)
- [ ] Mejorar mensaje de WhatsApp (más vendedor, con resumen de la operación)
- [ ] Vencimiento automático: marcar `vencido` cuando pasa la validez
- [ ] Probar flujo completo de punta a punta

## Vehículos en stock ✅ parcial (2026-07-02)

- [x] Auditar listado: filtros y orden ya existían; se agregó paginación (30/página, mismo patrón que clientes) y `loading.tsx`
- [ ] Ficha de vehículo: fotos, datos completos e historial ya existen (gastos, VTV, interesados, documentos, historial de cambios, matching de encargos); falta agregar reservas y presupuestos asociados a la unidad como sección propia
- [x] Acciones rápidas desde el vehículo: Presupuestar (`/presupuestos/nuevo?vehiculo=`), Reservar (`/reservas/nuevo?vehiculo=`, se agregó soporte de prefill al `ReservaForm`), Compartir por WhatsApp (`mensajeVehiculo`); "publicar" ya vive en `/publicaciones`
- [ ] Estados del ciclo (en preparación → disponible → reservado → vendido) consistentes en toda la app — no auditado en este bloque
- [x] Formato de moneda en alta/edición (bloque anterior, `MoneyInput`)
- [x] `loading.tsx` en `/stock` y `/stock/[id]` (la ficha es la ruta más pesada de la app, 69.9 kB)
- [ ] Probar flujo completo (alta → preparación → publicado → reservado → vendido) — no recorrido de punta a punta en este bloque, solo se probaron las acciones rápidas nuevas
- Nota: quedó pendiente para un próximo bloque el resto del ciclo de vida completo y la sección de reservas/presupuestos en la ficha.

## Test Drive

- [ ] Diseñar módulo mínimo real: agendar test drive (cliente + vehículo + fecha/hora + vendedor)
- [ ] Estados: agendado / realizado / no asistió / cancelado
- [ ] Vista de agenda (próximos test drives) + historial por cliente y por vehículo
- [ ] Recordatorio visible en dashboard/alarmas el día del turno
- [ ] Migración aditiva para la tabla si no existe
- [ ] Quitar "PRONTO" del menú recién cuando funcione
- [ ] Probar flujo completo

## Permutas

- [ ] Registrar vehículo entregado en parte de pago, vinculado a la operación (venta/presupuesto)
- [ ] Valor de toma + datos del vehículo entrante
- [ ] Al concretar, el vehículo tomado puede ingresar al stock (en preparación)
- [ ] Migración aditiva si hace falta
- [ ] Quitar "PRONTO" del menú al estar funcional
- [ ] Probar flujo completo

## Tasaciones

- [ ] Registro de tasaciones: cliente, vehículo a tasar, valor estimado, estado (pendiente / tasado / rechazada / convertida en permuta)
- [ ] Vincular tasación → permuta/presupuesto cuando avanza
- [ ] Migración aditiva si hace falta
- [ ] Quitar "PRONTO" del menú al estar funcional
- [ ] Probar flujo completo

## Taller / Preparación

- [ ] Checklist de preparación por vehículo (ítems: service, detailing, VTV, gestoría, etc.)
- [ ] Costos de preparación por ítem (impacta el costo real del vehículo)
- [ ] Estado visible desde stock: qué le falta a cada auto para estar disponible
- [ ] Migración aditiva si hace falta
- [ ] Quitar "PRONTO" del menú al estar funcional
- [ ] Probar flujo completo

## Consignados

- [ ] Alta de vehículo consignado: dueño (cliente), condiciones, comisión pactada
- [ ] Diferenciación visual en stock (badge "consignado")
- [ ] Liquidación al dueño al venderse
- [ ] Migración aditiva si hace falta
- [ ] Quitar "PRONTO" del menú al estar funcional
- [ ] Probar flujo completo

## Ocultar Garantías y Reclamos ✅ (2026-07-02)

- [x] Quitar `/garantias` y `/reclamos` del menú de navegación (`src/lib/nav.ts`) — no se van a implementar por ahora
- [x] Verificado que no quedan links hacia esas rutas en el resto de la app (las páginas `/garantias` y `/reclamos` siguen existiendo pero sin entrada de menú)

## Documentos

- [x] Módulo ya funcional (generación de boleto/recibo/etc. con PDF); quitado "PRONTO" del menú
- [ ] Auditar tipos de documento disponibles vs. los que una agencia necesita de verdad
- [ ] Mejorar diseño del PDF (branding, jerarquía)
- [ ] Acceso rápido a documentos desde ficha de cliente y de vehículo
- [ ] Probar flujo completo

## Catálogo

**Base ya construida (ciclo 2):**
- [x] Generación de catálogo PDF por selección de vehículos con filtros y orden (precio, año, marca, recientes)
- [x] Vitrina web pública `/p/[slug]` enlazada desde la página (card con link copiable, abrir, WhatsApp)
- [x] Historial de catálogos generados con abrir/WhatsApp/eliminar
- [x] Quitar "PRONTO" del menú

**Mejoras pendientes:**
- [ ] Mejorar diseño del PDF del catálogo (fotos más grandes, branding, portada)
- [ ] Mejorar vitrina pública: filtros para el visitante, botón de consulta por WhatsApp por vehículo
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
