/**
 * Permisos por rol (RBAC básico).
 *
 * Etapa actual: permisos a nivel de rol, evaluados en la capa de aplicación.
 * Escalado a futuro: la columna `profile.permisos` (jsonb) permite overrides
 * finos por usuario sin migración de schema. Ver /docs/DECISIONES_TECNICAS.md.
 */

export type Rol =
  | "dueno"
  | "encargado"
  | "vendedor"
  | "administrativo"
  | "gestoria"
  | "solo_lectura";

export type Permiso =
  | "stock.ver"
  | "stock.crear"
  | "stock.editar"
  | "stock.eliminar"
  | "clientes.ver"
  | "clientes.ver_todos"
  | "ventas.crear"
  | "costos.ver"
  | "margenes.ver"
  | "precios.cambiar"
  | "documentos.generar"
  | "catalogo.generar"
  | "whatsapp.enviar"
  | "whatsapp.ver"
  | "whatsapp.conectar"
  | "whatsapp.bot"
  | "whatsapp.plantillas"
  | "whatsapp.programados"
  | "mercadolibre.publicar"
  | "reportes.ver"
  | "creditos.cobrar"
  | "usuarios.crear"
  | "empresa.configurar";

const TODOS: Permiso[] = [
  "stock.ver", "stock.crear", "stock.editar", "stock.eliminar",
  "clientes.ver", "clientes.ver_todos", "ventas.crear", "costos.ver",
  "margenes.ver", "precios.cambiar", "documentos.generar", "catalogo.generar",
  "whatsapp.enviar", "whatsapp.ver", "whatsapp.conectar", "whatsapp.bot",
  "whatsapp.plantillas", "whatsapp.programados",
  "mercadolibre.publicar", "reportes.ver",
  "creditos.cobrar", "usuarios.crear", "empresa.configurar",
];

const MATRIZ: Record<Rol, Permiso[]> = {
  dueno: TODOS,
  encargado: [
    "stock.ver", "stock.crear", "stock.editar", "stock.eliminar",
    "clientes.ver", "clientes.ver_todos", "ventas.crear", "costos.ver",
    "margenes.ver", "precios.cambiar", "documentos.generar", "catalogo.generar",
    "whatsapp.enviar", "whatsapp.ver", "whatsapp.conectar", "whatsapp.bot",
    "whatsapp.plantillas", "whatsapp.programados",
    "mercadolibre.publicar", "reportes.ver",
    "creditos.cobrar", "usuarios.crear",
  ],
  vendedor: [
    "stock.ver", "stock.crear", "stock.editar",
    "clientes.ver", "ventas.crear",
    "documentos.generar", "catalogo.generar",
    "whatsapp.enviar", "whatsapp.ver", "whatsapp.programados",
  ],
  administrativo: [
    "stock.ver", "clientes.ver", "clientes.ver_todos",
    "documentos.generar", "catalogo.generar", "whatsapp.enviar", "whatsapp.ver",
    "reportes.ver",
    "creditos.cobrar",
  ],
  gestoria: ["stock.ver", "documentos.generar"],
  solo_lectura: ["stock.ver", "clientes.ver", "reportes.ver"],
};

export function can(rol: Rol | null | undefined, permiso: Permiso): boolean {
  if (!rol) return false;
  return MATRIZ[rol]?.includes(permiso) ?? false;
}

export const ROLES: { value: Rol; label: string }[] = [
  { value: "dueno", label: "Dueño / Admin" },
  { value: "encargado", label: "Encargado" },
  { value: "vendedor", label: "Vendedor" },
  { value: "administrativo", label: "Administrativo" },
  { value: "gestoria", label: "Gestoría" },
  { value: "solo_lectura", label: "Solo lectura" },
];
