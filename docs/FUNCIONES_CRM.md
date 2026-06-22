# Funciones del CRM

Catálogo funcional. Estado: ✅ funcional · 🟡 parcial · ⬜ estructura/modelo listo, UI pendiente.

## Núcleo

| # | Función | Estado | Notas |
|---|---------|--------|-------|
| — | Multiempresa / multitenant | ✅ | RLS por `empresa_id` en todas las tablas |
| — | Multiusuarios + roles | ✅ | 6 roles; gestión de equipo en modo lectura |
| — | Permisos por rol | ✅ | `can()` en UI; finos vía `permisos` jsonb (pendiente) |
| 1 | Dashboard | ✅ | Leads, seguimientos hoy/vencidos, VTV, créditos, postventa, stock, reservas |

## Comercial

| # | Función | Estado | Notas |
|---|---------|--------|-------|
| 2 | Clientes / Leads | ✅ | Lista, alta/edición, ficha con historial, WhatsApp |
| 3 | Seguimiento comercial | ✅ | Agenda desde ficha, marcar realizado/cancelar, job de vencidos |
| 5 | Relación cliente-auto | ✅ | Alta de consulta desde la ficha; interesados en ficha de auto |
| 6 | Encargo de autos | ✅ | Alta + **matching automático** con el stock |
| 14 | Presupuestos | ⬜ | Modelo listo; falta form + PDF |

## Stock

| # | Función | Estado | Notas |
|---|---------|--------|-------|
| 4 | Stock real de autos | ✅ | Lista + ficha + alta/edición/baja + fotos (Storage) |
| 11 | Documentación del vehículo | ⬜ | Tabla `documento_vehiculo`; falta UI |
| 19 | Permutas / toma de usados | ⬜ | Tabla `permuta` |
| 20 | Tasador interno | ⬜ | Tabla `tasacion` |
| 21 | Rentabilidad por unidad | ✅ | Margen bruto/neto en ficha, con permiso |
| 22 | Gastos por auto | 🟡 | Visibles en ficha; falta alta desde UI |
| 24 | Checklists ingreso/entrega | ⬜ | jsonb en `vehiculo`/`venta`; falta UI |
| 28 | Taller / preparación | ⬜ | Tabla `taller_trabajo` |
| 26 | Consignados | ⬜ | Tabla `consignacion` |

## Operaciones

| # | Función | Estado | Notas |
|---|---------|--------|-------|
| 7 | Ventas | 🟡 | Lista. Falta alta completa |
| 8 | Créditos y cuotas | 🟡 | Lista + flag de alerta anteúltima cuota. Falta job |
| 9 | Postventa (6 meses efectivo) | 🟡 | Lista + alerta. Falta generación automática |
| 23 | Reservas / señas | 🟡 | Lista. Falta alta con recibo + job de vencimiento |
| 25 | Comisiones por vendedor | ⬜ | Tabla `comision` |

## Documentación y alertas

| # | Función | Estado | Notas |
|---|---------|--------|-------|
| 10 | VTV por patente | 🟡 | Lista + mes sugerido por dígito. Falta cálculo y alertas 60/30/7 |
| 12 | Documentación comercial (PDF) | ⬜ | Tabla `documento_comercial`; motor PDF pendiente |
| 13 | Test drive | ⬜ | Tabla `test_drive` |
| 27 | Garantías y reclamos | ⬜ | Tablas `garantia`, `reclamo` |
| 30 | Historial de cambios | ⬜ | Tabla `historial_cambio`; falta poblarla |

## Difusión y publicación

| # | Función | Estado | Notas |
|---|---------|--------|-------|
| 15 | Catálogo PDF de stock | ⬜ | Tabla `catalogo_pdf` |
| 16 | WhatsApp | 🟡 | Enlaces `wa.me` desde clientes e interesados. Falta plantillas/API |
| 17 | MercadoLibre | ⬜ | Campos + tabla `publicacion`; falta API |
| 18 | Web propia / stock online | ⬜ | Flags en `vehiculo` + ruta pública `/p/` reservada |

## Datos

| # | Función | Estado | Notas |
|---|---------|--------|-------|
| 29 | Importar / exportar | ⬜ | Pendiente (CSV/Excel) |
| 31 | Reportes | ⬜ | Pendiente (Etapa 11) |
