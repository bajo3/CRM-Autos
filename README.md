# CRM Automotor

CRM SaaS **multiempresa** pensado específicamente para **agencias automotoras argentinas**. No es un CRM genérico: está diseñado alrededor del flujo real de una agencia de autos — stock con titularidad y rentabilidad, clientes y leads, encargos, ventas con crédito y permuta, VTV por patente, documentación, catálogos PDF, WhatsApp y postventa.

> Empresa demo cargada: **Jesús Díaz Automotores** (Tandil).

---

## ¿Qué es?

Una plataforma donde cada agencia (tenant) tiene su espacio aislado. Varias agencias conviven en la misma instalación, pero **ningún usuario puede ver datos de otra empresa** — el aislamiento está garantizado a nivel de base de datos con Row Level Security (RLS) de PostgreSQL.

## ¿Para quién está pensado?

- Dueños de agencias que quieren orden y trazabilidad.
- Vendedores que necesitan seguir leads y stock desde el celular.
- Administrativos y gestoría que manejan documentación y VTV.

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | **Next.js 14** (App Router) + React 18 |
| Lenguaje | **TypeScript** (strict) |
| Estilos | **Tailwind CSS** + componentes propios estilo shadcn/ui |
| Backend / DB | **Supabase** (PostgreSQL 17) |
| Auth | **Supabase Auth** (email/password) |
| Aislamiento multitenant | **RLS** por `empresa_id` |
| Storage (fotos/PDF) | Supabase Storage *(preparado, Etapa 3+)* |
| Iconos | lucide-react |
| Validación | zod + react-hook-form |

## Módulos principales

**Funcionales hoy:** Dashboard · Stock (lista + ficha + alta) · Clientes/Leads · Seguimientos · Encargos · Ventas · Reservas · Créditos · Postventa · VTV · Usuarios/Roles.

**Estructura + modelo creados (UI pendiente):** Presupuestos · Test Drive · Permutas · Tasaciones · Taller · Consignados · Publicaciones · Comisiones · Documentos PDF · Catálogos PDF · Garantías · Reclamos · Reportes · Configuración.

Detalle completo en [`docs/FUNCIONES_CRM.md`](docs/FUNCIONES_CRM.md).

---

## Cómo instalarlo

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# completá NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable / anon key |
| `NEXT_PUBLIC_APP_NAME` | Nombre visible de la app (opcional) |

> El proyecto Supabase **"CRM Autos"** ya está creado y con el schema + datos demo aplicados. Las migraciones viven en [`supabase/migrations/`](supabase/migrations/).

## Cómo correrlo localmente

```bash
npm run dev      # http://localhost:3000
```

Ingresá con el usuario demo:

```
Email:    dueno@jesusdiaz.com
Password: demo1234
```

Otros usuarios demo: `vendedor1@jesusdiaz.com`, `vendedor2@jesusdiaz.com`, `admin@jesusdiaz.com` (misma contraseña).

## Comandos útiles

```bash
npm run dev        # servidor de desarrollo
npm run build      # build de producción
npm run start      # servir el build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

---

## Estado del proyecto

**Etapas 1–6 funcionales (operación comercial diaria), con las 28 tablas + RLS + Storage + jobs automáticos.**

✅ Build sin errores · ✅ Lint limpio · ✅ Typecheck sin errores · ✅ Datos demo cargados

- [x] **Etapa 1** — Base, estructura, documentación, layout, navegación, dashboard.
- [x] **Etapa 2** — Multiempresa, usuarios, roles, RLS, permisos.
- [x] **Etapa 3** — Stock real: CRUD completo + fotos (Storage) + gastos + rentabilidad.
- [x] **Etapa 4** — Clientes: alta/edición, ficha con historial, agenda de seguimientos.
- [x] **Etapa 5** — Encargos: alta + matching automático contra el stock.
- [x] **Etapa 6** — Ventas y reservas (con crédito/cuotas, postventa a 6m, jobs vía pg_cron).
- [ ] Etapas 7–12 — ver [`docs/ETAPAS_DESARROLLO.md`](docs/ETAPAS_DESARROLLO.md).

### Próximas etapas

1. **Documentos PDF** (boleto, recibos, presupuesto, datero, fichas) con autocompletado.
2. **VTV**: alta desde la ficha + cálculo de vencimiento por patente/jurisdicción.
3. **Catálogo PDF** de stock + envío por WhatsApp.
4. Publicaciones (web propia + MercadoLibre) y reportes.

Memoria viva del proyecto en [`docs/`](docs/):
[ROADMAP](docs/ROADMAP.md) · [CHANGELOG](docs/CHANGELOG.md) · [ESTADO_ACTUAL](docs/ESTADO_ACTUAL.md) · [PENDIENTES](docs/PENDIENTES.md) · [MODELO_DATOS](docs/MODELO_DATOS.md) · [DECISIONES_TECNICAS](docs/DECISIONES_TECNICAS.md) · [ETAPAS_DESARROLLO](docs/ETAPAS_DESARROLLO.md) · [FUNCIONES_CRM](docs/FUNCIONES_CRM.md)
