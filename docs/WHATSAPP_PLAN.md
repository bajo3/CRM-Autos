# Plan — Módulo WhatsApp Business (Cloud API) multiagencia

> Plan activo del módulo WhatsApp. Igual que `MVP_VENDIBLE_PLAN.md`: tomar el primer ítem `[ ]` de la
> etapa más baja incompleta, no saltear etapas, nunca marcar `[x]` sin probar, y correr
> `npm run typecheck && npm run lint && npm run build` antes de cerrar cada bloque.
> Commit checkpoint local en `master` al final de cada etapa estable. Nunca push sin pedido explícito.

## Objetivo

Que cada agencia (= `empresa`) conecte su WhatsApp Business oficial (Meta Cloud API), reciba y envíe
mensajes desde el CRM, las conversaciones se asocien solas a clientes/leads/vehículos, un bot IA
limitado al negocio responda consultas básicas con stock real, y haya mensajes programados para
seguimiento/postventa/cuotas/VTV.

## Decisiones de arquitectura (tomadas tras inspección — 2026-07-05)

Restricciones y hechos verificados del proyecto:

- **Stack**: Next.js 14 App Router + TS + Tailwind. Supabase (Postgres/Auth/Storage) proyecto `emltbzmbhqfvtcmxgpgu`. RLS multitenant por `empresa_id` con `auth_empresa_id()`. RBAC en `src/lib/auth/permissions.ts` (`can(rol, "permiso")`, estilo `"stock.editar"`). Sesión: `getSessionContext()`.
- **No hay** Redis, ni colas, ni WebSockets propios. **Sí hay** pg_cron (pero sin `pg_net`/`http` → Postgres NO puede llamar APIs externas). Jobs diarios existentes: `crm_run_daily_jobs()`.
- **No hay** service-role key en `.env.local` (solo URL + anon key). El webhook de Meta llega sin sesión de usuario → **hace falta agregar `SUPABASE_SERVICE_ROLE_KEY`** (el dueño la copia del dashboard de Supabase; Claude no toca `.env.local` — se documenta y se pide).
- **No hay tabla `lead`**: el lead ES `cliente` (enum `estado_lead`, campo `origen` con valor `whatsapp` ya existente, `vehiculo_interes_id` para el auto de interés). La tabla `consulta` ya vincula cliente+vehículo+canal.
- Teléfonos: `cliente.telefono` texto libre; helper `waUrl()` en `src/lib/data/whatsapp.ts`. Se agrega normalización E.164 para matching.

Decisiones:

1. **Worker de envío**: route handler `POST /api/whatsapp/cron` protegido por header `Authorization: Bearer ${WHATSAPP_CRON_SECRET}`. En prod lo dispara Vercel Cron (`vercel.json`); en dev, script o curl manual. *Motivo: no hay pg_net ni Redis; es la opción más simple del stack.*
2. **Webhook**: route handlers `GET`/`POST /api/whatsapp/webhook` públicos (excluidos del middleware de auth). Escriben con cliente **service-role** (`src/lib/supabase/admin.ts`, solo server). Validación de firma `X-Hub-Signature-256` con `META_APP_SECRET`. Responder 200 rápido; procesamiento inline (sin colas) pero acotado.
3. **Tokens**: AES-256-GCM app-level (`src/lib/whatsapp/crypto.ts`) con `WHATSAPP_TOKEN_KEY` (32 bytes base64). Nunca texto plano, nunca logueados.
4. **Realtime de la bandeja**: polling eficiente (refetch ~5 s solo de la conversación abierta + lista por `last_message_at`). Supabase Realtime queda como mejora futura (nota, no TODO).
5. **Bot IA**: Claude API (`ANTHROPIC_API_KEY`), modelo `claude-haiku-4-5` (costo/latencia). Una llamada por mensaje entrante con system prompt que incluye: config del bot, ficha del cliente, stock real resumido (query en el momento), últimos N mensajes. Respuesta JSON `{reply, handoff, handoff_reason}` validada. Pre-checks determinísticos (keywords de handoff) antes de llamar al modelo. Si no hay API key → bot apagado con aviso en UI; el módulo funciona igual.
6. **Embedded Signup**: JS SDK de Meta (`FB.login` con `META_CONFIG_ID`) + intercambio de code server-side. Como requiere app de Meta aprobada, la UI ofrece **fallback de conexión manual** (pegar `waba_id`, `phone_number_id`, token permanente) para poder probar/demo sin la app aprobada. Ambos caminos guardan igual en `whatsapp_account`.
7. **Nombres**: tablas con prefijo `whatsapp_` en singular como el resto del schema (`whatsapp_account`, `whatsapp_conversacion`, `whatsapp_mensaje`, `whatsapp_bot_config`, `whatsapp_plantilla`, `whatsapp_programado`, `whatsapp_evento_log`). Columnas en español coherentes con el proyecto (`empresa_id`, `cliente_id`, `vehiculo_id`).
8. **Permisos** (en `permissions.ts`): `whatsapp.ver`, `whatsapp.enviar`, `whatsapp.conectar`, `whatsapp.bot`, `whatsapp.plantillas`, `whatsapp.programados`. dueño/encargado: todo; vendedor: ver+enviar+programados; administrativo: ver; gestoria/solo_lectura: nada.
9. **Ventana de 24 h**: `whatsapp_conversacion.ultima_entrada_at` decide: dentro de 24 h → texto libre; fuera → solo plantilla (el service lo fuerza, la UI lo explica y ofrece selector de plantilla).
10. **Tests**: vitest mínimo para lógica pura (crypto round-trip, normalización de teléfono AR, parser de webhook con fixtures, regla de 24 h, handoff). Hoy no hay framework de tests → se agrega `vitest` como devDependency y `npm run test`.
11. **Mock de envío en dev**: `WHATSAPP_FAKE_SEND=1` hace que el service no llame a Meta y simule respuesta OK — permite QA de punta a punta sin cuenta real.

## Variables de entorno (documentar en `.env.example.whatsapp`, NO tocar `.env.local`)

```
META_APP_ID=                # App de Meta (Embedded Signup + firma webhook)
META_APP_SECRET=            # Valida X-Hub-Signature-256
META_CONFIG_ID=             # Config de Embedded Signup
META_VERIFY_TOKEN=          # Verificación GET del webhook (lo inventamos nosotros)
WHATSAPP_API_VERSION=v21.0
WHATSAPP_TOKEN_KEY=         # 32 bytes base64 para AES-256-GCM
WHATSAPP_CRON_SECRET=       # Bearer del worker /api/whatsapp/cron
WHATSAPP_FAKE_SEND=         # 1 en dev para simular envíos sin llamar a Meta
SUPABASE_SERVICE_ROLE_KEY=  # Server-only: webhook/cron/bot escriben sin sesión
ANTHROPIC_API_KEY=          # Bot IA (opcional: sin esto el bot queda apagado)
NEXT_PUBLIC_APP_URL=        # URL pública (webhook, links)
```

---

## Etapa 1 — Datos + servicio + webhook 📥

- [x] **1.1 Migración `22_whatsapp.sql`** (aditiva, `apply_migration` + archivo en `supabase/migrations/`): tablas `whatsapp_account`, `whatsapp_conversacion`, `whatsapp_mensaje`, `whatsapp_bot_config`, `whatsapp_plantilla`, `whatsapp_programado`, `whatsapp_evento_log` con enums (guard por `pg_type`: `create type` no soporta `if not exists`), índices (empresa_id; conversacion_id+created_at; telefono; send_at parcial para el worker), RLS por `auth_empresa_id()` en todas, trigger `updated_at`. `whatsapp_mensaje.wa_message_id` unique parcial para idempotencia del webhook. *Verificado 2026-07-05: aplicada en remoto, 7 tablas con 4 policies c/u confirmadas por SQL.*
- [x] **1.2 Tipos TS**: actualizar a mano `src/lib/types/database.types.ts` (Row/Insert/Update + enums en el union type Y en el array de constantes). *Verificado: typecheck verde con las 7 tablas y 10 enums nuevos.*
- [x] **1.3 Helpers base**: `src/lib/supabase/admin.ts` (cliente service-role, server-only, error claro si falta la env), `src/lib/whatsapp/crypto.ts` (AES-256-GCM), `src/lib/whatsapp/telefono.ts` (normalizar E.164 AR: 54 + 9, variantes con/sin 15).
- [x] **1.4 Servicio**: `src/lib/whatsapp/service.ts` — `getAccountForEmpresa`, `sendTextMessage`, `sendTemplateMessage`, `markMessageAsRead`, `dentroVentana24h`; guarda saliente + actualiza conversación + registra respuesta cruda de Meta + maneja errores. `src/lib/whatsapp/log.ts` → `whatsapp_evento_log`.
- [x] **1.5 Webhook**: `src/app/api/whatsapp/webhook/route.ts` GET (verify_token) + POST (firma, parseo de `messages` y `statuses`, idempotencia por `wa_message_id`, upsert conversación por empresa+teléfono, 200 rápido). Excluida del middleware de auth.
- [x] **1.6 Asociación cliente/lead**: al primer mensaje de un teléfono → buscar `cliente` por teléfono normalizado; si no existe crear lead (`origen='whatsapp'`, `estado_lead='nuevo'`, nombre = profile name de WA). Detección simple de vehículo (marca/modelo contra stock activo) → setea `vehiculo_interes_id` si está vacío + crea `consulta` canal whatsapp.
- [x] **1.7 Verificación**: typecheck+lint+build verdes. Commit checkpoint.
  - **Verificado 2026-07-05 (runtime real contra dev server, `.env.local` con `SUPABASE_SERVICE_ROLE_KEY` real + `WHATSAPP_FAKE_SEND=1`)**:
    - GET webhook: token correcto → 200 + challenge; token inválido → 403.
    - POST fixture (mensaje real de Meta mencionando "Amarok") → creó `whatsapp_mensaje` (entrante, recibido), `whatsapp_conversacion` (abierta, `no_leidos=1`), `cliente` lead nuevo (`origen=whatsapp`, `estado=nuevo`), detectó el vehículo por texto y seteó `vehiculo_interes_id` + creó `consulta` (canal whatsapp).
    - Reenvío del mismo `wa_message_id` → no duplicó fila ni volvió a incrementar `no_leidos` (idempotencia por índice único confirmada).
    - Estados salientes: `sent→delivered→read` aplicados en orden y sin poder retroceder (probado con updates directos).
    - Firma `X-Hub-Signature-256`: con `META_APP_SECRET` seteado temporalmente, sin firma → 401, firma incorrecta → 401, firma HMAC-SHA256 correcta → 200. Revertido a vacío (Meta real se configura en Etapa 5).
    - Datos de prueba limpiados de la base al terminar.

## Etapa 2 — Bandeja + envío manual 💬

- [x] **2.1 Ruta `/whatsapp`** (+ `loading.tsx`, ítem de nav en sección nueva "WhatsApp" gateado por `whatsapp.ver`): shell de 3 paneles (lista chats / chat / ficha cliente) vía `BandejaShell` compartido entre `/whatsapp` y `/whatsapp/[id]` — **decisión de arquitectura**: Next.js App Router no pasa `searchParams` a `layout.tsx`, así que el shell no es un layout sino un componente async invocado desde ambas páginas hoja con sus propios `searchParams`. Paginación de conversaciones (`{count:"exact"}`, `.range()`).
- [x] **2.2 Lista**: buscador (nombre/teléfono/vehículo — matchea por `vehiculo_interes_id` del cliente), filtros por chip (abiertas/pendientes/cerradas/sin asignar/bot on/off), preview + hora relativa + badge no-leídos.
- [x] **2.3 Chat**: mensajes (últimos 100), burbujas por dirección, iconos de estado (reloj/✓/✓✓/✓✓ azul/⚠ fallado con motivo), composer con envío manual (server action → `sendTextMessage`; fuera de la ventana de 24 h cambia a selector de plantilla + variables). Polling ~5 s (`LiveRefresh`, `router.refresh()`).
- [x] **2.4 Panel ficha**: datos del cliente, estado lead con link a la ficha completa, vehículo de interés (link a `/stock/[id]`), presupuesto aproximado, vendedor asignado, estado del bot, botones: crear cliente si no hay match, asignar vendedor, cerrar/reabrir, crear seguimiento (inserta en tabla `seguimiento` real).
- [x] **2.5 Control humano**: asignar/cerrar/reabrir/pausar-reactivar bot todos verificados; **regla confirmada**: enviar un mensaje manual pausa el bot automáticamente (`bot_pausado_hasta = now() + pausa_intervencion_min`, default 240 min, leído de `whatsapp_bot_config` si existe).
- [x] **2.6 Verificación**: probado en navegador real (login como `dueno@jesusdiaz.com`) con `WHATSAPP_FAKE_SEND=1`: bandeja con conversación real del webhook, apertura de chat, envío manual (bubble + estado "enviado" + bot pausado automáticamente reflejado como badge "Bot pausado" en la lista), asignar vendedor (persistido en DB), cerrar/reabrir (persistido), crear seguimiento (fila real en `seguimiento`), búsqueda por vehículo ("amarok" encontró al cliente por su `vehiculo_interes_id`). Sin errores de consola. typecheck+lint+build verdes. Commit.
  - **Bug encontrado y corregido durante el QA**: el layout de 3 columnas colapsaba a texto de un carácter por línea en viewports angostos (~700-800px) porque el panel central `flex-1` no tenía ancho mínimo y los paneles laterales usaban anchos fijos demasiado grandes (`max-w-sm` + `w-72`) que casi agotaban el viewport disponible. Se corrigió con anchos fijos más chicos (`w-64` lista, `w-60` ficha), `min-w-[420px]` en el contenedor del panel central y `overflow-x-auto` en el shell como red de seguridad en pantallas muy angostas.
  - **Bug encontrado y corregido**: el "marcar como leído" al abrir una conversación era fire-and-forget (`void sb.update(...)`), lo que generaba una carrera con la query de la lista (el badge de no-leídos seguía en 1 tras abrir el chat). Se corrigió esperando el update (`Promise.all` junto con las otras queries de la página).

## Etapa 3 — Bot IA limitado al negocio 🤖

- [x] **3.1 Config por agencia**: fila `whatsapp_bot_config` por empresa (habilitado, nombre comercial, dirección, horarios, financiación, política de permuta, mensaje fallback, keywords de handoff, tono, minutos de pausa por intervención humana). UI en `/whatsapp/configuracion` (permiso `whatsapp.bot`, con fallback de solo-lectura para roles sin permiso).
- [x] **3.2 Agente**: `src/lib/whatsapp/bot.ts` — dos motores: con `ANTHROPIC_API_KEY` usa Claude Haiku 4.5 (llamada REST directa, sin agregar el SDK como dependencia) con salida JSON `{reply, handoff}` validada; sin key, motor determinístico local con regex de intenciones + queries reales de stock/config. Ambos comparten las mismas reglas de handoff previas (keywords configurables, enojo, negociación de precio, intención de compra) que corren SIEMPRE antes de generar cualquier respuesta. Contexto: config + últimos 10 mensajes + stock real (`disponible`/`publicado`, máx 20, con precio real). Handoff → conversación `pendiente` + `bot_pausado_hasta` (según `pausa_intervencion_min`) + mensaje fallback enviado al cliente.
- [x] **3.3 Integración webhook**: `inbound.ts` llama al bot tras asociar cliente/vehículo, solo si `botEfectivo(conv.bot_activo, conv.bot_pausado_hasta)` — respeta tanto el flag global de la agencia como la pausa por conversación. Respuestas y fallback se guardan con `enviado_por_bot=true`. El resumen al cerrar conversación con participación del bot (nota en `cliente.observaciones`) ya estaba implementado desde la Etapa 2 (`agregarNotaResumenSiCorresponde`) — se reutiliza sin cambios.
- [x] **3.4 Verificación**: 8 escenarios E2E contra el webhook real (firmado con `META_APP_SECRET`, que el dueño ya cargó): saludo, stock real (9 unidades con precios), precio de un auto específico (Amarok — datos exactos de la DB), horarios, dirección, financiación, handoff por keyword ("hablar con humano"), negociación de precio ("me hacen un descuento") y enojo/reclamo ("es una estafa") — los 3 últimos derivaron correctamente con `estado=pendiente` + `bot_pausado_hasta` a +240min. Bot deshabilitado globalmente → 0 mensajes salientes (confirmado). Formulario de configuración probado end-to-end (guardar → fila real en `whatsapp_bot_config`). typecheck+lint+build verdes. Datos de prueba limpiados. Commit.

## Etapa 4 — Programados + plantillas + eventos ⏰

- [ ] **4.1 Plantillas**: CRUD local en `/whatsapp/plantillas` (nombre, idioma, categoría, cuerpo con `{{n}}`, schema de variables, estado approved/pending/rejected/unknown). Sin sync con Meta en v1 (queda anotado en docs como pendiente de producción). Permiso `whatsapp.plantillas`.
- [ ] **4.2 Programados**: `/whatsapp/programados` — tabla filtrable (fecha/cliente/motivo/estado), crear manual (cliente + plantilla o texto + fecha/hora + motivo), cancelar. Permiso `whatsapp.programados`.
- [ ] **4.3 Worker**: `POST /api/whatsapp/cron` (Bearer `WHATSAPP_CRON_SECRET`) — toma `pending` con `send_at <= now()` (lock optimista `update ... where status='pending'`), envía (plantilla si fuera de ventana; texto libre fuera de ventana → `failed` con motivo claro), reintentos máx 3 con backoff (`send_at += 15min`), log de errores. `vercel.json` cron + script dev.
- [ ] **4.4 Eventos automáticos**: al crear venta → +3d entrega, +30d postventa, +6m service, +12m renovación (usando plantillas por nombre convencional si existen; si no, se omite con log — no rompe la venta); lead nuevo por WhatsApp sin respuesta → +1d/+3d como `seguimiento` interno (no mensaje saliente, para no violar la ventana); cancelar programados al pasar lead a vendido/reservado/perdido. Cuotas: verificar el módulo de créditos real y, si aplica, recordatorio a -3 días del vencimiento.
- [ ] **4.5 Verificación**: programado manual → cron dev lo envía (FAKE_SEND) → `sent`; caso fuera de ventana sin plantilla → `failed` con motivo; venta nueva genera los 4 programados; typecheck+lint+build. Commit.

## Etapa 5 — Conexión oficial + seguridad + docs + tests ✅

- [ ] **5.1 Conexión**: sección "Conexión" en `/whatsapp/configuracion` — estado (conectado/desconectado/error + número + fecha + quién conectó), botón **Conectar WhatsApp** (Embedded Signup con JS SDK si `META_APP_ID`+`META_CONFIG_ID` están seteados; si no, form manual waba_id/phone_number_id/token con test de conexión), server action de intercambio de code + guardado cifrado, botón desconectar (marca `disconnected`, borra token, log; NO borra historial). Permiso `whatsapp.conectar`.
- [ ] **5.2 Auditoría de seguridad**: RLS de todas las tablas nuevas verificada con una segunda empresa de prueba (cero filas cross-tenant); webhook valida firma; cron valida bearer; service-role jamás en bundles de cliente; permisos aplicados en cada página/action; tokens nunca en logs ni respuestas.
- [ ] **5.3 Tests**: vitest — crypto round-trip, teléfono E.164 AR, parser webhook (fixtures), regla 24 h, decisión de handoff, render de plantilla con variables; `npm run test` verde.
- [ ] **5.4 Documentación**: `docs/whatsapp-integration.md` — arquitectura, envs, configuración de Meta paso a paso (app, webhook, verify token, Embedded Signup), cómo probar local (fixtures + FAKE_SEND + cron manual), limitaciones (ventana 24 h, plantillas, bot restringido a negocio), pendientes de producción.
- [ ] **5.5 Cierre**: repasar el criterio de aceptación del pedido punto por punto, typecheck+lint+build, actualizar este plan y referencia cruzada en `MVP_VENDIBLE_PLAN.md`, commit checkpoint.

---

## Registro de decisiones durante ejecución

*(completar por etapa al ejecutar: qué se decidió distinto del plan y por qué)*

- **Etapa 1 (2026-07-05)**: los enums no usan `create type if not exists` (no existe esa sintaxis en Postgres) sino guard por `pg_type` en un bloque DO. El service (`service.ts`) recibe el cliente Supabase por parámetro (sesión con RLS para actions, admin para webhook/worker) en vez de crearlo adentro — un solo código para ambos contextos. `.env.example.whatsapp` en la raíz documenta todas las envs sin tocar `.env.local`. El webhook responde 200 incluso ante errores de procesamiento (Meta reintenta ante non-200 y duplicaría efectos); la idempotencia real la da el unique parcial de `wa_message_id`. Matching de vehículo por scoring marca(2)+modelo(3) con umbral ≥3 para no asociar por marca sola.
- **Deploy real a Vercel (2026-07-05, fuera de las etapas pero necesario para conectar Meta)**: el usuario ya tenía Meta App creada y pidió conectar por link. Se agregaron las envs de WhatsApp al proyecto de Vercel (`vercel env add`, Production) y se deployó (`vercel deploy --prod`) a `https://crm-autos-tan.vercel.app`. El webhook de producción quedó verificado (`GET` con el verify token responde el challenge). El usuario cargó `META_APP_ID`/`META_APP_SECRET` directamente en `.env.local` — la validación de firma HMAC del webhook ya está activa en local también (antes aceptaba todo sin firma porque `META_APP_SECRET` estaba vacío).
- **Etapa 3 (2026-07-05)**: `botEfectivo` se movió de `data.ts` a `service.ts` (con `data.ts` reexportándolo) para que `inbound.ts` (capa `lib`, usada por el webhook) no dependiera de un módulo bajo `app/`. El motor de IA llama a la API de Anthropic por `fetch` directo en vez de agregar `@anthropic-ai/sdk` como dependencia — una sola llamada, no justifica el paquete. Si la llamada a Claude falla por cualquier motivo (red, JSON inválido, rate limit), cae automáticamente al motor determinístico en vez de romper la conversación.
