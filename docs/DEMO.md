# Guion de demo — CRM Automotor

> Recorrido de ~10 minutos para mostrarle el sistema a un dueño de agencia. Pensado para la empresa demo
> "Jesús Díaz Automotores" (`dueno@jesusdiaz.com` / `demo1234`). Antes de una demo real, revisar la
> sección **"Antes de mostrarlo a un cliente"** al final de este documento.

## Recorrido (10 minutos)

### 1. Dashboard (1 min)
Entrar logueado. Mostrar:
- **"Centro de acción comercial"**: la lista de a quién hay que llamar HOY (seguimientos vencidos, reservas por vencer, créditos, encargos urgentes). Decir: *"Esto reemplaza la planilla de Excel o el cuaderno — el sistema le dice al vendedor a quién llamar sin que tenga que acordarse."*
- Los números de Stock/Comercial/Alertas abajo: de un vistazo, cuántos autos tiene, cuántos leads nuevos, si hay VTV vencidas.

### 2. Buscar un cliente (1 min)
Apretar **Ctrl+K** (o click en el buscador del topbar) y tipear un nombre (ej. "Diego"). Mostrar que aparece al toque, sin tener que navegar menús. Decir: *"Con el cliente al teléfono, el vendedor no busca en ningún lado — tipea el nombre y ya está en la ficha."*
Entrar a la ficha: mostrar datos de contacto, historial completo (seguimientos, consultas, ventas, reservas, tasaciones/permutas/encargos si tiene) en un solo lugar.

### 3. Presupuesto + PDF (2 min)
Desde la ficha del cliente, botón **"Presupuesto"**. Completar precio y condiciones, generar. Mostrar:
- El PDF con el color de marca de la agencia, numeración, membrete con CUIT/dirección.
- El botón para compartirlo por WhatsApp directo desde el sistema.
Decir: *"Antes esto era un Word manual — ahora sale con el logo y los datos de la empresa en dos clics, numerado, y se manda por WhatsApp sin bajar el archivo."*

### 4. Stock + VTV (2 min)
Ir a **Stock de autos**. Mostrar:
- La columna de VTV con el semáforo (vigente/por vencer/vencida) — decir que se carga sola al ingresar el auto.
- Entrar a la ficha de un auto: especificaciones, fotos, gastos, y si hay encargos de clientes que coinciden con esa unidad (matching automático).
- Mostrar el alta de un auto nuevo (**Nuevo auto**) y la pregunta "¿Tiene VTV vigente?" — decir que ahí mismo queda cargado el control, sin un paso aparte.

### 5. Vitrina pública (2 min)
Ir a **Catálogos** → copiar el link de "Catálogo web público" → abrirlo en una pestaña nueva (o directo `/p/<slug-de-la-empresa>`). Mostrar:
- Cómo se ve desde el celular del cliente: fotos, precio grande, filtros, botón de WhatsApp.
- Que se actualiza sola con el stock — no hay que subir nada a mano a una web aparte.

### 6. Catálogo PDF por WhatsApp (2 min)
Volver a **Catálogos**, generar un catálogo PDF con las unidades tildadas. Abrir el PDF generado:
- Portada de marca, fichas con foto y precio, página final con el link a la vitrina y los datos de contacto.
- Botón de WhatsApp al lado del catálogo generado, para mandarlo directo.
Decir: *"Esto es lo que hoy se arma a mano en Canva o Word — acá sale del stock real, actualizado, en un clic."*

### Cierre
*"Todo lo que vieron es un sistema — cada pantalla existe porque resuelve algo puntual de la operación diaria de una agencia: seguimiento comercial, stock, documentación, y la vidriera online. No es una planilla más, reemplaza varias planillas y WhatsApp sueltos."*

---

## Antes de mostrarlo a un cliente real (checklist)

- [x] **Fotos de stock — stock 100% real (2026-07-05):** se reemplazaron los 10 vehículos ficticios/demo (Onix, Sandero, HR-V, S10, Kangoo, Cronos, Gol Trend, Corolla, 208, Palio — sin fotos, sin ventas reales asociadas) por 5 unidades reales nuevas con fotos provistas por el dueño: BYD Atto 2 Boost 401km, Jeep Renegade Sport 1.8, Mercedes-Benz CLA 200 Urban, Nissan Frontier S 4x2 0km y Toyota SW4 SRV 3.0 4x4 (8 fotos c/u, bucket `vehiculos`, `publicado_web=true`). Sumado a Ford Ranger, Amarok, Polo Comfortline y Vento (ya cargados antes), el stock queda en **9 unidades, todas con fotos reales**, verificado en la ficha de cada vehículo y en la vitrina pública (`/p/jesus-diaz` → "9 unidades disponibles"). Año/km/precio de las 5 nuevas son estimaciones razonables (no vienen de una lista de precios real) — ajustar si el dueño da los datos exactos.
- [x] **Clientes de prueba:** "Tomas" (sin apellido ni teléfono, 0 actividad vinculada) y "Matias Marino" (sin teléfono, DNI con formato inválido, 0 actividad vinculada) eran leads huérfanos sin ningún seguimiento/presupuesto/venta/reserva/tasación/permuta/test drive asociado — se confirmó por SQL y se borraron.
- [x] Confirmado que el usuario demo (`dueno@jesusdiaz.com` / `demo1234`) sigue funcionando (usado durante toda la sesión de QA sin bloqueos).
- [ ] Correr `npm run build && npm run start` (no `npm run dev`) para la demo — es sensiblemente más rápido (ver medición en `docs/MVP_VENDIBLE_PLAN.md`, fase 1).

## QA manual — completado con formularios reales (2026-07-04)

Los 4 flujos se probaron de punta a punta desde el navegador, con datos de negocio reales (no solo SQL), clickeando los botones reales de cada formulario `useFormState`. La limitación de "no se puede automatizar" de la fase 1 era en realidad un error propio de selector (`document.querySelector('form')` apuntaba al primer `<form>` del DOM — el de "Salir" del topbar — no al formulario de la página); una vez identificado el botón correcto por texto, los 4 flujos funcionaron sin problemas:

- [x] **Presupuestos**: creado desde cero (Diego Martínez / Chevrolet S10, transferencia, $22.000.000), PDF generado, marcado como "Enviado".
- [x] **Test Drive**: agendado (Roberto Paz / Ford Ranger), autorización generada en PDF desde Documentos, marcado como "Realizado".
- [x] **Permutas**: registrada desde cero (Sofía Romero entrega un Fiat Palio 2014), tasada ($5.800.000, diferencia $700.000 calculada bien), aceptada e ingresada a stock — confirmado el aviso "🔄 Esta unidad vino de una permuta con Sofía Romero" en la ficha del vehículo nuevo.
- [x] **Catálogo**: generado con las 9 unidades disponibles, contenido verificado con `pdftotext` (7 páginas: portada + 5 de stock + cierre con link a la vitrina y contacto).

**Bug real encontrado y corregido durante esta verificación:** `formatDate`/`daysUntil` (`src/lib/format.ts`) y `estadoPorVencimiento` (`src/lib/data/vtv.ts`) parseaban fechas-only (columnas `date`, ej. `"2026-07-06"`) con `new Date(string)`, que JS interpreta como medianoche UTC — en husos horarios negativos (Argentina, UTC-3) esto corre la fecha mostrada un día hacia atrás (confirmado: un test drive agendado para el 6/7 se mostraba como 5/7). Esto afectaba a **toda fecha-only de la app**: validez de presupuestos, fecha de test drive, vencimientos de VTV, etc. Se agregó `parseDate()` (parsea fechas de 10 caracteres como medianoche local, timestamps completos igual que antes) y se usa ahora en ambos módulos.
