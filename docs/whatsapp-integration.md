# Integración de WhatsApp Business (Cloud API)

Módulo multiagencia: cada empresa conecta su propio número de WhatsApp Business, recibe y envía
mensajes desde el CRM, tiene un bot IA limitado al negocio, y puede programar mensajes de
seguimiento/postventa/cuotas. Implementado en `docs/WHATSAPP_PLAN.md` (plan de ejecución, historial
de decisiones y QA detallado por etapa). Este documento es la referencia técnica para operar y
extender el módulo.

## Arquitectura

```
Meta (WhatsApp Cloud API)
   │
   │ POST /api/whatsapp/webhook  (mensajes entrantes + estados de salientes)
   ▼
route.ts (valida firma HMAC) ──► inbound.ts ──► asocia cliente/lead, detecta vehículo,
   │                                              guarda mensaje, dispara el bot si corresponde
   │
   ▼
Supabase (RLS por empresa_id)
   ├─ whatsapp_account       (1 por empresa: conexión con Meta)
   ├─ whatsapp_conversacion  (1 por empresa+teléfono)
   ├─ whatsapp_mensaje       (historial, idempotente por wa_message_id)
   ├─ whatsapp_bot_config    (config del agente por empresa)
   ├─ whatsapp_plantilla     (plantillas locales, sin sync con Meta todavía)
   ├─ whatsapp_programado    (cola de mensajes a futuro)
   └─ whatsapp_evento_log    (auditoría: conexión, envíos, bot, etc.)

CRM (Next.js App Router)
   ├─ /whatsapp                 bandeja (lista + chat + ficha del cliente)
   ├─ /whatsapp/configuracion   conexión con Meta + config del bot
   ├─ /whatsapp/plantillas      CRUD de plantillas
   ├─ /whatsapp/programados     cola de programados + alta manual
   └─ /api/whatsapp/cron        worker que envía los programados vencidos (Vercel Cron o manual)
```

Todo el código vive en `src/lib/whatsapp/` (lógica pura + servicio de envío, reutilizable desde
webhook, UI y worker) y `src/app/(app)/whatsapp/` + `src/app/api/whatsapp/` (rutas).

### Dos clientes de Supabase

- **Con sesión** (`src/lib/supabase/server.ts`, vía RLS): usado por páginas y server actions —
  cada empresa solo ve/edita sus propias filas.
- **Admin / service-role** (`src/lib/supabase/admin.ts`): usado **solo** por el webhook y el worker
  de cron, que corren sin sesión de usuario. Bypassea RLS — por eso cada query en `inbound.ts` y
  `route.ts` filtra `empresa_id` explícitamente. **Nunca se importa desde un componente cliente.**

## Variables de entorno

Ver `.env.example.whatsapp` en la raíz del repo. Resumen:

| Variable | Obligatoria | Uso |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Cliente admin (webhook, worker, bot). Sin esto, el webhook falla silenciosamente. |
| `META_VERIFY_TOKEN` | Sí | Verificación `GET` del webhook (lo inventás vos, se repite en la config de Meta). |
| `WHATSAPP_TOKEN_KEY` | Sí | Clave AES-256-GCM (32 bytes en base64: `openssl rand -base64 32`) para cifrar tokens de acceso. |
| `WHATSAPP_CRON_SECRET` | Sí | Bearer del worker `/api/whatsapp/cron`. |
| `WHATSAPP_API_VERSION` | No (default `v21.0`) | Versión de la Graph API. |
| `WHATSAPP_FAKE_SEND` | No | `1` en dev/QA: simula envíos y pruebas de conexión sin llamar a Meta. **No usar en producción.** |
| `META_APP_ID` / `META_APP_SECRET` | Solo para Embedded Signup / firma de webhook | Del dashboard de tu app de Meta. `META_APP_SECRET` también verifica el `signed_request` de `/api/meta/deauthorize` y `/api/meta/data-deletion`. |
| `META_CONFIG_ID` | Solo para Embedded Signup | Config de "WhatsApp Embedded Signup" de tu app. |
| `ANTHROPIC_API_KEY` | No | Bot con IA (Claude Haiku). Sin esto, el bot usa un motor determinístico local con datos reales — sigue funcionando, sin costo de API. |
| `NEXT_PUBLIC_SITE_URL` | Ya existía en el proyecto | URL pública (webhook, links). No crear una variable nueva para esto. |

`CRON_SECRET` (Vercel, en producción): además de `WHATSAPP_CRON_SECRET`, hay que crear en Vercel una
env llamada **exactamente** `CRON_SECRET` con el mismo valor — Vercel Cron solo inyecta
`Authorization: Bearer` automáticamente si la env tiene ese nombre exacto.

## Modelos de datos

Migración `supabase/migrations/22_whatsapp.sql` (aditiva). Todas las tablas tienen RLS por
`empresa_id = auth_empresa_id()` (select/insert/update/delete), igual que el resto del schema.

- **`whatsapp_account`**: 1 fila por empresa (`unique(empresa_id)`). `access_token_encrypted` nunca
  se expone a la UI (ninguna query de página lo selecciona).
- **`whatsapp_conversacion`**: 1 fila por empresa+teléfono (`unique(empresa_id, telefono)`).
  `ultima_entrada_at` decide la ventana de 24h. `bot_pausado_hasta` pausa el bot temporalmente
  (por handoff o por intervención manual de un vendedor).
- **`whatsapp_mensaje`**: `wa_message_id` con índice único parcial → idempotencia real ante
  reintentos de Meta.
- **`whatsapp_bot_config`**, **`whatsapp_plantilla`**, **`whatsapp_programado`**,
  **`whatsapp_evento_log`**: ver comentarios en la migración para el detalle de columnas.

## Flujo de conexión (Embedded Signup)

1. El dueño de la agencia entra a `/whatsapp/configuracion` → sección "Conexión".
2. Si `META_APP_ID` y `META_CONFIG_ID` están seteados en el servidor, aparece el botón
   **"Conectar WhatsApp"**: carga el SDK de Facebook (`connect.facebook.net/es_LA/sdk.js`), llama
   `FB.login({ config_id, response_type: "code", ... })`, y escucha el evento
   `postMessage` `WA_EMBEDDED_SIGNUP` (`event === "FINISH"`) para capturar `waba_id` y
   `phone_number_id` que Meta entrega durante el flujo.
3. Al terminar, el cliente llama a la server action `completarEmbeddedSignup({ code, wabaId,
   phoneNumberId, businessId })`, que:
   - intercambia el `code` por un access token (`GET /oauth/access_token` con `client_id` +
     `client_secret` + `code`),
   - valida el `phone_number_id` contra la Graph API (`testearConexionMeta`),
   - cifra el token y guarda `whatsapp_account` con `estado='conectado'`.
4. Si `META_CONFIG_ID` no está seteado (caso actual del proyecto), el botón no aparece y queda
   solo el **alta manual**: pegar `waba_id`, `phone_number_id` y un token permanente. El formulario
   también valida contra la Graph API real antes de guardar.
5. **Desconectar** marca `estado='desconectado'` y borra el token cifrado, pero conserva
   `waba_id`/`phone_number_id` y **todo el historial de conversaciones/mensajes** (decisión de
   negocio: el historial es de la agencia, no de la conexión técnica).

### Cómo configurar Meta (paso a paso)

1. Crear una app en [developers.facebook.com](https://developers.facebook.com) (tipo "Business").
2. Agregar el producto **WhatsApp** a la app.
3. En **WhatsApp → Configuración → Webhooks**:
   - Callback URL: `https://TU-DOMINIO/api/whatsapp/webhook`
   - Verify token: el valor de `META_VERIFY_TOKEN`
   - Suscribirse al campo `messages`.
4. En **Configuración básica de la app**: copiar App ID y App Secret → `META_APP_ID` / `META_APP_SECRET`.
5. Para Embedded Signup: crear una **Configuración de Embedded Signup** (WhatsApp → Introducción o
   Configuración, según la versión del panel) y copiar su ID → `META_CONFIG_ID`. Requiere que la
   app esté en modo Business y (para producción real, con clientes ajenos a tu propia cuenta) pasar
   App Review para los permisos `whatsapp_business_management` y `whatsapp_business_messaging`.
6. Para App Review: en **Configuración → Básica → Avanzada** de la app, completar **Deauthorize
   callback URL** (`https://TU-DOMINIO/api/meta/deauthorize`) y **Data Deletion Request URL**
   (`https://TU-DOMINIO/api/meta/data-deletion`).

## Webhooks

- `GET /api/whatsapp/webhook`: responde el `hub.challenge` si `hub.verify_token` coincide con
  `META_VERIFY_TOKEN`; si no, `403`.
- `POST /api/whatsapp/webhook`: valida `X-Hub-Signature-256` (HMAC-SHA256 con `META_APP_SECRET`) —
  si `META_APP_SECRET` no está seteado, acepta sin validar (solo aceptable en dev). Parsea
  `messages` (entrantes) y `statuses` (estados de salientes) con `webhook-parser.ts` (puro,
  testeado). Responde `200` siempre que el parseo sea válido, incluso si el procesamiento interno
  falla — Meta reintenta ante respuestas distintas de `200`, y reintentar duplicaría efectos; la
  idempotencia real la da el índice único de `wa_message_id`.
- La ruta está excluida del middleware de autenticación (`src/lib/supabase/middleware.ts`) porque
  Meta no manda cookies de sesión — se protege sola con la firma.

## Cumplimiento de Meta (App Review): deauthorize + data deletion

Facebook Login for Business exige dos callbacks públicos para aprobar los permisos de WhatsApp
Business (`whatsapp_business_management`, `whatsapp_business_messaging`). Ambos reciben un
`signed_request` (POST, `x-www-form-urlencoded`) firmado con `META_APP_SECRET`
(`HMAC-SHA256(payload_b64, app_secret)`, verificado en `src/lib/whatsapp/meta-signed-request.ts`,
con tests en el archivo hermano `.test.ts`). Se ubican fuera de `/api/whatsapp/` porque no son
parte de la Cloud API sino del lado "Facebook Login" de la app; están excluidos del middleware de
sesión igual que el resto de callbacks de Meta.

- **`POST /api/meta/deauthorize`**: Meta lo llama cuando el usuario quita la app desde su
  configuración de Facebook. Busca la `whatsapp_account` por `fb_user_id`, la marca
  `estado='desconectado'` y borra el token cifrado (conserva el historial de conversaciones, igual
  que la desconexión manual).
- **`POST /api/meta/data-deletion`**: Meta lo llama cuando el usuario pide borrar sus datos. Lo
  único personal del usuario de Facebook que el CRM guarda es `fb_user_id` (vincula la conexión con
  su cuenta) — se borra junto con el token. El historial de conversaciones de WhatsApp es dato
  comercial de la agencia con sus propios clientes, no del usuario de Facebook que autorizó la app,
  y no se toca. Responde `{url, confirmation_code}` con una URL de estado.
- **`GET /api/meta/data-deletion?id=<código>`**: página de estado que Meta exige mostrarle al
  usuario. El borrado es sincrónico (ocurre en el propio POST), así que esta página siempre confirma
  "completado" para cualquier código con formato válido.

`whatsapp_account.fb_user_id` (migración `24_meta_compliance.sql`) se completa solo por Embedded
Signup (`authResponse.userID` del SDK de Facebook) — el alta manual no pasa por Facebook Login y
queda `null`. Si un cliente conectó por alta manual, estos callbacks no tienen cómo ubicarlo (no hay
`fb_user_id` que buscar); es una limitación inherente a no haber pasado por OAuth de Facebook.

No se implementó un flujo `GET /api/meta/oauth/start` + `/callback` por redirect: el Embedded Signup
ya usa el SDK de Facebook en un popup (`FB.login` con `response_type: "code"`) y el intercambio del
`code` se hace server-side en `completarEmbeddedSignup` (`src/app/(app)/whatsapp/configuracion/actions.ts`).
Agregar un segundo flujo por redirect duplicaría esa lógica sin necesidad.

## Worker de mensajes programados

`POST` o `GET /api/whatsapp/cron`, protegido con `Authorization: Bearer ${WHATSAPP_CRON_SECRET}`.

- Toma hasta 25 `whatsapp_programado` con `estado='pendiente'` y `send_at <= now()`.
- Lock optimista: un `update` condicionado a `estado='pendiente'` antes de procesar cada fila (si
  dos workers corrieran a la vez, el segundo no encuentra la fila y la salta).
- Envía por plantilla siempre, o por texto libre solo si la conversación tiene la ventana de 24h
  abierta (si no, falla con un motivo claro — ver "Limitaciones").
- Reintentos: hasta 3 intentos con backoff de 15 minutos (`send_at += 15min`,
  `intentos_restantes -= 1`); al agotarse, `estado='fallado'` con el motivo y un evento en
  `whatsapp_evento_log`.
- En producción, `vercel.json` define un cron cada 5 minutos. En Hobby plan de Vercel, los cron
  jobs pueden estar limitados a una frecuencia menor (ver "Pendientes de producción").
- En desarrollo: `npm run wa:cron` (con `npm run dev` corriendo en otra terminal) dispara el worker
  manualmente contra `localhost`.

## Bot IA limitado al negocio

`src/lib/whatsapp/bot.ts`. Reglas de handoff **determinísticas** (siempre corren, con o sin IA):
palabras clave configurables por agencia, enojo/reclamo, negociación de precio, intención fuerte de
compra. Si ninguna aplica:

- **Con `ANTHROPIC_API_KEY`**: llama a Claude Haiku 4.5 (REST directo, sin SDK) con un system prompt
  que incluye la config de la agencia y el stock real (máx. 20 unidades con precio). El modelo
  responde JSON `{reply, handoff}` — si dice `handoff: true` o no da `reply`, se descarta su
  respuesta y se deriva igual (nunca se manda una respuesta "insegura" del modelo).
- **Sin `ANTHROPIC_API_KEY`**: motor determinístico local con regex de intenciones (stock, precio de
  un auto puntual, horarios, dirección, financiación, permuta, saludo) que consulta datos reales de
  la base — nunca inventa autos ni precios. Si no matchea ninguna intención, deriva.

En ambos casos, si no hay dato configurado (p. ej. financiación vacía), el bot deriva en vez de
prometer algo sin base.

## Cómo probar localmente

1. `.env.local` con las variables de la tabla de arriba (`WHATSAPP_FAKE_SEND=1` recomendado).
2. `npm run dev`.
3. Simular un mensaje entrante con `curl` (ver `docs/WHATSAPP_PLAN.md`, sección de decisiones, para
   fixtures completos), firmado con HMAC-SHA256 si `META_APP_SECRET` está seteado:
   ```bash
   curl -X POST http://localhost:3000/api/whatsapp/webhook \
     -H "Content-Type: application/json" \
     -H "X-Hub-Signature-256: sha256=$(openssl dgst -sha256 -hmac "$META_APP_SECRET" body.json | sed 's/^.* //')" \
     --data-binary @body.json
   ```
4. Verificar en `/whatsapp` que la conversación aparece, y en `/whatsapp/[id]` responder manualmente.
5. Programados: crear uno en `/whatsapp/programados` con `send_at` en el pasado, correr
   `npm run wa:cron`, verificar que pasa a `enviado` (o `fallado` con motivo si corresponde).
6. `npm run test` corre la suite de vitest (lógica pura: cripto, teléfonos, parser, ventana 24h,
   handoff, plantillas).

## Modo beta: Baileys por QR

Mientras la verificación de negocio de Meta para el Embedded Signup está pendiente, el módulo
soporta un transporte alternativo **no oficial** (Baileys, conexión por QR como WhatsApp Web) para
poder probar todo el pipeline del CRM de punta a punta ya mismo. La regla de oro: **el bridge habla
exactamente el mismo contrato que Meta** — mismos payloads de envío (Graph API) y mismos webhooks
entrantes (formato Meta, firmados con HMAC-SHA256) — así que el resto del CRM (service.ts, inbound,
bot, bandeja, plantillas, worker) no se bifurca ni sabe qué transporte se está usando.

### Arquitectura

```
CRM (Next.js)  <-- Graph API shape -->  bridge/ (Node/Express + Baileys)  <-- WhatsApp Web protocol -->  WhatsApp
     |                                          |
     | POST /sessions/:empresaId/messages       | sock.sendMessage(...)
     |<-- webhook formato Meta, firmado --------| messages.upsert -> construirWebhookMensajeTexto()
```

- `whatsapp_account.provider` (migración `25_whatsapp_provider.sql`) distingue `'meta'` | `'baileys'`
  por empresa. `src/lib/whatsapp/service.ts` tiene un único punto de envío (`enviarPorCuenta`) que
  elige transporte según ese campo: todo lo demás (persistencia, ventana 24h, logs, bot) es idéntico.
- `src/lib/whatsapp/bridge.ts` es el cliente del bridge desde el CRM: `bridgePost` devuelve el mismo
  shape que `metaPost` (`meta.ts`) y lanza `WhatsAppApiError` en error, para que `service.ts` no tenga
  que distinguir el origen del error. También expone `bridgeStatus`, `bridgeStart`, `bridgeLogout` y
  `bridgeHabilitado()` (true solo si `WHATSAPP_BRIDGE_URL` está seteada en el servidor).
- `bridge/` es un proyecto Node **independiente**, fuera del build de Next (`tsconfig.json` lo
  excluye explícitamente). Vive en la raíz del repo, se commitea el código pero no
  `bridge/node_modules`, `bridge/sessions` ni `bridge/.env` (gitignoreados).
  - `bridge/src/index.js`: servidor Express, rutas y auth (`Authorization: Bearer BRIDGE_SECRET`).
  - `bridge/src/session.js`: una sesión Baileys por empresa (`useMultiFileAuthState('sessions/<empresaId>')`),
    reconexión automática salvo logout explícito, y el listener de `messages.upsert` que arma y postea
    el webhook al CRM.
  - `bridge/src/meta-format.js`: funciones puras de conversión (sin I/O) — traducir el payload de
    envío Graph API a un `sendMessage` de Baileys, y armar el payload de webhook entrante con el shape
    exacto que espera `webhook-parser.ts`. Tiene su propia suite vitest (`bridge/src/meta-format.test.js`).

### Rutas del bridge

| Ruta | Qué hace |
| --- | --- |
| `POST /sessions/:empresaId/start` | Inicia o retoma la sesión. Responde `{status}`. |
| `GET /sessions/:empresaId/status` | `{status, qrDataUrl?, phone?}`. `status` es `qr` \| `connecting` \| `connected` \| `disconnected`. |
| `POST /sessions/:empresaId/messages` | Body = payload Graph API. Solo soporta `type:"text"` en esta beta; otros tipos devuelven 400 con un mensaje estilo error de Graph (`code: 131009`). |
| `DELETE /sessions/:empresaId` | Logout + borra las credenciales guardadas en disco. |

### Cómo correr todo

1. `bridge/.env` (copiar de `bridge/.env.example`, no se commitea): `BRIDGE_SECRET` propio,
   `CRM_WEBHOOK_URL=http://localhost:3000/api/whatsapp/webhook`, y el **mismo** `META_APP_SECRET`
   que usa el CRM (para que la firma HMAC valide en el webhook).
2. `.env.local` del CRM: agregar `WHATSAPP_BRIDGE_URL=http://localhost:3900` y
   `WHATSAPP_BRIDGE_SECRET=<el mismo valor que bridge/.env>`.
3. `npm run bridge:install` (una vez) y después, en dos terminales:
   - `npm run bridge`
   - `npm run dev`
4. Entrar a `/whatsapp/configuracion`: si `WHATSAPP_BRIDGE_URL` está seteada aparece la card
   **"Conexión beta por QR (no oficial)"**. Click en "Conectar por QR (beta)", escanear el QR desde
   WhatsApp (número de pruebas) → Dispositivos vinculados → Vincular un dispositivo.
5. Al conectar, el CRM guarda `whatsapp_account` con `provider:'baileys'`,
   `phone_number_id:'baileys-<empresaId>'` y sin `access_token_encrypted` (el bridge maneja su propia
   sesión). A partir de ahí, enviar/recibir funciona igual que con Meta desde el resto del CRM.

### Advertencia (ToS / riesgo de bloqueo)

Baileys **no es la API oficial de WhatsApp**: automatiza el protocolo de WhatsApp Web. Usarlo viola
los Términos de Servicio de WhatsApp y el número conectado puede ser **bloqueado sin aviso**. Esta
vía es solo para la beta interna, con un número de pruebas — nunca usar el número real de la agencia.
La UI muestra esta misma advertencia en la card de conexión.

### Qué falta para pasar a la API oficial de Meta

Nada del pipeline cambia. Cuando la verificación de negocio de Meta esté aprobada:

1. Completar el Embedded Signup real desde la misma pantalla de configuración (ya implementado,
   solo esperando `META_CONFIG_ID` habilitado en Meta) o el alta manual con token permanente.
2. Eso deja `whatsapp_account.provider='meta'` para la empresa (los upserts de `conectarWhatsappManual`
   / `completarEmbeddedSignup` ya lo fuerzan explícitamente).
3. Opcionalmente, desconectar/apagar el bridge — el CRM deja de necesitarlo para esa empresa.

No hace falta tocar `service.ts`, `inbound.ts`, el bot, la bandeja ni el worker de programados: todos
ya funcionan por `provider`, no por transporte hardcodeado.

### Pendiente conocido de esta beta

- **Estados de salientes (sent/delivered/read)**: no se mapean desde Baileys al formato
  `statuses` de Meta en esta primera versión — quedó fuera para no complicar el bridge. Los mensajes
  enviados por Baileys quedan en estado `enviado` sin avanzar a `entregado`/`leído` en el CRM.
- **Solo texto**: multimedia (imagen, audio, documento, video) no está soportado ni de entrada ni de
  salida en la beta; el bridge devuelve 400 explícito si se intenta enviar un tipo no soportado.
- **Read receipts salientes** (`markMessageAsRead` en `service.ts`) se saltean para cuentas
  `provider:'baileys'`: el bridge no expone esa ruta en esta beta.

## Limitaciones de WhatsApp (y cómo las maneja el módulo)

- **Ventana de 24 horas**: solo se puede mandar texto libre dentro de las 24h desde el último
  mensaje del cliente. Fuera de esa ventana, **obligatoriamente** hay que usar una plantilla
  aprobada. El composer de la bandeja y el worker de programados fuerzan esta regla
  (`dentroVentana24h` en `service.ts`).
- **Plantillas**: hoy son un registro **local** (tabla `whatsapp_plantilla`), sin sincronización con
  el catálogo real de plantillas aprobadas por Meta. El campo `estado` se administra a mano en el
  CRM. En producción, una plantilla marcada "aprobada" en el CRM debe corresponder a una plantilla
  realmente aprobada en Meta (Business Manager → WhatsApp Manager) con el mismo nombre e idioma, o
  el envío real fallará del lado de Meta.
- **Bot IA restringido**: nunca es un chat de propósito general. Solo responde sobre stock, precio,
  horarios, ubicación, financiación y permuta con datos reales de la empresa, y deriva todo lo
  demás a un vendedor humano.
- **Envíos simulados** (`WHATSAPP_FAKE_SEND=1`): pensado únicamente para dev/QA. En producción debe
  estar sin setear (o en `0`).

## Pendientes de producción

- **Embedded Signup real**: falta terminar la configuración en Meta (`META_CONFIG_ID`) y, si la
  agencia va a conectar clientes ajenos a la propia cuenta del dueño del CRM, pasar App Review de
  Meta para los permisos de WhatsApp Business Management. El código está completo; no se pudo
  probar en vivo en esta implementación por esa razón.
- **Sincronización de plantillas con Meta**: hoy es un registro local. Para producción real conviene
  agregar un job que lea el estado real de las plantillas desde la Graph API
  (`GET /{waba_id}/message_templates`) y lo refleje en `whatsapp_plantilla.estado`.
- **Recordatorio de cuotas recurrente**: el schema de créditos (`credito`) no guarda una fecha de
  vencimiento por cuota individual, solo `fecha_inicio` + `cantidad_cuotas`. Hoy se programa un
  único recordatorio (-3 días de la primera cuota) al crear el crédito. Un recordatorio mes a mes
  para todas las cuotas restantes necesitaría un job diario propio (o extender `crm_run_daily_jobs`)
  que calcule la próxima cuota pendiente.
- **Frecuencia del cron en Vercel Hobby**: el plan gratuito de Vercel puede limitar la frecuencia
  mínima de los cron jobs (históricamente, una vez por día). Si el proyecto corre en Hobby, hay que
  o bien actualizar a Pro, o disparar `/api/whatsapp/cron` desde un servicio externo (ej. un cron de
  GitHub Actions o cron-job.org) que le pegue al endpoint con el bearer correcto cada pocos minutos.
- **Descarga de medios**: el webhook guarda el `caption` de imágenes/audio/documentos, pero no
  descarga ni almacena el archivo multimedia en sí (`media_url` queda `null` en esos mensajes). Para
  producción, agregar la descarga vía `GET /{media_id}` + subida a Supabase Storage.
- **Rate limits de Meta**: no hay manejo explícito de rate limiting de la Graph API (más allá de los
  3 reintentos con backoff del worker). Con volumen alto, conviene agregar un límite de envíos por
  minuto por cuenta.
- **Realtime real**: la bandeja usa polling cada 5 segundos (`LiveRefresh`) en vez de WebSockets/
  Supabase Realtime — funciona bien para el volumen de una agencia, pero no escala a decenas de
  agentes concurrentes sin aumentar la carga de queries.
