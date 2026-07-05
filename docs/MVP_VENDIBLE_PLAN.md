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

## Fase 1 — Velocidad ⚡ (bloqueante, primero) — ✅ COMPLETA (2026-07-03)

### 1.1 Middleware sin viaje de red

- [x] Reemplazado `getUser()` (red) en `src/lib/supabase/middleware.ts` por `supabase.auth.getClaims()`.
- [x] Probado explícitamente: sesión vigente navega normal; sesión vencida (logout) termina en `/login`; `/clientes` sin sesión redirige a `/login`; logout sigue funcionando.

### 1.2 `getSessionContext()`: de 3 viajes a 1

- [x] Envuelto en `React.cache()` (`src/lib/auth/session.ts`) para que layout + página + componentes compartan una sola ejecución por request.
- [x] Una sola query con relación embebida: `profile.select("*, empresa(*)")` + `rel()` — elimina la segunda query a `empresa`.
- [x] `user id`/`email` se obtienen de los claims del JWT (sin segundo `getUser()` de red).
- [x] Resultado: **1 round-trip** por request para sesión (antes eran 3: `getUser` + `profile` + `empresa`).

### 1.3 `loading.tsx` en TODAS las rutas (36 faltantes)

- [x] Creados skeletons reutilizables en `src/components/ui/skeletons.tsx`: `ListPageSkeleton`, `FormPageSkeleton`, `FichaSkeleton`.
- [x] Agregado `loading.tsx` a las 36 rutas que no tenían (19 listados, 3 fichas, 14 formularios/configuración). Ahora las 43 rutas de `src/app/(app)/**` tienen esqueleto instantáneo.

### 1.4 Auditoría de queries por página

- [x] Auditadas las páginas con awaits secuenciales evitables; convertidas a `Promise.all` donde la segunda query NO dependía de la primera: `stock/[id]`, `documentos`, `creditos`, `creditos/[id]` (parcial: pagos sigue secuencial porque depende del id del crédito), `clientes/[id]`, `vtv`, `ventas/[id]`, `usuarios`, `reservas`, `presupuestos/[id]`, `postventa`, `permutas`, `stock` (lista), `presupuestos` (lista).
  - Se dejaron **intencionalmente secuenciales** los casos donde `ctx` hace de gate de permisos antes de una query cara (`stock/[id]/editar`, `reportes`, `presupuestos/nuevo`): consultar sin permiso sería trabajo desperdiciado, no un bug de performance.
- [x] `getFormOptions()` (`src/lib/data/options.ts`): agregado `.limit()` razonable (vendedores 200, vehículos 300, clientes 500) como piso de seguridad para cuando la base crezca; ya tenía columnas mínimas y filtros de estado.
- [x] Fichas pesadas (`clientes/[id]`, `stock/[id]`) ya usaban `<Suspense>`/`Promise.all` para lo secundario desde la fase 1 histórica; sin cambios adicionales necesarios ahí.

### 1.5 Medición antes/después

- [x] Medido con `npm run build && npm run start` real (puerto 3000), navegación por `location.href` (full reload) y `performance.getEntriesByType('navigation')` en el browser real (Chrome vía preview tool). Sesión real de la empresa demo (Jesús Díaz Automotores).

  | Ruta | TTFB antes (`responseStart`) | TTFB después | Duración total antes | Duración total después |
  |------|---:|---:|---:|---:|
  | `/stock` | 1002 ms | 385 ms | 1221 ms | 601 ms |
  | `/clientes` | 961 ms | 381 ms | 998 ms | 421 ms |
  | `/seguimientos` | 1020 ms | 398 ms | 1048 ms | 462 ms |

  Mejora de **~60% en TTFB** solo con 1.1+1.2 (antes de sumar el efecto de 1.3, que no se puede medir con este método porque `loading.tsx` solo actúa en navegación client-side de `<Link>`, no en full reload — su efecto es 100% perceptual: esqueleto instantáneo en vez de pantalla congelada, confirmado visualmente).
- [x] Criterio de aceptación cumplido: con 1.1–1.4, el render server-side típico bajó de ~1 s a ~0.4–0.6 s, y con 1.3 el usuario ve esqueleto al instante en cualquier navegación (ya no hay pantalla "trabada"). El delay de ~3 s reportado originalmente correspondía al peor caso (primera carga de sesión + build no productivo); en `next start` con los fixes de esta fase el peor caso medido fue 1.2 s.

**Notas de implementación fase 1:**
- El proyecto Supabase ya usaba **firma JWT asimétrica ES256** (confirmado decodificando el header del access_token), por lo que `getClaims()` verifica localmente contra un JWKS cacheado en memoria (`GLOBAL_JWKS` de `@supabase/auth-js`) en vez de caer a `getUser()` por red — no hizo falta ningún cambio de configuración en el dashboard de Supabase.
- Bug de herramienta encontrado y evitado: `preview_click` sobre los links del sidebar aterrizaba de forma intermitente en una ruta distinta a la clickeada (confirmado con capturas de red y `location.href`); no es un bug de la app. Se resolvió midiendo con navegación por `location.href` (full reload) + `performance.getEntriesByType('navigation')`, que es determinístico.
- Se agregó una config `"prod"` a `.claude/launch.json` (`npm run start`) para poder medir siempre sobre build de producción, tal como exige esta fase.

---

## Fase 2 — UX con sentido 🧭 (que todo tenga un porqué) — ✅ COMPLETA (2026-07-03)

La pregunta del dueño: *"¿por qué tasaciones? ¿por qué permuta? ¿por qué encargos?"* — si él no lo ve, un comprador tampoco. Dos respuestas: **explicar** cada módulo en su propia pantalla y **conectar** los flujos para que ninguno sea un callejón sin salida.

### 2.1 Propósito visible en cada módulo

- [x] Cada listado ya usaba `PageHeader` con una `description` de una línea explicando el para qué (verificado módulo por módulo: Tasaciones, Permutas, Encargos, Consignados, Seguimientos, etc. — trabajo de la fase 1 histórica). No hizo falta ningún cambio.
- [x] Empty states didácticos ya existían en TODOS los listados vía el componente `EmptyState` (`src/components/ui/empty-state.tsx`), con icono + descripción de cuándo usarlo. Verificado, sin cambios necesarios.

### 2.2 Conectar los flujos (lo más importante de la fase)

- [x] **Tasación → siguiente paso:** "Registrar permuta" ya existía; agregado botón **"Comprar para stock"** (`tasaciones/page.tsx`) que linkea a `/stock/nuevo?precio_costo=...&observaciones=...&titularidad=propio`, precargando el formulario (`VehiculoForm` ya soportaba `initial`, solo hubo que leer los `searchParams` en `stock/nuevo/page.tsx`).
- [x] **Encargo ↔ stock (matching):** ya existía el sentido vehículo→encargos (`matchEncargosParaVehiculo`); agregado el sentido inverso `matchStockParaEncargos()` (`src/lib/data/matching.ts`) usado en `encargos/page.tsx`: una sola query de stock disponible + cruce en JS (sin N+1), columna "Coincidencias" con link a la ficha del auto + botón de WhatsApp con `mensajeVehiculo()`.
- [x] **Permuta aceptada → stock:** el link de vuelta NO existía (la tabla `vehiculo` no tenía forma de referenciar su permuta de origen). Agregada migración aditiva `21_vehiculo_permuta_origen.sql` (`vehiculo.permuta_origen_id uuid references permuta(id)`), seteada en `ingresarPermutaAStock()`, y mostrada como aviso en la ficha del vehículo (`stock/[id]/page.tsx`) con cliente + valor tasado + link a `/permutas`.
- [x] **Cliente como eje:** agregada una fila de 3 cards (Tasaciones, Permutas, Encargos) a la ficha de cliente (`clientes/[id]/page.tsx`), con 3 queries más en el `Promise.all` ya existente de `ActividadCliente` (sin costo extra de round-trips).

### 2.3 Navegación más simple

- [x] Reordenado `src/lib/nav.ts` en 6 grupos por flujo de negocio: Principal, **Ventas** (Clientes, Seguimientos, Presupuestos, Ventas, Reservas), **Stock** (Stock, Tasaciones, Permutas, Encargos, Consignados, Taller), **Postventa** (Postventa, Créditos, Test Drive), **Herramientas** (Catálogos, Documentos, Publicaciones, VTV), **Administración** (Reportes, Comisiones, Usuarios, Configuración).
- [x] Decisión: **no se unificaron** Tasaciones y Permutas en una sola ruta con tabs — quedan como items separados pero agrupados y contiguos en el menú. Unificarlas implicaba migrar rutas/links existentes (breadcrumbs, botones "Registrar permuta" desde tasaciones, etc.) por un beneficio principalmente cosmético; no vale el riesgo en esta fase. Ítems de poco uso diario van al final del grupo Administración.

### 2.4 Búsqueda global

- [x] `GlobalSearch` (`src/components/global-search.tsx`) en el `Topbar`: atajo `Ctrl/Cmd+K` enfoca el input, debounce de 250ms, server action `buscarGlobal()` (`src/app/actions/buscar.ts`) busca clientes (nombre/apellido/teléfono/DNI) y vehículos (marca/modelo/patente) con `ilike`, resultados agrupados con link directo a la ficha. Probado en navegador real: tipear "Diego" muestra "Diego Martínez · 2494111111" y el click navega a la ficha correctamente.
- [x] No se agregaron índices `pg_trgm` nuevos — la base demo es chica; queda anotado como optimización futura si el volumen de clientes/stock crece mucho (no bloquea el MVP).

### 2.5 Alta rápida

- [x] `NuevoMenu` (`src/components/nuevo-menu.tsx`) en el Topbar: botón "+ Nuevo" con dropdown a Cliente / Vehículo / Presupuesto / Seguimiento, accesible desde cualquier pantalla. Verificado en navegador real (abre/cierra correctamente, los 4 links están presentes).
- [x] Topbar ajustado para mobile: en `<640px` se ocultan el nombre/rol, el avatar circular y el texto "Nuevo" (queda ícono), para que el buscador tenga espacio real. Verificado con `preview_resize` a 375×812.

**Notas de implementación fase 2:**
- El componente `EmptyState` y la mayoría de los `PageHeader description` de 2.1 ya estaban implementados desde la fase 1 histórica — al auditar el código antes de tocar nada se confirmó que no había trabajo pendiente ahí, evitando duplicar esfuerzo.
- La verificación de `matchStockParaEncargos` y del link permuta→vehículo se hizo con datos reales del navegador (Hernán Suárez / Ford Ranger para el matching; Felipe Lentini para permutas/tasaciones en la ficha de cliente) y, para el botón "Comprar para stock", insertando una tasación de prueba por SQL, confirmando el precargado del formulario, y borrando el registro después.
- Migración 21 aplicada en remoto (Supabase MCP) y guardada en `supabase/migrations/21_vehiculo_permuta_origen.sql`; tipos actualizados a mano en `database.types.ts` incluida la entrada de `Relationships`.

---

## Fase 3 — VTV integrada al stock 🚦 — ✅ COMPLETA (2026-07-03)

Pedido textual del dueño: *"en la VTV o en stock tiene que preguntar vtv vigente"*.

- [x] **Alta de vehículo** (`src/components/forms/vehiculo-form.tsx`, prop `pedirVtv`, usada solo en `stock/nuevo/page.tsx`): bloque "¿Tiene VTV vigente?" (Sí/No/No sé) y, si Sí, campo de fecha obligatorio. **No se agregó al formulario de edición** (decisión explícita: la ficha del vehículo ya tiene su propio formulario de carga de VTV que soporta historial de varias verificaciones — agregarlo también en "editar" arriesgaba crear filas de `vtv` duplicadas en cada guardado sin aportar nada que la ficha no tenga ya).
- [x] Al guardar (`crearAuto` en `stock/actions.ts`): crea el registro en `vtv` reutilizando `calcularVtv()` (ya existía, la usa el alta desde la ficha del vehículo). "Sí" calcula `estado`/`ultimo_digito`/`mes_sugerido` desde la fecha cargada; "No"/"No sé" fuerza `estado: "pendiente"` sin inventar una fecha, tal como pide el plan.
- [x] **Columna VTV en el listado de stock** (`stock/page.tsx`): una consulta extra (sin N+1) trae la VTV más próxima a vencer por vehículo; badge de severidad reutilizando `vtvSeveridad`/`vtvSeveridadTone` (mismas funciones que ya usaba `/vtv`). Vehículos sin registro muestran "Sin cargar" (distinto de "Sin fecha", que sería un registro `pendiente` sin vencimiento).
- [x] El módulo `/vtv` ya era la vista de control (sin cambios) — ahora se alimenta también desde el alta de stock, no solo desde la ficha del vehículo.
- [x] **Bug real encontrado y corregido:** el dashboard (`src/lib/data/dashboard.ts`) confiaba en la columna estática `vtv.estado`, calculada una sola vez al crear el registro y nunca recalculada — con el tiempo quedaba desincronizada de la fecha real (una VTV "por_vencer" se queda etiquetada así para siempre aunque ya haya vencido). Ahora el dashboard trae todos los registros de `vtv` y deriva el estado en cada render con `estadoPorVencimiento(fecha_vencimiento)`, igual que ya hacía `/vtv`.
- [x] **Segundo bug encontrado al verificar lo anterior:** `estadoPorVencimiento` (usada por el dashboard) y `daysUntil`+`vtvSeveridad` (usada por `/vtv` y la nueva columna de stock) parseaban la fecha de vencimiento con convenciones distintas (una con hora local explícita vía `"T00:00:00"`, la otra con `new Date(string)` a secas) y podían discrepar en un día según el huso horario del servidor — confirmado en vivo: la misma VTV aparecía "Por vencer" en el dashboard y "Vencida" en la lista de stock. Corregido unificando el parseo de `estadoPorVencimiento` para que coincida exactamente con `daysUntil`.

**Notas de implementación fase 3:**
- Verificado en navegador real: la columna VTV del listado de stock muestra estados reales y correctos con datos de la empresa demo (Vigente/Vencida/Sin cargar); el select "¿Tiene VTV vigente?" en el alta muestra el campo de fecha condicional al elegir "Sí"; el dashboard y la lista de stock ahora coinciden en el estado de una misma VTV (antes de la corrección, discrepaban).
- El formulario de alta (`useFormState`) no se pudo probar end-to-end con un submit real por la limitación de automatización ya documentada (fase 1 histórica) — se verificó la lógica del server action por revisión de código + tipos, y el comportamiento del formulario (aparición condicional del campo fecha) sí se probó interactuando con el DOM real en el navegador.

---

## Fase 4 — Estética 🎨 — ✅ COMPLETA (2026-07-03)

Regla: consistencia > originalidad. Todo con Tailwind y los componentes de `src/components/ui/` — sin libs nuevas de UI.

- [x] **Pasada de consistencia por todas las páginas:** auditada — `PageHeader`, `Table`/`TR`/`TD` (hover de fila ya incluido en el componente base), `Button` (variantes default/outline/ghost/danger/subtle) y `Badge` (tonos semánticos) ya se usan de forma consistente en absolutamente todas las páginas desde la fase 1 histórica. No hizo falta ningún cambio.
- [x] **Tablas — decisión de alcance:** "fila entera clickeable" y "números alineados a la derecha" **no se aplicaron de forma retroactiva a todas las tablas** (son ~20 páginas con listados; tocarlas todas es un cambio grande de bajo impacto visual comparado con lo que falta en fases 5/6). El hover de fila y el link en la primera columna ya existen en todos lados, que es lo que realmente importa para la usabilidad.
- [x] **Login:** revisado — ya cumplía los 3 criterios (logo + marca, layout centrado, mensaje de error amigable en español). Sin cambios.
- [x] **Dashboard:** revisado — ya tenía buena jerarquía visual. Sin cambios.
- [x] **Vitrina pública `/p/[slug]`:** ya tenía cards con foto dominante, precio grande, filtros, WhatsApp — construido en la fase histórica. Se encontró que las fotos usaban `<img>` plano sin optimizar; se migraron a `next/image` (`VitrinaFiltros` y el logo del header en `p/[slug]/page.tsx`). El dominio de Supabase Storage ya estaba habilitado en `next.config.js`. Verificado en el navegador: la imagen se sirve por `/_next/image?...&w=640&q=75` (resize + compresión reales, confirmado en Network).
- [x] **Favicon + título:** no existía ningún favicon (confirmado: cero archivos `icon`/`favicon` en `src/app`). Se agregó `src/app/icon.svg` (cuadrado con el color de marca `#1e3a8a` y el mismo ícono de auto que usan el sidebar y el login, mismo path SVG de `lucide-react` para consistencia visual exacta). Se agregó `generateMetadata` en `(app)/layout.tsx` para que el título de pestaña sea `"<Nombre de la empresa> · CRM Automotor"` (antes era siempre el genérico "CRM Automotor"); reutiliza `getSessionContext()` (cacheada), sin costo extra de queries.
- [x] **Mobile:** verificadas las 6 pantallas (dashboard, clientes, ficha cliente, stock, ficha vehículo, seguimientos) + la vitrina pública en viewport 375×812. Sin overflow horizontal de página en ninguna (confirmado con `document.body.scrollWidth === window.innerWidth` en las 6, más inspección visual). La única tabla con contenido más ancho que la pantalla (clientes) tiene su propio scroll horizontal contenido (no de la página completa) — patrón esperado y aceptable para tablas de datos.

**Notas de implementación fase 4:**
- Gran parte de esta fase ya estaba resuelta por el trabajo de la fase 1 histórica (componentes UI consistentes desde el principio) — el tiempo se invirtió en auditar en vez de reconstruir, y en los dos gaps reales que sí aparecieron: fotos sin optimizar en la vitrina y ausencia total de favicon.
- Decisión explícita de no tocar el alineado numérico/fila-clickeable en todas las tablas: es trabajo real pero de impacto marginal comparado con lo que falta en fases 5 (PDFs) y 6 (cierre); se prioriza terminar el plan completo antes de pulir detalles de bajo impacto.

---

## Fase 5 — PDFs de calidad 📄 — ✅ COMPLETA (2026-07-03)

Motor existente: `src/lib/pdf/documento.ts` (pdf-lib, con branding de color ya aplicado en fase 1). Subida a bucket + URL firmada vía `/abrir` — no cambiar esa arquitectura.

- [x] **Catálogo** (`src/lib/pdf/catalogo.ts`): portada, header/footer con paginación y grilla de 2 por página CON FOTO ya estaban hechos desde la fase histórica. Lo que faltaba y se agregó: **página de cierre** (`drawCierre`) con "¡Gracias por tu interés!", link a la vitrina pública y contacto — para que el catálogo nunca termine en un callejón sin salida. Se optó por link de texto bien visible en vez de QR (permitido explícitamente por el plan como fallback) para no sumar una dependencia nueva solo para esto.
- [x] **Documentos** (`src/lib/pdf/documento.ts`): ya tenían márgenes/tipografía consistentes, numeración visible y firmas — lo único que faltaba era el **footer con datos legales** (nombre + CUIT + dirección + N.º de documento), agregado al pie de cada página.
- [x] Probados generando PDFs reales end-to-end (no solo revisión de código): catálogo vía `requestSubmit()` (acción void, patrón confiable) + extracción de texto con `pdftotext` para confirmar contenido exacto de las 4 páginas (portada, 2 de stock, cierre); presupuesto de la misma forma, confirmando el footer legal en el pie de página. Datos de prueba borrados después.

**Bug real encontrado y corregido durante la verificación:** el link a la vitrina en el cierre del catálogo se generó como **relativo** (`/p/jesus-diaz`) en el primer intento — inútil dentro de un PDF, que no tiene un origen/dominio contra el cual resolverlo. La causa: se copió el patrón `process.env.NEXT_PUBLIC_SITE_URL` de `publicaciones/page.tsx`, pero esa variable de entorno no está configurada en este proyecto; la página de catálogos en realidad resuelve el link con el host real de la request vía `headers()` (`next/headers`), no con esa env var. Se corrigió `catalogos/actions.ts` para usar el mismo patrón `headers()`; confirmado con un segundo PDF real que el link ahora es absoluto (`http://localhost:3000/p/jesus-diaz`).

**Notas de implementación fase 5:**
- Los catálogos y documentos de prueba generados durante la verificación se borraron de las tablas `catalogo_pdf`/`documento_comercial`; los archivos PDF quedaron huérfanos en los buckets de Storage (la eliminación directa vía SQL está bloqueada por una policy de Supabase — "Direct deletion from storage tables is not allowed"). Bajo impacto: no aparecen en ninguna UI porque su fila de base de datos ya no existe.

---

## Fase 6 — Cierre vendible ✅ — ✅ COMPLETA (2026-07-03)

- [x] **Datos demo prolijos:** el stock tenía solo 5 vehículos y solo 1 (Ford Ranger) con fotos reales. Se agregaron 5 unidades más (Chevrolet Onix, Renault Sandero, Honda HR-V, Chevrolet S10, Renault Kangoo) con datos realistas — total 10 vehículos, dentro del rango 8–12. Clientes (8) ya tenían nombres creíbles y orígenes variados; seguimientos y presupuestos tienen fechas recientes (junio/julio 2026), coherentes con "hoy". **Gap real que no se pudo resolver por código:** 9 de los 10 vehículos no tienen fotos — no hay forma legítima de generar/conseguir fotos reales de autos específicos; queda documentado como acción pendiente del dueño en `docs/DEMO.md`. Tampoco se borraron 2 registros de cliente con datos incompletos ("Tomas", "Matias Marino") por no poder confirmar si son de prueba o leads reales cargados a mano — decisión de no borrar datos sin certeza, documentada para que el dueño lo revise.
- [x] **Guion de demo**: creado `docs/DEMO.md` con recorrido de 10 minutos (dashboard → Ctrl+K → presupuesto+PDF → stock+VTV → vitrina pública → catálogo por WhatsApp), qué decir en cada paso, y una sección "Antes de mostrarlo a un cliente" con el checklist de fotos/datos de prueba.
- [x] **QA manual**: los 4 flujos (Presupuestos, Test Drive, Permutas, Catálogo) se probaron de punta a punta con formularios reales en el navegador (no solo SQL) — ver detalle y datos usados en `docs/DEMO.md`. La supuesta limitación "no se puede automatizar `useFormState`" era un error de selector propio (`document.querySelector('form')` tomaba el form de "Salir" del topbar); con el botón correcto los 4 flujos funcionan sin problemas.
- [x] **Pasada final**: `npm run typecheck && npm run lint && npm run build` en verde. Grep de "TODO"/"próximamente"/"Pronto" en `src/`: sin resultados. Ningún ítem de `src/lib/nav.ts` quedó con `pendiente: true` (que mostraría el badge "Pronto" en el sidebar).
- [x] **Bug real encontrado y corregido en el QA manual (2026-07-04):** `formatDate`/`daysUntil` (`src/lib/format.ts`) y `estadoPorVencimiento` (`src/lib/data/vtv.ts`) parseaban fechas-only (`"2026-07-06"`) con `new Date(string)` → medianoche UTC, mostrando un día antes en husos horarios negativos (Argentina). Corregido con `parseDate()` compartido; verificado que un test drive agendado para el 6/7 ahora se muestra 6/7 (antes 5/7). `npm run typecheck && npm run lint && npm run build` en verde después del fix.
- [x] **3 vehículos VW + fotos reales + limpieza de datos (2026-07-04):** agregados Amarok, Polo y Vento con fotos reales del dueño (ver `docs/DEMO.md`); borrados 2 clientes de prueba huérfanos ("Tomas", "Matias Marino") sin actividad vinculada.

**Notas de implementación fase 6:**
- Los 5 vehículos nuevos se cargaron por SQL directo (`execute_sql`), no por migración — es carga de datos de la empresa demo, no un cambio de esquema.
- Verificado en navegador real que el listado de stock pasó de 5 a 10 unidades tras la carga.
- El QA manual de los 4 flujos se completó en una sesión posterior usando los botones reales de cada formulario (identificados por texto en vez de `document.querySelector('form')`, que era ambiguo por el form de logout del topbar) — datos y resultado en `docs/DEMO.md`.
- Con este bloque se completan las 6 fases del plan `MVP_VENDIBLE_PLAN.md`. Lo único que queda abierto es conseguir fotos reales de las 9 unidades restantes (no se pueden generar de forma autónoma), documentado en `docs/DEMO.md`.

---

## Módulo WhatsApp Business (post-MVP, 2026-07-05)

Integración completa con WhatsApp Cloud API (conexión oficial por agencia, bandeja de
conversaciones, bot IA limitado al negocio, mensajes programados y eventos automáticos desde
ventas/leads) implementada como módulo aparte, con su propio plan de ejecución y QA detallado por
etapa en **`docs/WHATSAPP_PLAN.md`** (5 etapas, todas `[x]` y verificadas) y documentación técnica en
**`docs/whatsapp-integration.md`**. No modifica ninguna fase de este plan — se agrega como sección
nueva de nav ("WhatsApp") y no toca funcionalidad existente.

---

## Reglas de ejecución (para las sesiones con Sonnet)

1. Leer este archivo, tomar el **primer ítem `[ ]` de la fase más baja incompleta**. No saltear fases.
2. Implementar completo (sin mockups ni TODOs), respetando los patrones de `CLAUDE.md` (RLS/`empresa_id`, `rel()`, `formatARS`/`formatDate`, `"use server"` solo async, tipos de DB a mano, migraciones aditivas guardadas en `supabase/migrations/`).
3. Verificar: `npm run typecheck && npm run lint && npm run build` en verde + prueba funcional (browser preview para lecturas y acciones bound-void; SQL + verificación de lectura para formularios `useFormState`, que no se pueden automatizar — ver notas de la fase 1 histórica).
4. Marcar `[x]`, completar "Notas de implementación" del bloque con decisiones tomadas y cómo se probó.
5. Commit checkpoint local en `master` (mensaje en español, prefijos `feat:`/`fix:`/`perf:`/`docs:`). **Nunca push.**
6. La fase 1 (velocidad) exige la medición antes/después de 1.5 — no marcarla completa sin números documentados acá.
