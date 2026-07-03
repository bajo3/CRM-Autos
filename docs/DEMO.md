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

- [ ] **Fotos de stock:** de los vehículos actuales, solo el Ford Ranger tiene fotos reales cargadas (8). El resto (Chevrolet Onix, Renault Sandero, Honda HR-V, Chevrolet S10, Renault Kangoo, Fiat Cronos, Volkswagen Gol Trend, Toyota Corolla, Peugeot 208) **no tiene fotos**. Sacar/cargar al menos 1 foto real por unidad antes de mostrar la vitrina pública o generar un catálogo — sin fotos, la vitrina y el catálogo se ven incompletos. Esto no se puede resolver por código: hacen falta fotos reales de autos reales.
- [ ] **Clientes de prueba:** revisar si "Tomas" (sin apellido ni teléfono) y "Matias Marino" (sin teléfono) en la lista de Clientes son datos de prueba de sesiones anteriores o leads reales cargados a mano — si son de prueba, borrarlos antes de la demo. No se borraron automáticamente por las dudas (podían ser datos reales).
- [ ] Confirmar que el usuario demo (`dueno@jesusdiaz.com` / `demo1234`) sigue funcionando y no quedó bloqueado.
- [ ] Correr `npm run build && npm run start` (no `npm run dev`) para la demo — es sensiblemente más rápido (ver medición en `docs/MVP_VENDIBLE_PLAN.md`, fase 1).

## QA manual pendiente (bloqueado para automatización en este entorno)

Estos 4 flujos usan formularios `useFormState` que no se pueden completar con las herramientas de automatización disponibles (ver nota en `docs/MVP_VENDIBLE_PLAN.md`, fase 1). El código está completo, tipado, linteado y buildeado en verde — falta la prueba manual de alta desde un navegador normal:

- [ ] **Presupuestos**: crear uno desde cero (no solo desde una ficha de cliente), generar el PDF, verificar que se pueda marcar como aceptado/rechazado.
- [ ] **Test Drive**: agendar una prueba de manejo, generar la autorización en PDF, marcarla como realizada.
- [ ] **Permutas**: registrar una permuta nueva desde cero, tasarla, aceptarla, e ingresarla a stock — confirmar que el auto nuevo aparece en Stock con el aviso "viene de una permuta".
- [ ] **Catálogo**: de punta a punta como lo haría el dueño — elegir unidades, generar el PDF, abrirlo, compartirlo por WhatsApp.
