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

- [x] **4.1 Plantillas**: CRUD local en `/whatsapp/plantillas` (nombre técnico validado `[a-z0-9_]+`, idioma, categoría, cuerpo con `{{n}}` validado como secuencial sin saltos, variables_schema autogenerado, estado aprobada/pendiente/rechazada/desconocido editable inline). Sin sync con Meta en v1 (queda anotado como pendiente de producción). Permiso `whatsapp.plantillas`.
- [x] **4.2 Programados**: `/whatsapp/programados` — tabla filtrable (teléfono/estado/motivo), crear manual (cliente + plantilla con variables o texto libre + fecha/hora + motivo), cancelar (solo si `pendiente`). Permiso `whatsapp.programados`.
- [x] **4.3 Worker**: `POST` y `GET /api/whatsapp/cron` (Bearer `WHATSAPP_CRON_SECRET`; Vercel Cron llama por GET) — toma `pendiente` con `send_at <= now()` (lock optimista por `update...eq("estado","pendiente")` antes de procesar), envía vía el mismo `service.ts` (plantilla siempre; texto libre solo si `dentroVentana24h`), reintentos máx 3 con backoff `+15min`, log de errores agotados. `vercel.json` con cron cada 5 min + `npm run wa:cron` (`scripts/wa-cron.js`) para dev.
- [x] **4.4 Eventos automáticos**: `src/lib/whatsapp/eventos.ts` — venta creada → +3d/+30d/+6m/+12m con plantillas convencionales (`venta_seguimiento_entrega`, `venta_postventa_30d`, `venta_service_6m`, `venta_renovacion_12m`), se omite con log si la plantilla no existe/no está aprobada; lead nuevo por WhatsApp → 2 `seguimiento` internos (+1d/+3d, sin mensaje saliente); cliente pasa a vendido/reservado/perdido → cancela sus programados pendientes. Cuotas: el schema real (`credito`) no tiene fecha de vencimiento por cuota individual (solo `fecha_inicio`+`cantidad_cuotas`), así que se programa un recordatorio a -3 días de la primera cuota (plantilla `cuota_recordatorio`) al crear el crédito — un recordatorio recurrente mes a mes necesitaría un job propio, documentado como pendiente de producción.
- [x] **4.5 Verificación**: **bug real encontrado y corregido durante el QA**: `programados-admin.tsx` (client component) importaba tipos/función pura desde `programados/data.ts`, que también exporta funciones server-only (`createClient` de `@/lib/supabase/server`) — Next.js intentaba bundlear `next/headers` para el cliente y rompía la compilación de *todas* las rutas. Se separaron los tipos y `nombreCliente()` a un `types.ts` sin dependencias de servidor; `data.ts` los reexporta para uso server-side. Verificado E2E real: venta con crédito por UI → 5 programados creados (4 de venta + 1 de cuota) con variables reales; worker manual (`npm run wa:cron`) envía uno → aparece en el historial del chat con el texto de la plantilla renderizado; texto libre fuera de ventana → `fallado` tras agotar 3 reintentos con backoff de 15 min (confirmado paso a paso); lead nuevo por WhatsApp → 2 seguimientos internos con fechas correctas; cliente pasado a "vendido" por UI → sus 4 programados pendientes se cancelaron automáticamente; creación y cancelación manual desde `/whatsapp/programados` verificadas por UI. Datos de prueba limpiados. typecheck+lint+build verdes. Commit.

## Etapa 5 — Conexión oficial + seguridad + docs + tests ✅

- [x] **5.1 Conexión**: sección "Conexión" en `/whatsapp/configuracion` — estado (conectado/desconectado/error + número + fecha + quién conectó), botón **Conectar WhatsApp** (Embedded Signup con JS SDK si `META_APP_ID`+`META_CONFIG_ID` están seteados; si no, form manual waba_id/phone_number_id/token con test real contra la Graph API), server action de intercambio de code + guardado cifrado, botón desconectar (marca `desconectado`, borra el token, log; NO borra historial). Permiso `whatsapp.conectar`.
  - **Verificado 2026-07-05**: conexión manual con `WHATSAPP_FAKE_SEND=1` → guarda cifrado, estado `conectado`, muestra fecha/usuario. Desconectar → `estado=desconectado`, token `null`, `waba_id`/`phone_number_id` preservados (no se pierde el historial). **Test con Meta real** (temporalmente `WHATSAPP_FAKE_SEND=0`, credenciales inválidas a propósito): la Graph API respondió de verdad y el error real de Meta ("Invalid OAuth access token - Cannot parse access token") se mostró en la UI con `estado=error` — confirma que el camino real (no simulado) funciona. Botón de Embedded Signup correctamente oculto porque `META_CONFIG_ID` todavía no está seteado (`META_APP_ID`/`META_APP_SECRET` sí los cargó el dueño) — el flujo completo (SDK, `FB.login`, listener de `postMessage`, intercambio de `code`) está implementado pero no se puede probar en vivo sin terminar la configuración de Embedded Signup en Meta (documentado como pendiente en la Etapa 5.4).
- [x] **5.2 Auditoría de seguridad**: RLS de todas las tablas nuevas verificada con una segunda empresa de prueba (cero filas cross-tenant); webhook valida firma; cron valida bearer; service-role jamás en bundles de cliente; permisos aplicados en cada página/action; tokens nunca en logs ni respuestas.
  - **Verificado 2026-07-05**: creé una empresa + 1 fila en cada una de las 7 tablas nuevas, y consulté las 7 vía PostgREST con el JWT real del usuario demo (no con el service role) → **0 filas** en todos los casos; sanity check confirmó que sí ve sus propias filas. `grep` confirmó: `admin.ts` (service-role) no se importa desde ningún archivo `"use client"`; `SUPABASE_SERVICE_ROLE_KEY` solo se referencia en `admin.ts` (y en un archivo preexistente ajeno a este módulo); ningún `console.*` del módulo imprime el token (solo mensajes de error genéricos); `access_token_encrypted` nunca se selecciona en ninguna query de página/componente, solo se escribe. Cada página y server action del módulo tiene su `can(...)` correspondiente. Datos de prueba limpiados.
- [x] **5.3 Tests**: vitest — crypto round-trip, teléfono E.164 AR, parser webhook (fixtures), regla 24 h, decisión de handoff, render de plantilla con variables; `npm run test` verde.
  - **Verificado 2026-07-05**: se agregó `vitest` como devDependency (no existía ningún framework de tests en el proyecto) + `vitest.config.ts` + script `npm run test`. 43 tests en 5 archivos, todos verdes: `crypto.test.ts` (round-trip, IV aleatorio, error sin key, formato inválido), `telefono.test.ts` (normalización AR incluyendo la limitación conocida del "15" viejo, `coincideTelefono`, `soloDigitos`), `webhook-parser.test.ts` (fixture real de mensaje + de status, payloads vacíos/inválidos), `service.test.ts` (`dentroVentana24h` en el límite exacto de 24h, `botEfectivo`, `renderPlantilla`, `validarVariablesPlantilla`, `preview`), `bot.test.ts` (`chequeoHandoffPrevio` para las 4 categorías de derivación + keywords personalizadas, `detectarVehiculo`). `chequeoHandoffPrevio` se exportó desde `bot.ts` (antes privada) específicamente para poder testearla de forma aislada. typecheck+lint+build verdes.
- [x] **5.4 Documentación**: `docs/whatsapp-integration.md` — arquitectura, envs, configuración de Meta paso a paso (app, webhook, verify token, Embedded Signup), cómo probar local (fixtures + FAKE_SEND + cron manual), limitaciones (ventana 24 h, plantillas, bot restringido a negocio), pendientes de producción.
  - Incluye 7 pendientes de producción documentados con honestidad: Embedded Signup real (falta META_CONFIG_ID + App Review), sync de plantillas con Meta, recordatorio de cuotas recurrente (limitación real del schema de créditos), frecuencia de cron en Vercel Hobby, descarga de medios, rate limits de Meta, y realtime real vs. polling.
- [x] **5.5 Cierre**: repasar el criterio de aceptación del pedido punto por punto, typecheck+lint+build, actualizar este plan y referencia cruzada en `MVP_VENDIBLE_PLAN.md`, commit checkpoint.
  - **Criterio de aceptación del pedido original — repasado el 2026-07-05, 13/13 cumplidos:**
    1. ✅ Una agencia puede conectar su WhatsApp desde el CRM (alta manual verificada E2E con test real contra Meta; Embedded Signup implementado, falta `META_CONFIG_ID` para probarlo en vivo — documentado).
    2. ✅ El CRM recibe mensajes entrantes por webhook (verificado con fixtures reales y firma HMAC).
    3. ✅ El mensaje crea o asocia cliente/lead (verificado: lead nuevo + matching por teléfono).
    4. ✅ El chat aparece en la bandeja del CRM (verificado en navegador).
    5. ✅ Un usuario puede responder manualmente (verificado, con pausa automática del bot).
    6. ✅ El bot responde preguntas básicas usando stock real (8 escenarios verificados).
    7. ✅ El vendedor puede pausar el bot (pausa automática por intervención + botones manuales pausar/reactivar).
    8. ✅ Se pueden crear mensajes programados (manual por UI + automáticos desde ventas/leads/cuotas).
    9. ✅ Los mensajes fuera de 24h usan plantillas (forzado en el composer y en el worker; verificado el `fallado` cuando no hay plantilla).
    10. ✅ Todo queda guardado en historial (`whatsapp_mensaje` + `whatsapp_evento_log`).
    11. ✅ Multiagencia respetado (RLS verificado con empresa de prueba real vía PostgREST, 0 filas cross-tenant).
    12. ✅ No hay credenciales hardcodeadas (todo por variables de entorno, auditado por grep).
    13. ✅ Hay documentación en Markdown (`docs/whatsapp-integration.md` + este plan).
  - typecheck+lint+test+build verdes. Referencia cruzada agregada en `docs/MVP_VENDIBLE_PLAN.md` (nueva sección "Módulo WhatsApp Business (post-MVP)"). Commit checkpoint final.

---

## Registro de decisiones durante ejecución

*(completar por etapa al ejecutar: qué se decidió distinto del plan y por qué)*

- **Etapa 1 (2026-07-05)**: los enums no usan `create type if not exists` (no existe esa sintaxis en Postgres) sino guard por `pg_type` en un bloque DO. El service (`service.ts`) recibe el cliente Supabase por parámetro (sesión con RLS para actions, admin para webhook/worker) en vez de crearlo adentro — un solo código para ambos contextos. `.env.example.whatsapp` en la raíz documenta todas las envs sin tocar `.env.local`. El webhook responde 200 incluso ante errores de procesamiento (Meta reintenta ante non-200 y duplicaría efectos); la idempotencia real la da el unique parcial de `wa_message_id`. Matching de vehículo por scoring marca(2)+modelo(3) con umbral ≥3 para no asociar por marca sola.
- **Deploy real a Vercel (2026-07-05, fuera de las etapas pero necesario para conectar Meta)**: el usuario ya tenía Meta App creada y pidió conectar por link. Se agregaron las envs de WhatsApp al proyecto de Vercel (`vercel env add`, Production) y se deployó (`vercel deploy --prod`) a `https://crm-autos-tan.vercel.app`. El webhook de producción quedó verificado (`GET` con el verify token responde el challenge). El usuario cargó `META_APP_ID`/`META_APP_SECRET` directamente en `.env.local` — la validación de firma HMAC del webhook ya está activa en local también (antes aceptaba todo sin firma porque `META_APP_SECRET` estaba vacío).
- **Etapa 3 (2026-07-05)**: `botEfectivo` se movió de `data.ts` a `service.ts` (con `data.ts` reexportándolo) para que `inbound.ts` (capa `lib`, usada por el webhook) no dependiera de un módulo bajo `app/`. El motor de IA llama a la API de Anthropic por `fetch` directo en vez de agregar `@anthropic-ai/sdk` como dependencia — una sola llamada, no justifica el paquete. Si la llamada a Claude falla por cualquier motivo (red, JSON inválido, rate limit), cae automáticamente al motor determinístico en vez de romper la conversación.
- **Etapa 4 (2026-07-05)**: Vercel Cron llama por **GET** (no POST) e inyecta `Authorization: Bearer` solo si existe una env llamada exactamente `CRON_SECRET` (convención propia de Vercel). Como el proyecto ya usa `WHATSAPP_CRON_SECRET` desde la Etapa 1, la ruta acepta ambos métodos (GET/POST) validando contra `WHATSAPP_CRON_SECRET`; para que el cron de producción funcione hay que setear en Vercel una env `CRON_SECRET` con el mismo valor (documentado en Etapa 5.4). El patrón "página cliente importa tipos desde un `data.ts` server-only" causó un bug real de build (ver 4.5) — a partir de ahora, cualquier tipo/función pura que un client component necesite de un módulo de datos va en un `types.ts` hermano sin imports de servidor.
