# Decisiones técnicas

Registro de las decisiones de arquitectura y su porqué. Cada entrada es una decisión que condiciona el resto del desarrollo.

---

## DT-001 · Stack: Next.js 14 + Supabase
**Decisión:** Next.js 14 (App Router) + TypeScript + Supabase (Postgres/Auth/Storage) + Tailwind.
**Por qué:** un solo repo full-stack, SSR para datos sensibles, y Supabase aporta Auth + Storage + Postgres con **RLS**, que resuelve el requisito central de aislamiento multiempresa a nivel de base de datos (no solo en la app). El MCP de Supabase ya estaba conectado.
**Alternativa descartada:** Next + Prisma + Postgres local + Auth.js — implicaba construir auth, storage y aislamiento a mano.

## DT-002 · Multitenant por RLS y `empresa_id`
**Decisión:** cada tabla de dominio lleva `empresa_id` y policies `using (empresa_id = auth_empresa_id())`.
**Por qué:** el aislamiento queda garantizado por Postgres aunque la app tenga un bug. Un usuario nunca puede leer datos de otra agencia, ni siquiera por una query mal escrita.
**Detalle:** `auth_empresa_id()` es SECURITY DEFINER para evitar recursión de RLS al leer `profile` dentro de las policies. `empresa_id` se denormaliza en tablas hijas para policies uniformes y rápidas.

## DT-003 · Usuarios = `auth.users` + `profile`
**Decisión:** la identidad vive en `auth.users` (Supabase Auth); los datos de aplicación en `public.profile` (1:1).
**Por qué:** aprovechamos el login, hashing y sesiones de Supabase. El trigger `handle_new_user` crea el profile al registrarse, tomando `empresa_id` y `rol` del `raw_user_meta_data`.

## DT-004 · Permisos: RBAC en la app, con puerta a permisos finos
**Decisión:** en esta etapa, permisos **por rol** evaluados en la capa de aplicación (`src/lib/auth/permissions.ts`).
**Por qué:** cubre el 90% de los casos sin complejidad. Para escalar a permisos finos por usuario **sin migración**, `profile.permisos` (jsonb) ya existe como override. El siguiente paso sería que `can()` consulte primero `permisos` y caiga al rol por defecto.
**Pendiente:** mover chequeos críticos también a RLS (ej. quién puede borrar autos) cuando el RBAC se afine.

## DT-005 · Calendario VTV configurable por empresa
**Decisión:** `empresa.vtv_calendario` (jsonb dígito→mes), default Provincia de Buenos Aires.
**Por qué:** el requisito pide explícitamente **no** atar la VTV solo a Buenos Aires. Cada agencia/jurisdicción puede tener su calendario. El `ultimo_digito` del vehículo es una columna generada desde la patente.

## DT-006 · Columnas generadas para cálculos base
**Decisión:** `vehiculo.margen_estimado` (= venta − costo), `vehiculo.ultimo_digito`, `venta.saldo` (= precio − seña) como columnas GENERATED.
**Por qué:** consistencia garantizada por la DB; el margen **neto** (que resta gastos) se calcula en la app/ficha porque depende de filas de `gasto_vehiculo`.

## DT-007 · Versiones de `@supabase/*`
**Decisión:** usar `@supabase/supabase-js` y `@supabase/ssr` **en su última versión** (≥2.108 / ≥0.12).
**Por qué:** los tipos TypeScript generados por la plataforma Supabase actual incluyen el marcador `__InternalSupabase` (PostgrestVersion). Las versiones viejas del cliente (2.46/0.5) no lo interpretaban y colapsaban el tipo de cada fila a `never`, además de no inferir los adaptadores de cookies. Actualizar resolvió ambos problemas (build y typecheck limpios).
**Lección:** cuando se regeneran tipos con el MCP, alinear la versión del cliente.

## DT-008 · Helper `rel()` para embeds de Supabase
**Decisión:** tipar las queries con embeds vía `.returns<Row[]>()` y normalizar el embed con `rel()` (`src/lib/rel.ts`).
**Por qué:** un embed to-one de PostgREST puede llegar como objeto o como array según el caso; `rel()` unifica el acceso y mantiene el tipado explícito y legible.

## DT-009 · Hardening de funciones
**Decisión:** `set_updated_at` con `search_path` fijo; `handle_new_user` sin EXECUTE para anon/authenticated; `auth_empresa_id`/`auth_rol` sin EXECUTE para anon (sí para authenticated, requerido por RLS).
**Por qué:** atender los advisors de seguridad de Supabase. Los helpers de tenant siguen ejecutables por `authenticated` porque las policies los invocan; solo exponen el `empresa_id`/`rol` del propio usuario.

## DT-010 · Estructura antes que features incompletas
**Decisión:** para módulos no implementados aún, crear tabla + RLS + una pantalla placeholder honesta (estado, etapa, próxima acción).
**Por qué:** evita pantallas en blanco y navegación rota; mantiene el "norte" del proyecto visible y deja el modelo listo para construir la UI encima.

---

## Preparado para integraciones futuras

- **WhatsApp Business API:** hoy usamos enlaces `wa.me` con teléfono normalizado. La estructura (plantillas, teléfono por cliente) queda lista para enchufar la API oficial sin rediseñar.
- **MercadoLibre:** `vehiculo.publicado_ml/ml_link/ml_estado/ml_fecha_pub` + tabla `publicacion`. Falta: OAuth ML, publicar/pausar/sincronizar desde el CRM (Etapa 10).
- **Storage (fotos/PDF):** `next.config` ya habilita el dominio de Supabase Storage; falta crear buckets y la subida (Etapa 3+).
