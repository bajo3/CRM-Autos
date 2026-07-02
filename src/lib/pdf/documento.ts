/**
 * Motor de documentos PDF (pdf-lib).
 *
 * Genera recibos (seña / pago), boleto de compraventa y presupuesto con los
 * datos de la empresa (encabezado + logo), cliente, vehículo y operación.
 * La numeración interna la asigna la base (trigger `asignar_numero_documento`).
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export type TipoDocumento =
  | "recibo_sena" | "recibo_pago" | "boleto" | "presupuesto"
  | "datero" | "ficha_cliente" | "ficha_vehiculo"
  | "autorizacion_test_drive" | "autorizacion_entrega" | "autorizacion_retiro_doc";

export type EmpresaDoc = {
  nombre: string;
  cuit?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  localidad?: string | null;
  provincia?: string | null;
};

export type DatosDocumento = {
  numero: string;
  fecha: string; // ISO yyyy-mm-dd
  cliente?: {
    nombre: string; dni_cuit?: string | null; localidad?: string | null; telefono?: string | null;
    email?: string | null; estado?: string | null; origen?: string | null;
    vendedor?: string | null; presupuesto?: number | null;
  } | null;
  vehiculo?: {
    marca: string; modelo: string; anio?: number | null; patente?: string | null;
    chasis?: string | null; motor?: string | null; color?: string | null; kilometros?: number | null;
    version?: string | null; precio?: number | null; estado?: string | null;
    combustible?: string | null; transmision?: string | null; ubicacion?: string | null; fecha_ingreso?: string | null;
  } | null;
  // Persona autorizada (test drive / entrega / retiro de documentación).
  autorizado?: { nombre: string; dni?: string | null; licencia?: string | null } | null;
  fecha_evento?: string | null; // ISO (p. ej. fecha de test drive)
  precio_total?: number | null;
  sena?: number | null;
  saldo?: number | null;
  forma_pago?: string | null;
  financiacion?: string | null;
  permuta?: string | null;
  validez?: string | null; // ISO
  observaciones?: string | null;
  // Desglose financiero del presupuesto.
  anticipo?: number | null;
  cantidad_cuotas?: number | null;
  valor_cuota?: number | null;
  bonificacion?: number | null;
  gastos?: number | null;
};

const TITULOS: Record<TipoDocumento, string> = {
  recibo_sena: "RECIBO DE SEÑA",
  recibo_pago: "RECIBO DE PAGO",
  boleto: "BOLETO DE COMPRAVENTA",
  presupuesto: "PRESUPUESTO",
  datero: "DATERO — DATOS DEL INTERESADO",
  ficha_cliente: "FICHA DE CLIENTE",
  ficha_vehiculo: "FICHA DE VEHÍCULO",
  autorizacion_test_drive: "AUTORIZACIÓN DE PRUEBA DE MANEJO",
  autorizacion_entrega: "AUTORIZACIÓN DE ENTREGA",
  autorizacion_retiro_doc: "AUTORIZACIÓN DE RETIRO DE DOCUMENTACIÓN",
};

const A4 = { w: 595.28, h: 841.89 };
const M = 50; // margen
const INK = rgb(0.1, 0.1, 0.12);
const GREY = rgb(0.42, 0.45, 0.5);
const RULE = rgb(0.8, 0.82, 0.85);

/** Quita caracteres fuera de WinAnsi para que pdf-lib no falle al dibujar. */
function safe(s: unknown): string {
  return String(s ?? "").replace(/[^\x00-\xFF]/g, "?");
}

function ars(n: number | null | undefined): string {
  if (n == null) return "—";
  return `$ ${new Intl.NumberFormat("es-AR").format(Math.round(n))}`;
}

function fechaAR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Detecta png/jpg por magic bytes para embeber el logo. */
async function embedLogo(pdf: PDFDocument, bytes: Uint8Array | null | undefined) {
  if (!bytes || bytes.length < 4) return null;
  try {
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await pdf.embedPng(bytes);
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return await pdf.embedJpg(bytes);
  } catch {
    return null;
  }
  return null;
}

export async function generarPdf(
  tipo: TipoDocumento,
  datos: DatosDocumento,
  empresa: EmpresaDoc,
  logoBytes?: Uint8Array | null,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4.w, A4.h]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedLogo(pdf, logoBytes);

  let y = A4.h - M;

  const text = (s: string, x: number, size: number, f: PDFFont = font, color = INK) =>
    page.drawText(safe(s), { x, y, size, font: f, color });
  const right = (s: string, xRight: number, size: number, f: PDFFont = font, color = INK) => {
    const str = safe(s);
    page.drawText(str, { x: xRight - f.widthOfTextAtSize(str, size), y, size, font: f, color });
  };
  const rule = () => {
    page.drawLine({ start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 1, color: RULE });
  };

  // ---------- Encabezado ----------
  if (logo) {
    const dims = logo.scale(40 / logo.height);
    page.drawImage(logo, { x: A4.w - M - dims.width, y: y - 30, width: dims.width, height: dims.height });
  }
  text(empresa.nombre, M, 16, bold);
  y -= 16;
  const dir = [empresa.direccion, empresa.localidad, empresa.provincia].filter(Boolean).join(", ");
  if (dir) { text(dir, M, 9, font, GREY); y -= 12; }
  const fiscal = [empresa.cuit ? `CUIT ${empresa.cuit}` : null, empresa.telefono ? `Tel ${empresa.telefono}` : null, empresa.email]
    .filter(Boolean).join("  ·  ");
  if (fiscal) { text(fiscal, M, 9, font, GREY); y -= 12; }

  y -= 8;
  rule();
  y -= 26;

  // ---------- Título + numeración ----------
  text(TITULOS[tipo], M, 15, bold);
  right(`N.º ${datos.numero}`, A4.w - M, 11, bold);
  y -= 14;
  right(`Fecha: ${fechaAR(datos.fecha)}`, A4.w - M, 9, font, GREY);
  y -= 22;

  // ---------- Helpers de bloques ----------
  const par = (label: string, value: string) => {
    text(label, M, 9, font, GREY);
    text(value, M + 130, 10, bold);
    y -= 16;
  };
  const heading = (s: string) => { text(s, M, 11, bold); y -= 16; };
  const wrapText = (s: string, size = 9) => {
    const maxW = A4.w - 2 * M;
    const words = safe(s).split(/\s+/);
    let lineStr = "";
    for (const w of words) {
      const test = lineStr ? `${lineStr} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > maxW) {
        text(lineStr, M, size, font, INK); y -= size + 4; lineStr = w;
      } else lineStr = test;
    }
    if (lineStr) { text(lineStr, M, size, font, INK); y -= size + 4; }
  };

  const cli = datos.cliente;
  const veh = datos.vehiculo;
  const clienteNombre = cli?.nombre ?? "—";
  const vehTexto = veh ? `${veh.marca} ${veh.modelo} ${veh.anio ?? ""}`.trim() : "—";

  // ---------- Cuerpo por tipo ----------
  if (tipo === "recibo_sena" || tipo === "recibo_pago") {
    const concepto = tipo === "recibo_sena" ? "seña / reserva" : "pago";
    const monto = tipo === "recibo_sena" ? datos.sena : datos.precio_total;
    par("Recibí de", clienteNombre);
    if (cli?.dni_cuit) par("DNI / CUIT", cli.dni_cuit);
    if (cli?.localidad) par("Localidad", cli.localidad);
    par("Forma de pago", datos.forma_pago ? safe(datos.forma_pago) : "—");
    y -= 4;
    wrapText(`En concepto de ${concepto} por la unidad: ${vehTexto}${veh?.patente ? ` — Patente ${veh.patente}` : ""}.`);
    y -= 8;
    page.drawRectangle({ x: M, y: y - 28, width: A4.w - 2 * M, height: 38, color: rgb(0.96, 0.97, 0.98) });
    text("Monto recibido", M + 12, 10, font, GREY);
    right(ars(monto), A4.w - M - 12, 16, bold);
    y -= 30;
    if (tipo === "recibo_sena") {
      text("Saldo pendiente", M + 12, 9, font, GREY);
      right(ars(datos.saldo), A4.w - M - 12, 10, bold);
      y -= 22;
    } else y -= 8;
  } else if (tipo === "presupuesto") {
    heading("Cliente");
    par("Nombre", clienteNombre);
    if (cli?.dni_cuit) par("DNI / CUIT", cli.dni_cuit);
    if (cli?.telefono) par("Teléfono", cli.telefono);
    y -= 4;
    heading("Unidad");
    par("Vehículo", vehTexto);
    if (veh?.patente) par("Patente", veh.patente);
    if (veh?.kilometros != null) par("Kilómetros", new Intl.NumberFormat("es-AR").format(veh.kilometros));
    if (veh?.color) par("Color", veh.color);
    y -= 4;
    heading("Condiciones");
    par("Precio", ars(datos.precio_total));
    if (datos.bonificacion != null) par("Bonificación", ars(datos.bonificacion));
    if (datos.permuta) par("Permuta", datos.permuta);
    if (datos.anticipo != null) par("Anticipo", ars(datos.anticipo));
    if (datos.saldo != null) par("Saldo a financiar", ars(datos.saldo));
    if (datos.cantidad_cuotas != null && datos.cantidad_cuotas > 0)
      par("Cuotas", `${datos.cantidad_cuotas}${datos.valor_cuota != null ? ` x ${ars(datos.valor_cuota)}` : ""}`);
    if (datos.gastos != null) par("Gastos", ars(datos.gastos));
    if (datos.forma_pago) par("Forma de pago", datos.forma_pago);
    if (datos.financiacion) par("Financiación", datos.financiacion);
    par("Validez", datos.validez ? fechaAR(datos.validez) : "—");
  } else if (tipo === "boleto") {
    wrapText(
      `Entre ${empresa.nombre}${empresa.cuit ? ` (CUIT ${empresa.cuit})` : ""}, en adelante "EL VENDEDOR", ` +
      `y ${clienteNombre}${cli?.dni_cuit ? ` (DNI/CUIT ${cli.dni_cuit})` : ""}, en adelante "EL COMPRADOR", ` +
      `se celebra el presente boleto de compraventa sobre el vehículo que se detalla:`,
    );
    y -= 6;
    heading("Vehículo");
    par("Marca / Modelo", vehTexto);
    if (veh?.patente) par("Patente", veh.patente);
    if (veh?.motor) par("Motor", veh.motor);
    if (veh?.chasis) par("Chasis", veh.chasis);
    if (veh?.color) par("Color", veh.color);
    y -= 4;
    heading("Precio y pago");
    par("Precio total", ars(datos.precio_total));
    if (datos.sena != null) par("Seña entregada", ars(datos.sena));
    if (datos.saldo != null) par("Saldo", ars(datos.saldo));
    if (datos.forma_pago) par("Forma de pago", datos.forma_pago);
    y -= 6;
    wrapText(
      "EL COMPRADOR declara conocer el estado del vehículo. La transferencia de dominio se realizará ante " +
      "Registro Automotor, asumiendo cada parte los gastos que por ley le correspondan.",
    );
  } else if (tipo === "ficha_cliente") {
    heading("Datos del cliente");
    par("Nombre", clienteNombre);
    if (cli?.dni_cuit) par("DNI / CUIT", cli.dni_cuit);
    if (cli?.telefono) par("Teléfono", cli.telefono);
    if (cli?.email) par("Email", cli.email);
    if (cli?.localidad) par("Localidad", cli.localidad);
    if (cli?.origen) par("Origen", cli.origen);
    if (cli?.estado) par("Estado", cli.estado);
    if (cli?.vendedor) par("Vendedor", cli.vendedor);
    if (cli?.presupuesto != null) par("Presupuesto", ars(cli.presupuesto));
    if (veh) par("Auto de interés", vehTexto);
  } else if (tipo === "datero") {
    heading("Interesado");
    par("Nombre", clienteNombre);
    if (cli?.telefono) par("Teléfono", cli.telefono);
    if (cli?.email) par("Email", cli.email);
    if (cli?.localidad) par("Localidad", cli.localidad);
    y -= 4;
    heading("Interés");
    par("Vehículo", veh ? vehTexto : "—");
    if (cli?.presupuesto != null) par("Presupuesto", ars(cli.presupuesto));
    par("Permuta", datos.permuta ? safe(datos.permuta) : "—");
    par("Forma de pago", datos.forma_pago ? safe(datos.forma_pago) : "—");
  } else if (tipo === "ficha_vehiculo") {
    heading("Identificación");
    par("Marca / Modelo", vehTexto);
    if (veh?.version) par("Versión", veh.version);
    if (veh?.patente) par("Patente", veh.patente);
    if (veh?.color) par("Color", veh.color);
    y -= 4;
    heading("Mecánica");
    if (veh?.combustible) par("Combustible", veh.combustible);
    if (veh?.transmision) par("Transmisión", veh.transmision);
    if (veh?.kilometros != null) par("Kilómetros", new Intl.NumberFormat("es-AR").format(veh.kilometros));
    if (veh?.motor) par("Motor", veh.motor);
    if (veh?.chasis) par("Chasis", veh.chasis);
    y -= 4;
    heading("Comercial");
    par("Precio", ars(veh?.precio));
    if (veh?.estado) par("Estado", veh.estado);
    if (veh?.ubicacion) par("Ubicación", veh.ubicacion);
    if (veh?.fecha_ingreso) par("Ingreso", fechaAR(veh.fecha_ingreso));
  } else if (tipo === "autorizacion_test_drive" || tipo === "autorizacion_entrega" || tipo === "autorizacion_retiro_doc") {
    const persona = datos.autorizado ?? (cli ? { nombre: cli.nombre, dni: cli.dni_cuit, licencia: null } : null);
    const cuando = datos.fecha_evento ?? datos.fecha;
    const intro =
      tipo === "autorizacion_test_drive"
        ? `Por la presente se autoriza a ${persona?.nombre ?? "—"} a realizar una prueba de manejo del vehículo ${vehTexto}${veh?.patente ? ` (patente ${veh.patente})` : ""} el día ${fechaAR(cuando)}.`
        : tipo === "autorizacion_entrega"
        ? `Por la presente se autoriza la entrega del vehículo ${vehTexto}${veh?.patente ? ` (patente ${veh.patente})` : ""} a ${persona?.nombre ?? "—"}.`
        : `Por la presente se autoriza a ${persona?.nombre ?? "—"} a retirar la documentación del vehículo ${vehTexto}${veh?.patente ? ` (patente ${veh.patente})` : ""}.`;
    wrapText(intro);
    y -= 6;
    par("Autorizado", persona?.nombre ?? "—");
    if (persona?.dni) par("DNI", persona.dni);
    if (tipo === "autorizacion_test_drive" && persona?.licencia) par("Licencia", persona.licencia);
    if (veh) par("Vehículo", vehTexto);
    if (veh?.patente) par("Patente", veh.patente);
    par("Fecha", fechaAR(cuando));
    y -= 6;
    wrapText(
      tipo === "autorizacion_test_drive"
        ? "El conductor declara poseer licencia de conducir vigente y asume la responsabilidad civil y penal durante la prueba de manejo."
        : "La persona autorizada acredita identidad al momento del acto. La presente autorización se emite a pedido del titular.",
    );
  }

  if (datos.observaciones) {
    y -= 6;
    text("Observaciones:", M, 9, bold, GREY);
    y -= 14;
    wrapText(datos.observaciones);
  }

  // ---------- Firmas (solo en documentos que lo requieren) ----------
  const firmas: [string, string] | null =
    tipo === "recibo_sena" || tipo === "recibo_pago" || tipo === "boleto"
      ? ["Firma del vendedor", "Firma del comprador"]
      : tipo === "autorizacion_test_drive" || tipo === "autorizacion_entrega" || tipo === "autorizacion_retiro_doc"
        ? ["Por la agencia", "Firma del autorizado"]
        : null;
  if (firmas) {
    const yF = 120;
    page.drawLine({ start: { x: M, y: yF }, end: { x: M + 180, y: yF }, thickness: 1, color: RULE });
    page.drawLine({ start: { x: A4.w - M - 180, y: yF }, end: { x: A4.w - M, y: yF }, thickness: 1, color: RULE });
    page.drawText(safe(firmas[0]), { x: M + 30, y: yF - 14, size: 9, font, color: GREY });
    page.drawText(safe(firmas[1]), { x: A4.w - M - 150, y: yF - 14, size: 9, font, color: GREY });
  }

  return pdf.save();
}

export function tituloDocumento(tipo: TipoDocumento): string {
  return TITULOS[tipo];
}
