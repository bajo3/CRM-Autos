# MVP Vendible — Plan maestro (fase 2)

> **Este es el plan activo del proyecto.** Reemplaza como fuente de verdad a `CRM_AGENCIA_AUTOS_PLAN.md`
> (que queda como registro histórico de la fase 1, ya completada).
> Regla de siempre: nada se marca `[x]` sin estar implementado Y verificado
> (`npm run typecheck && npm run lint && npm run build` en verde + prueba funcional cuando aplique).
> Commit checkpoint local en `master` al cerrar cada bloque. **Nunca push.**

## Objetivo de la fase

Convertir el CRM (funcionalmente completo tras la fase 1) en un **MVP vendible**:

1. **Rápido** — hoy hay ~3 segundos de delay entre pantalla y pantalla. Es el problema #1. Inaceptable para una demo.
2. **Fácil de usar** — que todo tenga un porqué. Un vendedor de agencia tiene que entender para qué sirve cada módulo sin que nadie se lo explique, y los módulos tienen que estar conectados entre sí (una tasación termina en una permuta o una compra; un encargo se cruza con el stock).
3. **Lindo** — estética consistente y profesional, en la app y sobre todo en lo que ve el cliente final (vitrina pública y PDFs).
4. **PDFs de calidad** — catálogo y documentos que den orgullo mandar por WhatsApp.
5. **VTV integrada** — al cargar un auto al stock se pregunta si tiene VTV vigente; el módulo VTV se alimenta solo.

**Orden de ejecución: las fases van en orden (1 → 6).** La velocidad primero porque contamina la percepción de todo lo demás.

---

## Diagnóstico de velocidad (hecho el 2026-07-03, base del plan)

Medido y leído en el código. El delay de ~3 s por navegación se explica por la suma de:

| # | Causa | Dónde | Costo estimado |
|---|-------|-------|----------------|
| 1 | `supabase.auth.getUser()` en el middleware = **viaje de red a Supabase Auth en CADA navegación** | `src/lib/supabase/middleware.ts:32` | ~200–500 ms |
| 2 | `getSessionContext()` en el layout hace **3 viajes más, secuenciales**: `getUser()` de nuevo + query `profile` + query `empresa` | `src/lib/auth/session.ts:18-47` + `src/app/(app)/layout.tsx:11` | ~400–800 ms |
| 3 | 41 páginas `force-dynamic` pero **solo 7 rutas tienen `loading.tsx`** → en las otras 34 la pantalla vieja queda congelada hasta que llega TODO el HTML nuevo | `src/app/(app)/**` | percepción: todo el delay junto |
| 4 | Algunas páginas hacen queries secuenciales (`await` encadenados) en vez de `Promise.all` | varias fichas y formularios | variable |
| 5 | En desarrollo (`next dev`) se suma compilación por ruta; la demo SIEMPRE debe correr con `next build && next start` | — | 1–3 s solo en dev |

Total: 4+ round-trips de red **seriales** antes de que el usuario vea un solo píxel nuevo. La solución no es una sola bala de plata sino eliminar viajes + mostrar esqueleto al instante.

---

## Fase 1 — Velocidad ⚡ (bloqueante, primero)

### 1.1 Middleware sin viaje de red

- [ ] Reemplazar `getUser()` (red) en `src/lib/supabase/middleware.ts` por validación **local** del JWT:
  - Opción A (preferida): `supabase.auth.getClaims()` — valida la firma localmente. Requiere migrar el proyecto Supabase a las **JWT signing keys asimétricas** (dashboard → Settings → JWT). Verificar primero con `execute_sql`/dashboard si ya está habilitado.
  - Opción B (fallback si A no se puede): `getSession()` (lee la cookie sin red) para la decisión de redirect. Es seguro porque el gate real es RLS: una cookie truchada no puede leer datos; si el token venció, el layout recibe contexto nulo y redirige a `/login`.
  - En ambos casos conservar el refresh de tokens (el `setAll` de cookies ya está armado).
- [ ] Probar explícitamente: sesión vigente navega normal; sesión vencida termina en `/login`; logout sigue funcionando.

### 1.2 `getSessionContext()`: de 3 viajes a 1

- [ ] Envolver en `React.cache()` para que layout + página + componentes compartan una sola ejecución por request.
- [ ] Una sola query con relación embebida: `profile.select("*, empresa(*)")` usando el patrón `rel()` del proyecto — elimina la segunda query.
- [ ] Obtener el `user id` sin segundo `getUser()` de red (mismo mecanismo que 1.1: claims/JWT local).
- [ ] Resultado esperado: **1 round-trip** por request para el contexto de sesión.

### 1.3 `loading.tsx` en TODAS las rutas (34 faltantes)

- [ ] Crear skeletons reutilizables en `src/components/ui/skeletons.tsx`: `ListPageSkeleton` (header + tabla), `FormPageSkeleton` (header + campos), `FichaSkeleton` (header + cards).
- [ ] Agregar `loading.tsx` a cada ruta de `src/app/(app)/**` que no tenga (usar el skeleton que corresponda al tipo de página). Rutas con `loading.tsx` hoy: raíz del grupo, `clientes/[id]`, `stock`, `stock/[id]`, `ventas`, `seguimientos`, `documentos`. **Todas las demás lo necesitan**, incluidas las `/nuevo` y `/editar`.
- [ ] Con esto + prefetch de `<Link>` (App Router prefetchea el boundary de loading), el click de menú muestra esqueleto en <100 ms **siempre**.

### 1.4 Auditoría de queries por página

- [ ] Grep de `await` secuenciales sobre `sb.from(...)` en `src/app/(app)/**/page.tsx`: todo lo paralelizable va a `Promise.all`.
- [ ] Revisar `getFormOptions()` (`src/lib/data/options.ts`): que no cargue tablas enteras sin límite en formularios (`select` mínimo de columnas, filtro por estado activo/disponible, límite razonable).
- [ ] Fichas pesadas (`clientes/[id]`, `stock/[id]`): lo secundario va en `<Suspense>` (patrón ya usado en ficha de cliente), lo crítico arriba.

### 1.5 Medición antes/después

- [ ] Baseline ANTES de tocar nada: `npm run build && npm run start`, navegar 5 rutas típicas y anotar los tiempos de render del server log en este archivo.
- [ ] Repetir DESPUÉS de 1.1–1.4 y documentar la mejora acá.
- [ ] Criterio de aceptación: esqueleto visible al instante en toda navegación; render completo típico **< 1 s** en build de producción.

**Notas de implementación fase 1:** _(completar al ejecutar)_

---

## Fase 2 — UX con sentido 🧭 (que todo tenga un porqué)

La pregunta del dueño: *"¿por qué tasaciones? ¿por qué permuta? ¿por qué encargos?"* — si él no lo ve, un comprador tampoco. Dos respuestas: **explicar** cada módulo en su propia pantalla y **conectar** los flujos para que ninguno sea un callejón sin salida.

### 2.1 Propósito visible en cada módulo

- [ ] Cada listado usa `PageHeader` con una `description` de una línea que dice PARA QUÉ sirve. Ejemplos de tono:
  - Tasaciones: *"Cuando un cliente pregunta cuánto vale su auto. Toda tasación puede terminar en una compra o una permuta."*
  - Permutas: *"El cliente entrega su usado como parte de pago. Si la aceptás, el auto entra solo al stock."*
  - Encargos: *"Un cliente busca un auto que no tenés. Cargalo acá y avisale cuando entre."*
  - Consignados: *"Autos de terceros que vendés por comisión. Acá controlás la liquidación al dueño."*
  - Seguimientos: *"Tu agenda comercial: a quién llamar y cuándo. Lo vencido aparece en el dashboard."*
- [ ] Empty states didácticos en TODOS los listados: icono + qué es + cuándo usarlo + botón CTA de alta. Componente reutilizable `EmptyState` en `src/components/ui/`.

### 2.2 Conectar los flujos (lo más importante de la fase)

- [ ] **Tasación → siguiente paso:** en la ficha/fila de una tasación terminada, botones "Convertir en permuta" y "Comprar para stock" que precargan los datos (vehículo, cliente, valor tasado). Una tasación nunca muere en sí misma.
- [ ] **Encargo ↔ stock (matching):** al listar encargos activos, cruzar contra stock disponible por marca/modelo (y precio aprox si está): mostrar badge "¡Hay 1 unidad que coincide!" con link + botón de WhatsApp al cliente con mensaje prearmado (`src/lib/data/whatsapp.ts`). Sin jobs ni triggers: el cruce se calcula al renderizar.
- [ ] **Permuta aceptada → stock:** ya existe; verificar que el link de vuelta (desde el vehículo creado a su permuta de origen) sea visible en la ficha del vehículo.
- [ ] **Cliente como eje:** en la ficha de cliente, que se vean sus tasaciones, permutas y encargos (además de lo que ya muestra) — el vendedor tiene que ver TODO el historial de una persona en un solo lugar.

### 2.3 Navegación más simple

- [ ] Reordenar `src/lib/nav.ts` por frecuencia de uso real de una agencia chica. Propuesta (ajustable):
  - **Principal:** Dashboard
  - **Ventas:** Clientes/Leads · Seguimientos · Presupuestos · Ventas · Reservas
  - **Stock:** Stock de autos · Toma de usados (Tasaciones + Permutas) · Encargos · Consignados · Taller
  - **Postventa:** Postventa · Créditos · Test Drive
  - **Herramientas:** Catálogos · Documentos · Publicaciones · VTV
  - **Administración:** Reportes · Comisiones · Usuarios · Configuración
- [ ] Evaluar unificar **Tasaciones y Permutas** bajo una sola entrada "Toma de usados" con tabs internas (la tasación es el paso 1 de la permuta). Si se unifica: redirects de las rutas viejas, sin romper links.
- [ ] Ítems de poco uso diario (Comisiones, Reportes, Publicaciones) al final; no borrar nada.

### 2.4 Búsqueda global

- [ ] Buscador en el `Topbar` (atajo `/` o `Ctrl+K`): busca clientes (nombre, teléfono, DNI) y vehículos (patente, marca, modelo) en una sola vista de resultados con link directo a la ficha. Server action + debounce; `ilike` sobre columnas ya indexadas (verificar índices `pg_trgm` o agregar migración aditiva si hace falta).
- [ ] Es LA feature de "fácil de usar": el vendedor con el cliente al teléfono no navega menús, tipea el nombre y va.

### 2.5 Alta rápida

- [ ] Botón "+ Nuevo" en el Topbar con menú: Cliente, Vehículo, Presupuesto, Seguimiento — accesible desde cualquier pantalla.

**Notas de implementación fase 2:** _(completar al ejecutar)_

---

## Fase 3 — VTV integrada al stock 🚦

Pedido textual del dueño: *"en la VTV o en stock tiene que preguntar vtv vigente"*.

- [ ] **Alta/edición de vehículo** (`src/components/forms/vehiculo-form.tsx` + actions de stock): agregar bloque "VTV": select "¿Tiene VTV vigente?" (Sí / No / No sé) y, si Sí, campo fecha de vencimiento.
- [ ] Al guardar: crear o actualizar el registro en la tabla `vtv` (ya existe, enum `estado_vtv`: vigente/por_vencer/vencida/pendiente) calculando el estado según la fecha. Sin VTV o "No sé" → registro `pendiente` para que aparezca en la lista de control.
- [ ] **Badge de VTV en la ficha del vehículo** (`stock/[id]`) y columna/indicador en el listado de stock (color por estado).
- [ ] El módulo `/vtv` queda como vista de control de vencimientos (ya existe y ya alimenta el dashboard) — ahora se alimenta solo desde el alta de stock.
- [ ] Verificar el recálculo de estados (vigente → por_vencer → vencida): si hoy depende de un proceso manual, calcular el estado derivado en la query/render a partir de `fecha_vencimiento` en vez de confiar en la columna estática.

**Notas de implementación fase 3:** _(completar al ejecutar)_

---

## Fase 4 — Estética 🎨

Regla: consistencia > originalidad. Todo con Tailwind y los componentes de `src/components/ui/` — sin libs nuevas de UI.

- [ ] **Pasada de consistencia por todas las páginas:** mismo `PageHeader` siempre, misma densidad de tablas (padding, hover de fila, zebra sutil opcional), mismos botones (primario/secundario/peligro), badges con la paleta existente, misma grilla de formularios.
- [ ] **Tablas:** hover de fila con link a la ficha (fila entera clickeable donde aplique), columnas alineadas (números a la derecha), truncado con tooltip donde corresponda.
- [ ] **Login:** pulido visual (es la primera pantalla de una demo): logo/marca, layout centrado prolijo, mensaje de error amigable.
- [ ] **Dashboard:** ya tiene buena estructura; pulir jerarquía visual (espaciados, títulos de sección, tamaño de números en StatCards).
- [ ] **Vitrina pública `/p/[slug]`** (lo que ve el cliente final — prioridad alta): cards de vehículos con foto dominante, precio grande formateado, filtros usables en mobile, header con nombre/logo de la agencia, botón de WhatsApp visible. Revisar `next/image` para que las fotos no pesen (hoy hay que verificar si se usa optimización).
- [ ] **Favicon + título** correctos (`CRM Automotor` + nombre de empresa donde aplique).
- [ ] **Mobile:** verificación rápida de las 6 pantallas más usadas (dashboard, clientes, ficha cliente, stock, ficha vehículo, seguimientos) en viewport 375px — sin overflow horizontal ni botones inalcanzables.

**Notas de implementación fase 4:** _(completar al ejecutar)_

---

## Fase 5 — PDFs de calidad 📄

Motor existente: `src/lib/pdf/documento.ts` (pdf-lib, con branding de color ya aplicado en fase 1). Subida a bucket + URL firmada vía `/abrir` — no cambiar esa arquitectura.

- [ ] **Catálogo** (`catalogos`):
  - Portada: logo/nombre de la agencia, color de marca, fecha, contacto y WhatsApp.
  - Interior: grilla de 2–3 vehículos por página CON FOTO (descargar del bucket la primera foto de cada vehículo, embeber como JPEG; manejar vehículos sin foto con placeholder), marca/modelo/año/km destacados, precio grande con `formatARS`.
  - Cierre: página final con datos de contacto + link a la vitrina pública (texto y QR si es viable con una lib liviana o generación propia; si no, link corto bien visible).
- [ ] **Documentos** (presupuesto, recibo de seña, boleto): márgenes y tipografía consistentes, tabla de conceptos con líneas sutiles, totales destacados, numeración de documento visible, bloque de firmas al pie, footer con datos legales de la empresa.
- [ ] Probar cada PDF generado abriéndolo de verdad (el flujo de generación por SQL + `/abrir` ya está validado como verificable en este entorno).

**Notas de implementación fase 5:** _(completar al ejecutar)_

---

## Fase 6 — Cierre vendible ✅

- [ ] **Datos demo prolijos:** revisar que la empresa demo tenga 8–12 vehículos con fotos, clientes con nombres reales creíbles, seguimientos/presupuestos/ventas de ejemplo coherentes (fechas recientes). Es lo que se muestra en una venta.
- [ ] **Guion de demo** en `docs/DEMO.md`: recorrido de 10 minutos (dashboard → buscar cliente → presupuesto + PDF → stock + VTV → vitrina pública → catálogo por WhatsApp) con qué decir en cada paso.
- [ ] **QA manual** (humano, navegador normal — bloqueado para automatización, ver nota en plan fase 1): alta de Presupuesto, Test Drive, Permuta y flujo de Catálogo. Checklist corto en `docs/DEMO.md`.
- [ ] Pasada final: `npm run typecheck && npm run lint && npm run build` + revisión de que no quedó ningún texto "TODO"/"próximamente" visible.

**Notas de implementación fase 6:** _(completar al ejecutar)_

---

## Reglas de ejecución (para las sesiones con Sonnet)

1. Leer este archivo, tomar el **primer ítem `[ ]` de la fase más baja incompleta**. No saltear fases.
2. Implementar completo (sin mockups ni TODOs), respetando los patrones de `CLAUDE.md` (RLS/`empresa_id`, `rel()`, `formatARS`/`formatDate`, `"use server"` solo async, tipos de DB a mano, migraciones aditivas guardadas en `supabase/migrations/`).
3. Verificar: `npm run typecheck && npm run lint && npm run build` en verde + prueba funcional (browser preview para lecturas y acciones bound-void; SQL + verificación de lectura para formularios `useFormState`, que no se pueden automatizar — ver notas de la fase 1 histórica).
4. Marcar `[x]`, completar "Notas de implementación" del bloque con decisiones tomadas y cómo se probó.
5. Commit checkpoint local en `master` (mensaje en español, prefijos `feat:`/`fix:`/`perf:`/`docs:`). **Nunca push.**
6. La fase 1 (velocidad) exige la medición antes/después de 1.5 — no marcarla completa sin números documentados acá.
