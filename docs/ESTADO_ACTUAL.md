# Estado actual

_Última actualización: 2026-06-15 (Etapas 4–11 cerradas + Etapa 12 en curso · deploy en Vercel)_

## Resumen

Proyecto greenfield con base sólida y **operación comercial diaria funcional**. Stack montado, base de datos completa con aislamiento multitenant, autenticación real, dashboard con métricas en vivo, jobs automáticos programados y los módulos comerciales con CRUD operativo.

| Indicador | Estado |
|-----------|--------|
| `npm run build` | ✅ OK |
| `npm run lint` | ✅ Sin warnings |
| `npm run typecheck` | ✅ 0 errores |
| Tablas en Supabase | 31 (todas con RLS por empresa) |
| Storage | buckets `vehiculos`, `documentos` (privado), `catalogos` (público) con policies por empresa |
| Deploy | **Vercel** · producción en https://crm-autos-tan.vercel.app |
| MercadoLibre | OAuth + webhook + acciones de publicación (API real) |
| Jobs | `crm_run_daily_jobs()` vía pg_cron (diario 09:00) |
| Datos demo | ✅ Jesús Díaz Automotores + 4 usuarios + 5 autos + 5 clientes |

## Qué funciona end-to-end

- **Login real** + middleware de protección + RBAC por rol.
- **Dashboard** con conteos y alertas reales.
- **Stock**: lista con filtros, ficha completa, **alta/edición/baja**, **fotos** (Storage), **gastos**, estado documental, y **encargos compatibles** (matching).
- **Clientes**: lista, **alta/edición**, **ficha con historial** (seguimientos, consultas, ventas, reservas), WhatsApp.
- **Seguimientos**: agendar desde la ficha del cliente, marcar realizado/cancelar.
- **Clientes**: ficha con **historial de contacto cronológico unificado** + registrar contacto rápido.
- **Encargos**: alta + matching automático contra el stock.
- **Ventas**: alta que genera crédito (cuotas), postventa (efectivo, +6m) y marca el auto vendido; **ficha con checklist de entrega editable** y **recibo de seña/venta imprimible** (`/recibo/venta/[id]`).
- **Reservas**: alta que marca el auto reservado.
- **VTV**: **alta desde la ficha del vehículo** con cálculo automático de vencimiento por patente + calendario de la empresa, y **alertas 30/7 días diferenciadas**.
- **Documentos PDF** (motor pdf-lib, **10 tipos**): recibos de seña/pago, boleto, presupuesto, datero, fichas de cliente/vehículo y autorizaciones (test drive / entrega / retiro de doc.), con numeración interna, logo/datos de empresa y Storage privado. Generación contextual desde las fichas de venta, cliente y vehículo, y desde `/documentos`.
- **Catálogos** (`/catalogos`): armado de catálogo de stock filtrable + PDF con fotos/precio (bucket público) + **compartir por WhatsApp** + historial.
- **Publicaciones** (`/publicaciones`): estado por canal (web / MercadoLibre / redes) por unidad; **conexión OAuth con MercadoLibre** (conectar/desconectar/sincronizar), publicar/pausar/finalizar contra la API real (errores de ML visibles para iterar).
- **Página pública de stock** (`/p/[slug]`, sin login): vidriera de la agencia con las unidades publicadas en web, fotos, precio y WhatsApp.
- **Webhook de MercadoLibre** (`/api/mercadolibre/notifications`): recibe y registra los avisos de ML.
- **Reportes** (`/reportes`): KPIs por período (ventas, facturación, ticket, inventario), ranking de vendedores, forma de pago, stock por estado y rentabilidad (con permiso). Exportación CSV de ventas/stock/clientes.
- **Comisiones** (`/comisiones`): cálculo por venta (fija o %), estado de pago y totales por vendedor.
- **Auditoría**: historial de cambios poblado (precio, estado, baja, venta) visible en la ficha del vehículo.
- **Seguridad reforzada**: borrado de vehículo/cliente/venta y cambio de precio chequeados también en la base (RLS + trigger), no solo en la app.
- **Errores y 404**: páginas propias de error, 404 y carga.
- **Jobs automáticos**: VTV, créditos (alerta anteúltima cuota), reservas y seguimientos vencidos.
- **Multitenant**: RLS en las 29 tablas + Storage (`vehiculos`, `documentos` privado, `catalogos` público).

## Qué queda como estructura (modelo + tabla + placeholder)

Test Drive, Permutas, Tasaciones, Taller, Consignados, Garantías, Reclamos, Configuración. _(Presupuestos: se generan en PDF desde Documentos; falta el módulo de listado/seguimiento.)_

## Archivos clave nuevos (Fase 2)

- `src/components/forms/{vehiculo,cliente,encargo,venta,reserva}-form.tsx` — formularios reutilizables.
- `src/components/stock/{fotos-manager,delete-auto-button,estado-documental-select}.tsx`.
- `src/lib/data/{options,matching}.ts` — opciones de selects y matching de encargos.
- `src/app/(app)/*/actions.ts` — server actions por módulo.
- `supabase/migrations/08_storage_vehiculos.sql`, `09_jobs.sql`.

Ver [PENDIENTES.md](PENDIENTES.md) para lo que falta.
