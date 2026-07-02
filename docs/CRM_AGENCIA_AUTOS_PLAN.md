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
- [ ] Formato de dinero
- [ ] Fidelización y alertas comerciales
- [ ] Presupuestos *(base funcional hecha; faltan mejoras UX/PDF/modal)*
- [ ] Vehículos en stock
- [ ] Test Drive
- [ ] Permutas
- [ ] Tasaciones
- [ ] Taller / Preparación
- [ ] Consignados
- [ ] Ocultar Garantías y Reclamos
- [ ] Documentos
- [ ] Catálogo *(base funcional hecha; faltan mejoras de PDF y vitrina)*
- [ ] Dashboard Centro de Acción Comercial

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

## Formato de dinero

> Ya existe `formatARS()` en `src/lib/format.ts` (es-AR, sin decimales) para MOSTRAR valores.
> El problema es la CARGA: los inputs de dinero son numéricos crudos, sin separador de miles.

- [ ] Componente de input de dinero (muestra `$ 12.500.000` mientras se escribe, guarda número limpio)
- [ ] Aplicarlo en formulario de presupuesto (precio, anticipo, bonificación, gastos, valor cuota)
- [ ] Aplicarlo en alta/edición de vehículo (precio compra, precio venta)
- [ ] Aplicarlo en clientes (presupuesto aprox.), créditos, ventas, reservas y demás formularios con montos
- [ ] Verificar que TODA visualización de montos use `formatARS` (barrido global, sin números crudos)

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

## Vehículos en stock

- [ ] Auditar listado: filtros, orden, paginación, velocidad
- [ ] Ficha de vehículo: fotos, datos completos, historial (reservas, presupuestos, consultas asociadas)
- [ ] Acciones rápidas desde el vehículo: presupuestar, reservar, publicar, compartir por WhatsApp
- [ ] Estados del ciclo (en preparación → disponible → reservado → vendido) consistentes en toda la app
- [ ] Formato de moneda en alta/edición
- [ ] Probar flujo completo (alta → preparación → publicado → reservado → vendido)

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

## Ocultar Garantías y Reclamos

- [ ] Quitar `/garantias` y `/reclamos` del menú de navegación (`src/lib/nav.ts`) — no se van a implementar por ahora
- [ ] Verificar que no queden links rotos hacia esas rutas en el resto de la app

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

## Dashboard Centro de Acción Comercial

> Objetivo: abrir el CRM y saber al instante **a quién contactar hoy** y qué está por vencerse.

- [ ] Lista unificada accionable: seguimientos vencidos y de hoy
- [ ] Presupuestos enviados por vencer / vencidos (por fecha de validez)
- [ ] Créditos por terminar (últimas cuotas) y cuotas impagas
- [ ] Encargos activos con coincidencias potenciales en stock
- [ ] Reservas activas y VTV por vencer
- [ ] Acciones rápidas en cada ítem: WhatsApp, llamar, abrir ficha, marcar resuelto
- [ ] Alertas de fidelización integradas (ver módulo Fidelización)
- [ ] Sin migración: derivar todo de tablas existentes
- [ ] Probar con datos reales de demo

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
