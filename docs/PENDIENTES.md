# Pendientes

Lo que falta, ordenado por prioridad. Cada ítem incluye la **próxima acción concreta**.

## ✅ Resuelto

- **Fase 2:** Stock (edición/baja/fotos/gastos), Clientes (alta/edición/ficha), Seguimientos, Encargos (alta + matching), Ventas y Reservas (alta con efectos), jobs automáticos. Ver [CHANGELOG](CHANGELOG.md).
- **2026-06-15 — Etapas 4, 6 y 7 cerradas:** historial de contacto unificado + registrar contacto (4); ficha de venta con checklist de entrega editable (6); alta de VTV con cálculo por patente + alertas 30/7 días diferenciadas (7).
- **2026-06-15 — Etapa 8 cerrada:** motor pdf-lib con **10 documentos** (recibos, boleto, presupuesto, datero, fichas cliente/vehículo, autorizaciones) + numeración correlativa + bucket privado `documentos` + generación contextual desde fichas de venta/cliente/vehículo y `/documentos` + acceso a los generados. _Reemplazó el recibo HTML provisional._
- **2026-06-15 — Etapa 9 cerrada:** generador de catálogo de stock filtrable + PDF con fotos/precio (bucket público `catalogos`) + compartir por WhatsApp (`waUrl` + plantillas) + historial.
- **2026-06-15 — Etapa 10 cerrada:** deploy en Vercel (`crm-autos-tan.vercel.app`); panel de publicaciones por canal; OAuth + webhook + acciones de MercadoLibre (API real); página pública `/p/[slug]`.
- **2026-06-15 — Etapa 11 cerrada:** reportes (`/reportes`) con KPIs + ranking de vendedores + rentabilidad + stock; comisiones por venta (`/comisiones`); exportación CSV de ventas/stock/clientes.
- **2026-06-15 — Etapa 12 (parcial):** historial de cambios poblado + visor en ficha; chequeos críticos (borrado, cambio de precio) en RLS/trigger; páginas propias de error/404/loading. _Falta de la etapa: importación CSV._

## 🔴 Prioridad alta (próximo)

1. **Afinar publicación de ítems en ML**: probar la creación con una cuenta conectada real y ajustar categoría/atributos de autos según los errores que devuelve ML (el panel ya los muestra). Procesar las notificaciones del webhook (hoy solo se registran).
2. **Control documental por ítem** del vehículo (`documento_vehiculo`): checklist editable con archivos adjuntos a Storage.
3. **Checklist de ingreso** del vehículo editable (el de entrega de venta ya está en la Etapa 6).

## 🟡 Prioridad media-baja (documentos y difusión)

10. **Test Drive**: módulo de agenda/seguimiento (la autorización en PDF ya está en la Etapa 8).
11. **Presupuestos**: módulo de listado/seguimiento (el PDF ya se genera desde Documentos).

## 🟢 Prioridad baja (escala y nice-to-have)

13. **MercadoLibre API** (Etapa 10) — ver DECISIONES_TECNICAS DT-010/preparado.
14. **Página pública de stock** `/p/[slug]` (el middleware ya la deja pública).
15. **Gráficos en reportes** (Etapa 11 quedó con tablas/KPIs; faltan series temporales: ventas por mes, leads por origen, tasa de cierre).
16. **Permisos finos** vía `profile.permisos` (DT-004).
18. **Importar** stock y clientes desde CSV/Excel (la **exportación** ya está en la Etapa 11).
19. **Gestión de usuarios** real: invitación por email + alta de profile (hoy solo lectura del equipo).
20. **Configuración de empresa**: form de edición (logo, colores, `vtv_calendario`).

## Notas técnicas pendientes

- ~~Mover chequeos de permisos críticos (borrado, cambio de precio) también a **RLS**~~ → hecho en Etapa 12 (migración `15_hardening_roles`).
- Crear buckets de Storage (`vehiculos`, `documentos`) con policies por empresa.
- Definir jobs programados (Supabase cron / edge functions) para: VTV, créditos, reservas, postventa.
