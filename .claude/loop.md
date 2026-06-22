# Loop CRM Autos

Objetivo: terminar el MVP vendible del CRM de autos.

Estado actual:
- Next.js 14 App Router + Supabase/Postgres + Supabase Auth.
- Typecheck, lint y build pasan.
- Stock, clientes, ventas, documentos, catálogos y dashboard están avanzados.
- Faltan cerrar onboarding real, configuración de empresa, gestión de usuarios, pagos de créditos y algunos placeholders.

Prioridad:
1. Configuración de empresa.
2. Gestión de usuarios/equipo.
3. Registro de pagos de créditos.
4. MercadoLibre webhook/validaciones.
5. Presupuestos.
6. Test drive.
7. Mejoras de diseño y reportes.

Reglas:
- No tocar secretos.
- No hacer deploy.
- No pushear sin permiso.
- No borrar código importante.
- Mantener multiempresa/RLS.
- Hacer cambios chicos.
- Ejecutar typecheck, lint y build después de cambios importantes.