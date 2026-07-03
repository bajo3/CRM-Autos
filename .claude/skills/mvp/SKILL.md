---
name: mvp
description: Ejecuta el siguiente bloque pendiente del plan MVP Vendible (docs/MVP_VENDIBLE_PLAN.md) de punta a punta - implementar, verificar, documentar, commit. Usar cuando el usuario pida "seguir con el plan", "/mvp" o continuar la fase 2 del CRM.
---

# Ejecutar un bloque del plan MVP Vendible

## Pasos

1. **Leer el plan**: `docs/MVP_VENDIBLE_PLAN.md`. Identificar la fase más baja con ítems `[ ]` y tomar el **primer** ítem pendiente de esa fase. Las fases van en orden estricto (1 velocidad → 2 UX → 3 VTV → 4 estética → 5 PDFs → 6 cierre). No saltear.
2. **Contexto**: releer la sección "Diagnóstico de velocidad" del plan si el bloque es de fase 1, y los patrones de `CLAUDE.md` siempre.
3. **Implementar completo** — sin mockups, sin "próximamente", sin TODOs. Respetar:
   - RLS/multiempresa: todo insert lleva `empresa_id`; acciones sensibles chequean `can(rol, permiso)`.
   - `"use server"` solo exporta async; helpers sync en módulo hermano `lib.ts`.
   - Migraciones solo aditivas: aplicar vía Supabase MCP `apply_migration` (proyecto `emltbzmbhqfvtcmxgpgu`) Y guardar en `supabase/migrations/NN_nombre.sql`. Actualizar `src/lib/types/database.types.ts` a mano.
   - `formatARS`/`formatDate`/`humanize`, componentes de `src/components/ui/`, `rel()` para relaciones embebidas.
4. **Verificar** (obligatorio, todo en verde):
   ```
   npm run typecheck && npm run lint && npm run build
   ```
   Más prueba funcional:
   - Lecturas y botones de acción bound-void (`action={fn.bind(null, id)}` sin `useFormState`): probar con browser preview real.
   - Formularios de alta con `useFormState`: NO se pueden automatizar en este entorno (limitación conocida y documentada — no reintentar). Verificar insertando por SQL (`execute_sql`) + comprobando la lectura en pantalla; limpiar los datos de prueba después.
   - Para fase 1: medir tiempos con `npm run build && npm run start` (no dev) y anotar números en el plan.
5. **Documentar**: marcar `[x]` el ítem, completar las "Notas de implementación" de la fase con decisiones tomadas y cómo se probó.
6. **Commit** checkpoint local en `master`, mensaje en español con prefijo `feat:`/`fix:`/`perf:`/`docs:`. **Nunca push.**

## Reglas duras (no negociables)

- No tocar `.env.local`, no exponer secretos, no deploy, no push.
- No refactors grandes ni cambios de stack; reutilizar lo que existe.
- Nunca marcar `[x]` sin la verificación del paso 4 completa.
