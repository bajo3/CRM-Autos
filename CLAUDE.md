# CRM Autos — Guía para Claude Code

CRM SaaS multiagencia para concesionarias de autos en Argentina.

## Fuente de verdad del trabajo

- **`docs/CRM_AGENCIA_AUTOS_PLAN.md`** es el checklist maestro: qué está hecho `[x]`, qué falta `[]` y en qué orden. Leelo antes de arrancar cualquier bloque y actualizalo al terminar (nunca marcar `[x]` sin probar).
- Después de cada bloque estable: commit checkpoint local en `master`. **Nunca push** salvo pedido explícito.

## Stack

Next.js 14 App Router + React 18 + TypeScript + Tailwind. Supabase (Postgres/Auth/Storage, proyecto `emltbzmbhqfvtcmxgpgu`) con RLS multitenant por `empresa_id`. PDFs con pdf-lib. Idioma de la UI: español (Argentina), moneda ARS.

## Verificación obligatoria por bloque

```
npm run typecheck && npm run lint && npm run build
```

Los tres en verde antes de dar algo por terminado.

## Reglas duras

- No tocar `.env.local`, no exponer secretos, no deploy, no push a GitHub.
- Migraciones **solo aditivas/no destructivas** (`add column if not exists`, `create type if not exists`). Se aplican en remoto vía Supabase MCP `apply_migration` Y se guardan en `supabase/migrations/NN_nombre.sql`.
- Respetar RLS, RBAC y multiempresa en todo: cada insert lleva `empresa_id`; acciones sensibles chequean `can(rol, "permiso")` (`src/lib/auth/permissions.ts`).
- Reutilizar componentes de `src/components/ui/`. No refactors grandes ni reescrituras de stack.
- Nada de mockups, "próximamente" ni TODOs sueltos: se implementa completo o no se toca.

## Patrones del proyecto

- **`"use server"`:** esos archivos solo exportan funciones async. Constantes y helpers sync van en un módulo hermano (ej.: `presupuestos/lib.ts` junto a `presupuestos/actions.ts`).
- **Tipos de DB:** al agregar columnas, actualizar a mano `src/lib/types/database.types.ts` (Row/Insert/Update + enums en el union type Y en el array de constantes).
- **Relaciones embebidas:** `rel()` / `Rel<T>` de `src/lib/rel.ts` + `.returns<T>()` en las queries.
- **Sesión:** `getSessionContext()` devuelve `{userId, email, profile, empresa}` (empresa completa, incluye `slug`).
- **Performance:** shell instantáneo + `<Suspense>` para actividad secundaria + `loading.tsx` por ruta + paginación con `{ count: "exact" }` y `.range()`. Nunca cargar tablas enteras en el camino crítico (fue la causa del bug "la ficha de cliente tarda").
- **Formato:** `formatARS` / `formatDate` / `humanize` de `src/lib/format.ts` para TODO monto, fecha o enum visible.
- **PDFs:** motor en `src/lib/pdf/documento.ts`; subir a bucket (`documentos`/`catalogos`) y abrir vía URL firmada en un route handler `/abrir`.
- **WhatsApp:** helpers `waUrl()` y mensajes prearmados en `src/lib/data/whatsapp.ts`.

## Documentación

Vive en `docs/`. El plan maestro manda; los demás archivos (ROADMAP, PENDIENTES, ESTADO_ACTUAL) son históricos — si hay conflicto, gana el plan.
