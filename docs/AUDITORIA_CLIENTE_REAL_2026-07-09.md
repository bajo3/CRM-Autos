# Auditoría como cliente real — CRM Autos

**Fecha:** 9 de julio de 2026

**Entorno probado:** build de producción local (`next start`), empresa demo “Jesús Díaz Automotores”, usuario dueño/admin, escritorio y viewport móvil 375×812.
**Objetivo:** determinar si el producto ya es un MVP real que ayuda a vender y organizar una agencia, no solamente si las pantallas abren.

## Veredicto ejecutivo

**Puntaje: 5,2/10.**

**Estado real: beta interna funcional; todavía no es un MVP vendible.**

El CRM tiene una base valiosa: navegación rápida, ficha 360° del cliente, stock con fotos reales, presupuestos/PDF, vitrina pública atractiva, seguimiento, reservas, ventas, créditos, VTV, reportes y usuarios. La estructura general puede transformarse en un producto comercial.

Pero hoy no lo vendería ni lo mostraría sin una preparación controlada. Hay fallas que afectan directamente la confianza y el dinero:

- la vitrina pública muestra un teléfono ficticio;
- WhatsApp está desconectado y existe un mensaje programado vencido que sigue “Pendiente”;
- varios formularios usan fecha UTC y, después de las 21:00 de Argentina, proponen el día siguiente;
- cinco autos sin costo cargado muestran como “margen” el precio completo;
- “Publicado” y “Disponible” compiten como estados, generando conteos y catálogos distintos;
- el servidor quedó ejecutando un build viejo y Stock se rompió con un `ChunkLoadError`; “Reintentar” no lo recuperó;
- hay datos demo viejos o contradictorios que hacen parecer que la agencia no trabaja el CRM.

No son detalles cosméticos. Un dueño de agencia compra orden, control y más cierres. Si los números o las fechas no son confiables, el sistema pierde su razón de existir.

## Cómo se calculó el puntaje

| Área | Peso | Nota | Motivo |
|---|---:|---:|---|
| Operación principal | 25% | 7,0 | Los módulos centrales existen y la mayoría abre y se conecta razonablemente. |
| Confiabilidad de datos | 20% | 3,5 | Fechas UTC, márgenes ficticios, estados superpuestos y datos demo contradictorios. |
| Capacidad de generar/cerrar ventas | 20% | 4,5 | Buenas fichas y presupuestos, pero WhatsApp/contacto público no están operativos y hay fricción en el embudo. |
| Experiencia del comprador final | 15% | 5,0 | La vitrina se ve bien, pero el teléfono es ficticio y los mensajes no incluyen el link de la unidad. |
| UX y velocidad | 10% | 7,5 | Diseño consistente, móvil correcto y cargas visibles entre 269 y 1.096 ms tras reiniciar correctamente. |
| Operación técnica/deploy | 10% | 3,5 | Un build reemplazado sin reiniciar el servidor rompió una ruta crítica y el error no fue autorrecuperable. |
| **Total** | **100%** | **5,2** | **Útil como base; no confiable todavía para cobrar por él.** |

## Lo que sí funciona y aporta valor

### 1. Ficha del cliente como centro de la venta

La ficha de Diego Martínez concentra contacto, vendedor, presupuesto, próximo seguimiento, historial, documentos, presupuestos y ventas. Desde ahí se puede iniciar presupuesto, reserva, test drive, tasación, permuta o encargo. Este es el concepto correcto para una agencia.

### 2. Búsqueda global útil

La búsqueda de “Roberto” devolvió el cliente correcto en **685 ms** y permitió abrir su ficha sin recorrer menús.

### 3. Presupuesto entendible

El cálculo de precio, bonificación y anticipo funcionó: $29.000.000 − $1.000.000 − $10.000.000 mostró saldo a financiar de $18.000.000. La separación visual por vehículo/cliente, condiciones, financiación y extras es clara.

### 4. Vitrina pública visualmente convincente

La vitrina muestra 9 unidades, fotos reales, precio grande, filtros, detalle de cada unidad y CTA de WhatsApp. En 375×812 no tuvo overflow horizontal y conservó una buena jerarquía visual.

### 5. Organización modular completa

Existen clientes, seguimientos, presupuestos, ventas, reservas, stock, tasaciones, permutas, encargos, consignaciones, taller, postventa, créditos, test drive, documentos, publicaciones, VTV, reportes, comisiones y usuarios. Los empty states explican bien para qué sirve cada módulo.

### 6. Autenticación básica correcta

El logout funcionó y el acceso directo a `/clientes` sin sesión redirigió a `/login`.

## Fallas críticas — P0

Estas fallas bloquean una venta o un piloto pago.

### P0.1 — La vitrina manda consultas a un teléfono ficticio

**Evidencia observada:** `/p/jesus-diaz` muestra `+54 9 2494 000000` y `contacto@jesusdiaz.com`. Todos los CTA apuntan a `wa.me/5492494000000`.

**Impacto:** cada consulta real se pierde. La parte más comercial del CRM no convierte.

**Mejora obligatoria:**

- cargar y validar contacto real antes de permitir publicar la vitrina;
- mostrar un banner bloqueante en Configuración mientras falten datos públicos válidos;
- agregar una prueba automática que confirme que ningún teléfono termina en una secuencia placeholder;
- no usar la misma empresa demo en una reunión hasta reemplazar teléfono, email, CUIT, dirección y datos estimados.

### P0.2 — WhatsApp aparece como producto, pero está desconectado

**Evidencia observada:** `/whatsapp/configuracion` informa “Sin conectar”. La alternativa visible es “Conexión beta por QR (no oficial)” con advertencia explícita de riesgo de bloqueo. Aun así, Bandeja y Programados aparecen en la navegación como módulos normales.

Existe un mensaje de Felipe programado para **08/07/2026 22:51** que, el 09/07, sigue en estado **Pendiente**. La bandeja no advierte de forma visible que no se puede enviar.

**Impacto:** el vendedor cree que el seguimiento salió cuando no salió. Es una fuga directa de oportunidades.

**Mejora obligatoria:**

- si la cuenta está desconectada, bloquear nuevos programados y mostrar alerta roja persistente en Bandeja/Programados;
- marcar como fallados los envíos vencidos que no fueron procesados, con motivo y botón de reintento;
- monitorear el cron/worker con “última ejecución”, “próxima ejecución” y cantidad de fallos;
- para un MVP comercial, conectar la API oficial o esconder todo el módulo detrás de una beta claramente separada. No vender Baileys como canal productivo.

### P0.3 — Fechas incorrectas por usar UTC como fecha local

**Evidencia observada:** el dashboard indicaba 09/07/2026, pero “Nueva venta” proponía **10/07/2026**. La prueba se hizo por la noche en Argentina, cuando UTC ya había cambiado de día.

**Código afectado encontrado:** usos de `new Date().toISOString().slice(0, 10)` en dashboard, acciones comerciales, venta, reserva, test drive, taller, seguimientos, pagos, WhatsApp programado, presupuestos, comisiones, catálogos y otras rutas. Ejemplos:

- `src/components/forms/venta-form.tsx:18`
- `src/components/forms/reserva-form.tsx:18`
- `src/components/forms/test-drive-form.tsx:19`
- `src/components/seguimientos/nuevo-seguimiento-form.tsx:132`
- `src/components/whatsapp/programados-admin.tsx:94`
- `src/lib/data/dashboard.ts:10`

**Impacto:** ventas, reservas, seguimientos, cuotas y mensajes pueden guardarse un día corridos. Esto rompe agenda, reportes y trazabilidad.

**Mejora obligatoria:** crear un único helper de fecha de negocio en `America/Argentina/Buenos_Aires` y reemplazar todos los `toISOString().slice(0, 10)` usados como fecha local. Agregar tests alrededor de las 20:59/21:00/23:59 de Argentina.

### P0.4 — Márgenes falsos cuando falta costo

**Evidencia observada:** Toyota SW4, BYD Atto 2, Jeep Renegade, Mercedes-Benz CLA 200 y Nissan Frontier no tienen costo/toma. En Stock y en la ficha, el CRM muestra el precio completo como margen. La SW4 muestra:

- precio: $29.000.000;
- costo: “—”;
- margen bruto: $29.000.000;
- margen neto: $29.000.000.

**Impacto:** el dueño puede creer que tiene rentabilidad que no existe. Reportes y decisiones de compra quedan contaminados.

**Mejora obligatoria:** si no hay costo, mostrar **“Margen no calculable — falta costo”**, nunca asumir costo cero. Para unidades propias, exigir costo/toma antes de habilitar reportes de rentabilidad o venta final. Distinguir inventario a precio de venta de capital inmovilizado a costo.

### P0.5 — Estado comercial y publicación están mezclados

**Evidencia observada:** hay 9 autos vendibles en la vitrina, pero el dashboard informa 5 “Disponibles”. El reporte dice “9 disponibles” y luego separa 5 “Disponible” + 4 “Publicado”. El nuevo catálogo PDF filtra por defecto “Disponible” y selecciona solo 5, dejando afuera las 4 unidades con estado “Publicado”.

**Impacto:** inventario, dashboard, reportes y catálogos no responden igual a la pregunta “¿qué puedo vender hoy?”. Un vendedor puede mandar un catálogo incompleto.

**Mejora obligatoria:** separar dos dimensiones:

- **estado operativo:** disponible, reservado, en negociación, vendido, preparación, consignado;
- **estado de publicación por canal:** web, MercadoLibre, redes, pausado/borrador/publicado.

“Publicado” no debe ser un estado del vehículo. Todos los conteos deben usar una función única de “vendible”.

### P0.6 — El proceso de build/arranque rompió Stock

**Evidencia observada:** al abrir `/stock` apareció “Algo salió mal” y consola con `ChunkLoadError` para `page-bd07a33b0b3ede6b.js`. El archivo disponible en `.next` tenía otro hash. El botón “Reintentar” volvió a fallar. Solo reiniciar `next start` recuperó la pantalla.

**Causa:** se reemplazó `.next` con un build nuevo mientras seguía vivo un servidor iniciado con el manifest anterior.

**Impacto:** una demo o producción puede romper rutas después de actualizar. El mecanismo de recuperación visible no sirve para este caso.

**Mejora obligatoria:** build y servidor deben publicarse de forma atómica. En local/demo: script único que detenga, construya, arranque y haga smoke test. En hosting: deployment inmutable. Para `ChunkLoadError`, el error boundary debe ofrecer **“Recargar aplicación”** con `window.location.reload()`, no solo `reset()` del segmento.

## Fallas importantes — P1

### P1.1 — Se puede crear un lead imposible de contactar

El alta solo exige nombre. Teléfono, WhatsApp y email son opcionales. La base ya muestra clientes “Felipe” sin apellido y con presupuesto $0.

**Mejora:** exigir al menos un canal válido (`teléfono || WhatsApp || email`), validar teléfono argentino y detectar duplicados antes de guardar.

### P1.2 — “Presupuestar” desde un auto no trae el precio

La ruta llega con el vehículo seleccionado, pero Precio queda vacío. El vendedor debe volver a recordar o copiar $29.000.000 desde otra pantalla.

**Mejora:** precargar precio de lista del vehículo, fecha de validez y vendedor; advertir si el valor se modifica. Si no hay cliente, ofrecer alta rápida inline en vez de crear una cotización huérfana.

### P1.3 — Datos demo viejos y contradictorios

Ejemplos observados:

- el dashboard tiene seguimientos y una reserva vencidos desde el 11–14 de junio;
- el cliente Diego fue dado de alta el 13/06/2026, pero su historial contiene una venta del 17/08/2025;
- la ficha de la Toyota SW4 dice “Venta registrada” el 05/07/2026, pero la unidad sigue Disponible, en la vitrina y con acciones “Reservar/Vender”;
- hay dos autorizaciones de test drive para Diego en la misma fecha;
- la permuta de Sofía figura Aceptada y todavía ofrece “Ingresar a stock”, aunque la documentación histórica afirma que ese flujo ya se completó;
- comisiones y ventas muestran “Vehículo —” en operaciones existentes.

**Impacto:** la demo parece abandonada y los datos pierden credibilidad.

**Mejora:** crear un reset/seed reproducible de demo con fechas relativas a “hoy”, relaciones consistentes y un guion que cierre todos los pendientes. Nunca mantener la demo a mano.

### P1.4 — Textos internos y funciones incompletas visibles al cliente

Se encontraron textos impropios de producción:

- Dashboard: “¿Falta un módulo? ... roadmap en `/docs/ROADMAP.md`”.
- Ficha de stock: “se modela en `documento_vehiculo`; la carga detallada queda para una próxima iteración”.
- Configuración: “La subida de archivo queda pendiente”.
- Plantillas de WhatsApp: “La sincronización con Meta queda pendiente para producción”.

**Mejora:** eliminar referencias a código/roadmap. Si una función no está terminada, ocultarla o reemplazarla por una explicación útil que no prometa algo inexistente.

### P1.5 — WhatsApp de la vitrina no incluye el link de la unidad

El mensaje contiene marca, año y precio, pero no la URL pública ni una foto. El asesor recibe contexto, pero el comprador no puede reenviar o volver fácilmente a la publicación.

**Mejora:** incluir URL absoluta de la ficha pública, versión, precio y `utm_source=whatsapp`; registrar el clic como evento comercial.

### P1.6 — Falta una vista de embudo y de rendimiento accionable

Hay reportes de ventas, margen y ranking, pero no se ve conversión completa: lead → contactado → visita/test drive → presupuesto → reserva → venta, con motivos de pérdida y tiempo por etapa.

**Mejora:** tablero semanal por vendedor con tasa de contacto, presupuestos enviados/aceptados, días sin actividad, motivos de pérdida y próximos pasos. Esto sí ayuda a vender; contar módulos no.

### P1.7 — Demasiados módulos visibles para un primer uso

El menú expone 28 destinos. Para una agencia chica, WhatsApp, tasaciones, permutas, encargos, consignados, taller, postventa, créditos, documentos, publicaciones, VTV, comisiones y usuarios compiten por atención.

**Mejora:** onboarding por rol y menú progresivo. Para vendedor: Hoy, Clientes, Stock, Presupuestos y WhatsApp. Para dueño: sumar Reportes/Equipo. Herramientas poco usadas en “Más”.

## Mejoras de segunda prioridad — P2

- El origen del lead nuevo arranca en “Otro”; debería recordar el último canal o inferirlo desde el punto de entrada.
- El login muestra usuario y contraseña demo. Es válido solo en entorno demo; debe desaparecer automáticamente en producción.
- La vitrina podría sumar financiación orientativa, ubicación/mapa, garantía, reserva de visita y ficha técnica más completa.
- Los botones de acción del dashboard son casi solo iconos; en móvil funcionan, pero requieren aprendizaje. Mantener `aria-label` y sumar tooltip/texto en escritorio.
- Catálogos generados acumulan muchas versiones antiguas; agregar archivado, nombre del creador y estado “vigente”.
- “Valor de inventario” debe decir si usa precio de venta o costo. Hoy muestra $253.600.000 sin aclaración suficiente.
- VTV tiene solo una unidad cargada de nueve. Para una promesa de control documental, la cobertura es baja.
- Cinco unidades publicadas no tienen patente, chasis, motor, costo ni VTV. Definir un porcentaje mínimo de ficha completa antes de publicar.

## Rendimiento observado

Después de reiniciar el servidor con el build correcto, tiempo hasta ver el título principal:

| Ruta | Tiempo visible |
|---|---:|
| Dashboard | 479 ms |
| Clientes | 458 ms |
| Stock | 1.096 ms |
| Catálogos | 848 ms |
| Usuarios | 269 ms |
| WhatsApp | 770 ms |

La velocidad ya no es el problema principal. Stock puede mejorar, pero la prioridad es confiabilidad de datos y funcionamiento de los canales de venta.

## Qué debe ocurrir antes de cobrar por el MVP

### Gate 1 — Integridad y conversión (bloqueante)

- [ ] Teléfono/email reales en vitrina y PDF.
- [ ] Fechas locales corregidas y testeadas.
- [ ] Margen desconocido cuando falta costo; completar costos del stock demo.
- [ ] Estado operativo separado de publicación; dashboard, reportes y catálogos dan el mismo total vendible.
- [ ] WhatsApp oficial conectado y cron monitoreado, o módulo oculto del producto comercial.
- [ ] Build/deploy atómico con smoke test de Dashboard, Clientes, Stock y Vitrina.

### Gate 2 — Embudo comercial usable

- [ ] Lead exige un canal de contacto y evita duplicados.
- [ ] Presupuesto desde stock trae precio y permite alta rápida del cliente.
- [ ] Datos demo reseteables, recientes y consistentes.
- [ ] Textos internos/incompletos eliminados.
- [ ] CTA de WhatsApp incluye link público y tracking.

### Gate 3 — Piloto real

- [ ] Probar dueño, vendedor y solo lectura por separado.
- [ ] Cargar al menos 20 leads reales y trabajar 5 días hábiles completos.
- [ ] Confirmar que ningún seguimiento, mensaje programado o reserva vence sin alerta visible.
- [ ] Comparar: leads contactados, presupuestos, visitas/test drives, reservas y ventas.
- [ ] Registrar qué parte del trabajo sigue haciéndose fuera del CRM. Eso define el siguiente desarrollo.

## Orden recomendado de trabajo

1. **Fechas, márgenes y estado del stock.** Son la verdad del sistema.
2. **Contacto público y WhatsApp.** Son el canal que convierte.
3. **Deploy seguro y recuperación de chunks.** Sin estabilidad no hay demo ni operación.
4. **Limpieza/seed de demo y eliminación de textos internos.** Recupera confianza comercial.
5. **Alta rápida + presupuesto precargado + validación de contacto.** Reduce fricción del vendedor.
6. **Embudo semanal y piloto real.** Demuestra si el CRM realmente genera organización y ventas.

## Matriz de prueba resumida

| Área | Resultado |
|---|---|
| Login/logout y protección de rutas | Aprobado |
| Dashboard | Funcional, pero datos vencidos, conteo ambiguo y texto interno |
| Búsqueda global | Aprobado, 685 ms |
| Clientes/ficha 360° | Buena base; datos inconsistentes y alta demasiado permisiva |
| Seguimientos | Funcional; agenda demo muy vencida |
| Presupuestos | Cálculo aprobado; falta precarga de precio/cliente |
| Ventas | Formulario conectado; fecha por defecto incorrecta en horario nocturno |
| Reservas | Funcional; demo conserva reserva vencida |
| Stock | Funcional tras reinicio; margen y estados no confiables |
| Tasaciones/consignados/taller | Empty states correctos; sin datos para validar operación real |
| Permutas/encargos | Flujos visibles y matching; datos demo no cerrados |
| Postventa/créditos/test drive | Funcionales a nivel lectura; fechas y datos demo requieren revisión |
| Catálogos/PDF | Buena propuesta; filtro default deja 4 autos afuera |
| Publicaciones | Web operativa; MercadoLibre no conectado |
| VTV | Funciona, cobertura 1/9 |
| Reportes/comisiones | Existen, pero dependen de costos/relaciones incompletos |
| Usuarios/roles | Gestión visible como dueño; otros roles no probados en esta auditoría |
| WhatsApp | No apto para producción: desconectado + programado vencido pendiente |
| Vitrina escritorio/móvil | Visualmente aprobada; conversión bloqueada por contacto ficticio |

## Alcance y límites de esta auditoría

- Se probaron 24 módulos/rutas, ficha de cliente, ficha de vehículo, alta de lead, presupuesto, nueva venta, vitrina pública, detalle público, búsqueda, logout y acceso sin sesión.
- Se verificó escritorio y móvil 375×812.
- No se enviaron WhatsApp reales, no se invitó usuarios, no se eliminaron registros y no se registró una venta irreversible.
- Solo se probó el rol dueño/admin; RBAC vendedor/administrativo/solo lectura necesita una sesión específica por rol antes del piloto.
- Los PDFs existentes fueron inspeccionados desde la UI, pero no se generó una operación comercial nueva durante esta auditoría.

## Conclusión final

Hay producto, pero todavía no hay producto vendible. La estética y la cantidad de módulos están por delante de la confiabilidad operativa. La próxima inversión no debería ser agregar funciones: debería hacer que fechas, stock, márgenes, WhatsApp y datos públicos sean imposibles de usar mal.

Cuando los seis P0 estén cerrados y un piloto de cinco días no pierda seguimientos ni mensajes, recién ahí volvería a puntuarlo. El objetivo razonable no es “llegar a 10”; es alcanzar **7,5/10 con verdad operativa**, porque eso ya puede sostener una venta y una implementación real.
